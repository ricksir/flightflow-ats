'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = path.resolve(__dirname, '..');
const HTML = path.join(ROOT, 'index.html');
const COORDINATE_MODULE = path.join(ROOT, 'src', 'geo', 'coordinate-utils.js');
const ANCHOR = 'window.__FlightFlowFirBridge = Object.freeze({';
const FUNCTION_NAME = 'groundMidpoint';
const EXPECTED_BYTES = 68;
const EXPECTED_SHA256 = '3217b203d44f25c7a6cee0184e0a51cba1d40f6279b1d8f9e4603365b867be4d';
const EXPECTED_CONSUMERS = 1;

function kernelSource() {
  const html = fs.readFileSync(HTML, 'utf8');
  const anchorIndex = html.indexOf(ANCHOR);
  assert.ok(anchorIndex >= 0, 'núcleo principal deve manter a ponte FIR usada como âncora');
  const scriptStart = html.lastIndexOf('<script', anchorIndex);
  const bodyStart = html.indexOf('>', scriptStart) + 1;
  const bodyEnd = html.indexOf('</script>', anchorIndex);
  assert.ok(scriptStart >= 0 && bodyStart > scriptStart && bodyEnd > bodyStart);
  return html.slice(bodyStart, bodyEnd);
}

function extractNamedFunction(source, name) {
  const marker = `  function ${name}(`;
  const start = source.indexOf(marker);
  assert.ok(start >= 0, `${name} deve existir no módulo após a extração`);
  const paren = source.indexOf('(', start);
  let i = paren;
  let depth = 0;
  let quote = null;
  let escaped = false;

  while (i < source.length) {
    const c = source[i];
    if (quote) {
      if (escaped) escaped = false;
      else if (c === '\\') escaped = true;
      else if (c === quote) quote = null;
      i += 1;
      continue;
    }
    if (c === "'" || c === '"' || c === '`') { quote = c; i += 1; continue; }
    if (c === '(') depth += 1;
    else if (c === ')') {
      depth -= 1;
      if (depth === 0) break;
    }
    i += 1;
  }

  let brace = i + 1;
  while (/\s/.test(source[brace] || '')) brace += 1;
  assert.equal(source[brace], '{', `${name}: abertura não encontrada`);

  depth = 0;
  quote = null;
  escaped = false;
  for (i = brace; i < source.length; i += 1) {
    const c = source[i];
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
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  throw new Error(`fim de ${name} não encontrado`);
}

test('groundMidpoint mantém identidade exata após a extração', () => {
  const source = extractNamedFunction(fs.readFileSync(COORDINATE_MODULE, 'utf8'), FUNCTION_NAME);
  assert.equal(Buffer.byteLength(source, 'utf8'), EXPECTED_BYTES);
  assert.equal(crypto.createHash('sha256').update(source).digest('hex'), EXPECTED_SHA256);
  assert.equal(source, '  function groundMidpoint(points) { return groundCentroid(points); }');
});

test('groundMidpoint permanece helper geográfico puro com uma única dependência', () => {
  const source = extractNamedFunction(fs.readFileSync(COORDINATE_MODULE, 'utf8'), FUNCTION_NAME);
  for (const token of [
    'state.', 'els.', 'document.', 'window.', 'localStorage', 'sessionStorage',
    'indexedDB', 'fetch(', 'goTo(', 'renderCurrent(', 'stopPlayback(', 'setTimeout(',
    'setInterval(', 'requestAnimationFrame(', 'navigator.', 'google.', 'L.', 'Parser',
    'realMapState', 'CustomEvent', 'dispatchEvent', 'addEventListener', 'querySelector',
    'getElementById'
  ]) assert.equal(source.includes(token), false, `acoplamento inesperado: ${token}`);

  const calls = [...source.matchAll(/(?<![\w$.])([A-Za-z_$][\w$]*)\s*\(/g)]
    .map(match => match[1])
    .filter(name => !['groundMidpoint', 'function'].includes(name));
  assert.deepEqual([...new Set(calls)], ['groundCentroid']);
});

test('groundMidpoint mantém exatamente um consumidor no núcleo', () => {
  const kernel = kernelSource();
  const occurrences = [...kernel.matchAll(/\bgroundMidpoint\s*\(/g)].length;
  assert.equal(occurrences, EXPECTED_CONSUMERS);
  assert.ok(kernel.includes('...groundMidpoint(w.points)'));
});

test('groundMidpoint delega ao groundCentroid sem alterar argumentos nem retorno', () => {
  const source = extractNamedFunction(fs.readFileSync(COORDINATE_MODULE, 'utf8'), FUNCTION_NAME);
  const calls = [];
  const expected = { lat: -15.9, lon: -47.9 };
  const groundCentroid = points => {
    calls.push(points);
    return expected;
  };
  const groundMidpoint = Function('groundCentroid', `${source}; return groundMidpoint;`)(groundCentroid);
  const points = [{ lat: 1, lon: 2 }, { lat: 3, lon: 4 }];

  assert.equal(groundMidpoint(points), expected);
  assert.deepEqual(calls, [points]);
});

test('groundMidpoint pertence ao CoordinateUtils e não permanece inline', () => {
  const kernel = kernelSource();
  const module = fs.readFileSync(COORDINATE_MODULE, 'utf8');

  assert.ok(kernel.includes('const CoordinateUtils = window.FlightFlowCoordinateUtils;'));
  assert.ok(kernel.includes('groundCentroid, groundMidpoint'));
  assert.equal(kernel.includes('function groundMidpoint('), false);
  assert.ok(module.includes('function groundCentroid('));
  assert.ok(module.includes('    groundCentroid,'));
  assert.ok(module.includes('function groundMidpoint('));
  assert.ok(module.includes('    groundMidpoint,'));
});
