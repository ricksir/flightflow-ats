'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = path.resolve(__dirname, '..');
const HTML = path.join(ROOT, 'index.html');
const FUNCTION_NAME = 'isLocationCode';
const EXPECTED_CONSUMERS = 4;
const EXPECTED_SOURCE = [
  '  function isLocationCode(code){',
  "    return /^[A-Z0-9]{4,16}$/.test(normalizeLocalityCode(code));",
  '  }',
].join('\n');
const EXPECTED_BYTES = 101;
const EXPECTED_SHA256 = '0d264e32e3464949d6fcd3b6db0daf0bd1d51567a158d92103ed73dff846608b';

function kernelSource() {
  const html = fs.readFileSync(HTML, 'utf8');
  const anchor = 'window.__FlightFlowFirBridge = Object.freeze({';
  const anchorIndex = html.indexOf(anchor);
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
  assert.ok(start >= 0, `${name} deve permanecer inline antes da extração`);
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
  assert.equal(source[brace], '{');

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

function loadFunction(normalizeLocalityCode) {
  const source = extractNamedFunction(kernelSource(), FUNCTION_NAME);
  return Function(
    'normalizeLocalityCode',
    `${source}\nreturn isLocationCode;`
  )(normalizeLocalityCode);
}

test('isLocationCode mantém identidade byte a byte antes da extração', () => {
  const source = extractNamedFunction(kernelSource(), FUNCTION_NAME);
  assert.equal(source, EXPECTED_SOURCE);
  assert.equal(Buffer.byteLength(source, 'utf8'), EXPECTED_BYTES);
  assert.equal(crypto.createHash('sha256').update(source, 'utf8').digest('hex'), EXPECTED_SHA256);
});

test('isLocationCode permanece puro e depende somente de normalizeLocalityCode', () => {
  const source = extractNamedFunction(kernelSource(), FUNCTION_NAME);
  for (const token of [
    'state.', 'els.', 'document.', 'window.', 'localStorage', 'sessionStorage',
    'indexedDB', 'fetch(', 'goTo(', 'renderCurrent(', 'stopPlayback(', 'setTimeout(',
    'setInterval(', 'requestAnimationFrame(', 'navigator.', 'google.', 'L.', 'Parser',
    'realMapState', 'CustomEvent', 'dispatchEvent', 'addEventListener', 'querySelector',
    'getElementById', 'currentEvent(', 'validAerodromeCoordinate('
  ]) assert.equal(source.includes(token), false, `acoplamento inesperado: ${token}`);
  assert.equal((source.match(/\bnormalizeLocalityCode\s*\(/g) || []).length, 1);
});

test('isLocationCode mantém exatamente quatro consumidores no núcleo', () => {
  const kernel = kernelSource();
  const declarations = [...kernel.matchAll(/\bfunction\s+isLocationCode\s*\(/g)].length;
  const references = [...kernel.matchAll(/\bisLocationCode\b/g)].length;
  assert.equal(declarations, 1);
  assert.equal(references - declarations, EXPECTED_CONSUMERS);
  assert.ok(kernel.includes('if(!isLocationCode(code)||!Number.isFinite(lat)||!Number.isFinite(lon))return;'));
  assert.ok(kernel.includes('if(!isLocationCode(normalized)){'));
  assert.ok(kernel.includes('(codes||[]).map(normalizeLocalityCode).filter(isLocationCode).forEach(code=>{'));
  assert.ok(kernel.includes("if(!isLocationCode(code)||!validAerodromeCoordinate(lat,lon))throw new Error('Localidade ou coordenadas inválidas');"));
});

test('isLocationCode consulta normalizeLocalityCode exatamente uma vez por chamada', () => {
  let calls = 0;
  const inputs = [];
  const fn = loadFunction(value => {
    calls += 1;
    inputs.push(value);
    return 'SBBR';
  });

  assert.equal(fn(' sbbr '), true);
  assert.equal(calls, 1);
  assert.deepEqual(inputs, [' sbbr ']);
});

test('isLocationCode aceita somente códigos normalizados alfanuméricos entre 4 e 16 caracteres', () => {
  const fn = loadFunction(value => String(value || ''));

  assert.equal(fn('SBBR'), true);
  assert.equal(fn('AB12'), true);
  assert.equal(fn('A1B2C3D4E5F6G7H8'), true);
  assert.equal(fn('ABC'), false);
  assert.equal(fn('A1B2C3D4E5F6G7H8I'), false);
  assert.equal(fn('SBBR-ZTZX'), false);
  assert.equal(fn('SBBR ZTZX'), false);
  assert.equal(fn(''), false);
});

test('isLocationCode decide sobre a saída normalizada, não sobre o valor bruto', () => {
  const normalized = new Map([
    [' lower ', 'SBBR'],
    ['pontuado', 'SBBSZQZX'],
    ['curto', 'ABC'],
    ['hifen', 'SBBR-ZTZX'],
  ]);
  const fn = loadFunction(value => normalized.get(value) || '');

  assert.equal(fn(' lower '), true);
  assert.equal(fn('pontuado'), true);
  assert.equal(fn('curto'), false);
  assert.equal(fn('hifen'), false);
});
