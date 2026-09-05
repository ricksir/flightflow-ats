'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = path.resolve(__dirname, '..');
const HTML = path.join(ROOT, 'index.html');
const EXPECTED_BYTES = 662;
const EXPECTED_LINES = 12;
const EXPECTED_SHA256 = '760638ed416440af6ef5dec963fbfa044edb0d54a65b4807fceae796f7b33432';
const EXPECTED_CONSUMERS = 1;

function kernelSource() {
  const html = fs.readFileSync(HTML, 'utf8');
  const anchor = 'window.__FlightFlowFirBridge = Object.freeze({';
  const pos = html.indexOf(anchor);
  assert.ok(pos >= 0, 'ponte FIR deve continuar dentro do IIFE principal');
  const open = html.lastIndexOf('<script', pos);
  const bodyStart = html.indexOf('>', open) + 1;
  const close = html.indexOf('</script>', pos);
  assert.ok(open >= 0 && bodyStart > open && close > bodyStart);
  return html.slice(bodyStart, close);
}

function functionSource(container, name) {
  const marker = `  function ${name}(`;
  const start = container.indexOf(marker);
  assert.ok(start >= 0, `${name} deve permanecer inline antes da extração`);
  const paren = container.indexOf('(', start);
  let i = paren;
  let depth = 0;
  let quote = null;
  let escaped = false;
  while (i < container.length) {
    const c = container[i];
    if (quote) {
      if (escaped) escaped = false;
      else if (c === '\\') escaped = true;
      else if (c === quote) quote = null;
      i += 1;
      continue;
    }
    if (c === "'" || c === '"' || c === '`') { quote = c; i += 1; continue; }
    if (c === '(') depth += 1;
    else if (c === ')') { depth -= 1; if (depth === 0) break; }
    i += 1;
  }
  let brace = i + 1;
  while (/\s/.test(container[brace] || '')) brace += 1;
  assert.equal(container[brace], '{');
  depth = 0;
  quote = null;
  escaped = false;
  for (i = brace; i < container.length; i += 1) {
    const c = container[i];
    if (quote) {
      if (escaped) escaped = false;
      else if (c === '\\') escaped = true;
      else if (c === quote) quote = null;
      continue;
    }
    if (c === "'" || c === '"' || c === '`') { quote = c; continue; }
    if (c === '{') depth += 1;
    else if (c === '}') {
      depth -= 1;
      if (depth === 0) return container.slice(start, i + 1);
    }
  }
  throw new Error(`fim de ${name} não encontrado`);
}

function closeTo(actual, expected, tolerance = 1e-9) {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} deve estar próximo de ${expected}`);
}

test('geoOffset mantém identidade exata antes da extração', () => {
  const source = functionSource(kernelSource(), 'geoOffset');
  assert.equal(Buffer.byteLength(source, 'utf8'), EXPECTED_BYTES);
  assert.equal(source.split(/\r?\n/).length, EXPECTED_LINES);
  assert.equal(crypto.createHash('sha256').update(source).digest('hex'), EXPECTED_SHA256);
});

test('geoOffset permanece folha matemática e desacoplada de infraestrutura', () => {
  const source = functionSource(kernelSource(), 'geoOffset');
  for (const token of [
    'state.', 'els.', 'document.', 'window.', 'localStorage', 'sessionStorage',
    'indexedDB', 'fetch(', 'goTo(', 'renderCurrent(', 'stopPlayback(', 'setTimeout(',
    'setInterval(', 'requestAnimationFrame(', 'navigator.', 'google.', 'L.', 'Parser',
    'realMapState', 'CustomEvent', 'dispatchEvent', 'addEventListener', 'querySelector',
    'getElementById'
  ]) assert.equal(source.includes(token), false, `acoplamento inesperado: ${token}`);
});

test('geoOffset mantém exatamente um consumidor real', () => {
  const kernel = kernelSource();
  const consumers = [...kernel.matchAll(/(?<![\w$.])geoOffset\s*\(/g)].length - 1;
  assert.equal(consumers, EXPECTED_CONSUMERS);
});

test('geoOffset preserva deslocamento geodésico norte e leste no equador', () => {
  const source = functionSource(kernelSource(), 'geoOffset');
  const fn = Function(`${source}; return geoOffset;`)();
  const north = fn(0, 0, 1000, 0);
  closeTo(north.lat, 0.008993216059187304, 1e-12);
  closeTo(north.lon, 0, 1e-12);
  const east = fn(0, 0, 1000, 90);
  closeTo(east.lat, 0, 1e-12);
  closeTo(east.lon, 0.008993216059187304, 1e-12);
});

test('geoOffset preserva coerção numérica, defaults e distância zero', () => {
  const source = functionSource(kernelSource(), 'geoOffset');
  const fn = Function(`${source}; return geoOffset;`)();
  const zero = fn('-15.8692', '-47.9208', 0, 270);
  closeTo(zero.lat, -15.8692, 1e-12);
  closeTo(zero.lon, -47.9208, 1e-12);
  const defaultBearing = fn(0, 0, '1000');
  closeTo(defaultBearing.lat, 0.008993216059187304, 1e-12);
  closeTo(defaultBearing.lon, 0, 1e-12);
});
