'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = path.resolve(__dirname, '..');
const HTML = path.join(ROOT, 'index.html');
const EXPECTED_BYTES = 450;
const EXPECTED_LINES = 9;
const EXPECTED_SHA256 = '48f4d99c30819746c8b78e69904766a0d43a4e3babd67f7e2802fa1d97637f54';
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

test('airportGroundQuery mantém identidade exata antes da extração', () => {
  const source = functionSource(kernelSource(), 'airportGroundQuery');
  assert.equal(Buffer.byteLength(source, 'utf8'), EXPECTED_BYTES);
  assert.equal(source.split(/\r?\n/).length, EXPECTED_LINES);
  assert.equal(crypto.createHash('sha256').update(source).digest('hex'), EXPECTED_SHA256);
});

test('airportGroundQuery permanece folha e desacoplada de infraestrutura', () => {
  const source = functionSource(kernelSource(), 'airportGroundQuery');
  for (const token of [
    'state.', 'els.', 'document.', 'window.', 'localStorage', 'sessionStorage',
    'indexedDB', 'fetch(', 'goTo(', 'renderCurrent(', 'stopPlayback(', 'setTimeout(',
    'setInterval(', 'requestAnimationFrame(', 'navigator.', 'google.', 'L.', 'Parser',
    'realMapState', 'CustomEvent', 'dispatchEvent', 'addEventListener', 'querySelector',
    'getElementById'
  ]) assert.equal(source.includes(token), false, `acoplamento inesperado: ${token}`);
});

test('airportGroundQuery mantém exatamente um consumidor real', () => {
  const kernel = kernelSource();
  const consumers = [...kernel.matchAll(/(?<![\w$.])airportGroundQuery\s*\(/g)].length - 1;
  assert.equal(consumers, EXPECTED_CONSUMERS);
});

test('airportGroundQuery preserva raio, precisão e filtros Overpass atuais', () => {
  const source = functionSource(kernelSource(), 'airportGroundQuery');
  const fn = Function(`${source}; return airportGroundQuery;`)();
  const query = fn({ lat: -15.8692, lon: -47.9208 });
  assert.ok(query.startsWith('[out:json][timeout:28];('));
  assert.ok(query.includes('way(around:7000,-15.8692000,-47.9208000)["aeroway"~"^(runway|taxiway|taxilane|parking_position|apron|terminal)$"];'));
  assert.ok(query.includes('node(around:7000,-15.8692000,-47.9208000)["aeroway"~"^(holding_position|parking_position|gate|terminal)$"];'));
  assert.ok(query.endsWith(');out body geom;'));
});

test('airportGroundQuery preserva coerção numérica de coordenadas textuais', () => {
  const source = functionSource(kernelSource(), 'airportGroundQuery');
  const fn = Function(`${source}; return airportGroundQuery;`)();
  const query = fn({ lat: '1.5', lon: '2.25' });
  assert.ok(query.includes('around:7000,1.5000000,2.2500000'));
});
