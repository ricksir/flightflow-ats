'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = path.resolve(__dirname, '..');
const HTML = path.join(ROOT, 'index.html');
const MODULE = path.join(ROOT, 'src', 'geo', 'coordinate-utils.js');
const EXPECTED_BYTES = 279;
const EXPECTED_LINES = 5;
const EXPECTED_SHA256 = '6b44bab8c967d72ca473e966bd782704177f9d595589451a4c42eab4dbe15559';
const EXPECTED_CONSUMERS = 1;
const CONTROL_WORDS = new Set(['if','for','while','switch','catch','function','with','typeof','return','new','delete','void','await','yield','class','super']);

function kernelSource() {
  const html = fs.readFileSync(HTML, 'utf8');
  const anchor = 'window.__FlightFlowFirBridge = Object.freeze({';
  const index = html.indexOf(anchor);
  assert.ok(index >= 0);
  const open = html.lastIndexOf('<script', index);
  const bodyStart = html.indexOf('>', open) + 1;
  const close = html.indexOf('</script>', index);
  return html.slice(bodyStart, close);
}

function functionSource(container, name) {
  const marker = `  function ${name}(`;
  const start = container.indexOf(marker);
  assert.ok(start >= 0, `${name} deve existir no módulo`);
  const brace = container.indexOf('{', start);
  let depth = 0;
  let quote = null;
  let escaped = false;
  for (let index = brace; index < container.length; index += 1) {
    const char = container[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === quote) quote = null;
      continue;
    }
    if (char === "'" || char === '"' || char === '`') { quote = char; continue; }
    if (char === '{') depth += 1;
    else if (char === '}') {
      depth -= 1;
      if (depth === 0) return container.slice(start, index + 1);
    }
  }
  throw new Error(`fim de ${name} não encontrado`);
}

function bareCalls(source, ownName) {
  return [...new Set([...source.matchAll(/(?<![\w$.])([A-Za-z_$][\w$]*)\s*\(/g)]
    .map(match => match[1])
    .filter(name => name !== ownName && !CONTROL_WORDS.has(name)))].sort();
}

test('groundCentroid foi movida preservando exatamente a identidade congelada', () => {
  const source = functionSource(fs.readFileSync(MODULE, 'utf8'), 'groundCentroid');
  assert.equal(Buffer.byteLength(source, 'utf8'), EXPECTED_BYTES);
  assert.equal(source.split(/\r?\n/).length, EXPECTED_LINES);
  assert.equal(crypto.createHash('sha256').update(source).digest('hex'), EXPECTED_SHA256);
});

test('groundCentroid permanece função geográfica pura e folha', () => {
  const source = functionSource(fs.readFileSync(MODULE, 'utf8'), 'groundCentroid');
  for (const forbidden of ['state.', 'els.', 'document.', 'window.', 'localStorage', 'indexedDB', 'goTo(', 'renderCurrent(', 'stopPlayback(']) {
    assert.equal(source.includes(forbidden), false, `acoplamento inesperado: ${forbidden}`);
  }
  assert.deepEqual(bareCalls(source, 'groundCentroid'), []);
});

test('IIFE usa groundCentroid pelo coordinate-utils após extrair groundMidpoint', () => {
  const kernel = kernelSource();
  assert.equal(kernel.includes('function groundCentroid('), false);
  assert.ok(kernel.includes('{ normalizeCoordinateInput, validAerodromeCoordinate, formatGeoCoord, atsCoordinateLabel, groundCentroid, groundMidpoint, runwayTokens, runwayHeading, runwayHeadingFromCode, polygonGeoCentroid, geoOffset } = CoordinateUtils;'));
  const consumers = [...kernel.matchAll(/(?<![\w$.])groundCentroid\s*\(/g)].length;
  assert.equal(consumers, EXPECTED_CONSUMERS);
  assert.equal(kernel.includes('function groundMidpoint('), false, 'groundMidpoint não deve permanecer inline');
  const module = fs.readFileSync(MODULE, 'utf8');
  assert.ok(module.includes('    groundCentroid,'));
  assert.ok(module.includes('  function groundMidpoint(points) { return groundCentroid(points); }'));
  assert.ok(module.includes('    groundMidpoint,'));
});
