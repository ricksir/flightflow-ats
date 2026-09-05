'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = path.resolve(__dirname, '..');
const HTML = path.join(ROOT, 'index.html');
const MODULE = path.join(ROOT, 'src', 'geo', 'coordinate-utils.js');
const EXPECTED_BYTES = 360;
const EXPECTED_LINES = 7;
const EXPECTED_SHA256 = '6e8196889acf6a28ce1606462f73c70e381db5ef84732ea32c36c3e572bff053';
const EXPECTED_CONSUMERS = 1;

function kernelSource() {
  const html = fs.readFileSync(HTML, 'utf8');
  const anchor = 'window.__FlightFlowFirBridge = Object.freeze({';
  const pos = html.indexOf(anchor);
  assert.ok(pos >= 0);
  const open = html.lastIndexOf('<script', pos);
  const bodyStart = html.indexOf('>', open) + 1;
  const close = html.indexOf('</script>', pos);
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
  for (let i = brace; i < container.length; i += 1) {
    const c = container[i];
    if (quote) {
      if (escaped) escaped = false;
      else if (c === '\\') escaped = true;
      else if (c === quote) quote = null;
      continue;
    }
    if (c === "'" || c === '"' || c === '`') { quote = c; continue; }
    if (c === '{') depth += 1;
    else if (c === '}') { depth -= 1; if (depth === 0) return container.slice(start, i + 1); }
  }
  throw new Error(`fim de ${name} não encontrado`);
}

test('runwayHeadingFromCode foi movida preservando exatamente a identidade congelada', () => {
  const source = functionSource(fs.readFileSync(MODULE, 'utf8'), 'runwayHeadingFromCode');
  assert.equal(Buffer.byteLength(source, 'utf8'), EXPECTED_BYTES);
  assert.equal(source.split(/\r?\n/).length, EXPECTED_LINES);
  assert.equal(crypto.createHash('sha256').update(source).digest('hex'), EXPECTED_SHA256);
});

test('runwayHeadingFromCode permanece pura e sem dependência de infraestrutura', () => {
  const source = functionSource(fs.readFileSync(MODULE, 'utf8'), 'runwayHeadingFromCode');
  for (const token of [
    'state.', 'els.', 'document.', 'window.', 'localStorage', 'sessionStorage',
    'indexedDB', 'fetch(', 'goTo(', 'renderCurrent(', 'stopPlayback(', 'setTimeout(',
    'setInterval(', 'requestAnimationFrame(', 'google.', 'L.', 'Parser', 'realMapState'
  ]) assert.equal(source.includes(token), false, `acoplamento inesperado: ${token}`);
});

test('IIFE usa runwayHeadingFromCode pelo CoordinateUtils preservando o único consumidor', () => {
  const kernel = kernelSource();
  assert.equal(kernel.includes('function runwayHeadingFromCode('), false);
  assert.ok(kernel.includes('const { normalizeCoordinateInput, validAerodromeCoordinate, formatGeoCoord, atsCoordinateLabel, groundCentroid, runwayTokens, runwayHeading, runwayHeadingFromCode, polygonGeoCentroid } = CoordinateUtils;'));
  const consumers = [...kernel.matchAll(/(?<![\w$.])runwayHeadingFromCode\s*\(/g)].length;
  assert.equal(consumers, EXPECTED_CONSUMERS);
});

test('runwayHeadingFromCode preserva semântica atual de cabeceiras e fallback', () => {
  const source = functionSource(fs.readFileSync(MODULE, 'utf8'), 'runwayHeadingFromCode');
  const fn = Function(`${source}; return runwayHeadingFromCode;`)();
  assert.equal(fn('09', 270), 90);
  assert.equal(fn('09L', 270), 90);
  assert.equal(fn('18C', 270), 180);
  assert.equal(fn('36R', 270), 0);
  assert.equal(fn('', 270), 270);
  assert.equal(fn('XX', 450), 90);
});
