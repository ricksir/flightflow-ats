'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = path.resolve(__dirname, '..');
const HTML = path.join(ROOT, 'index.html');
const FUNCTION_NAME = 'airportSurfacePreset';
const EXPECTED_BYTES = 165;
const EXPECTED_LINES = 4;
const EXPECTED_SHA256 = '68426bf3e497d41d7dbc1df0b14e88c4837ab29039887bc931218d578fea5715';
const EXPECTED_CONSUMERS = 1;

const EXPECTED_PRESETS_SOURCE = `  const AIRPORT_SURFACE_PRESETS = Object.freeze({
    SBBR: { terminalBearing: 20, standDistanceM: 720, apronDistanceM: 560, thresholdDistanceM: 1420, rolloutDistanceM: 920, approachDistanceM: 5600, climbDistanceM: 3400 },
    SBGO: { terminalBearing: 210, standDistanceM: 620, apronDistanceM: 500, thresholdDistanceM: 1180, rolloutDistanceM: 820, approachDistanceM: 4300, climbDistanceM: 2800 }
  });`;

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

function loadResolver(normalizeLocalityCode, presets) {
  const source = extractNamedFunction(kernelSource(), FUNCTION_NAME);
  return Function(
    'normalizeLocalityCode',
    'AIRPORT_SURFACE_PRESETS',
    `${source}; return ${FUNCTION_NAME};`
  )(normalizeLocalityCode, presets);
}

test('airportSurfacePreset mantém identidade exata antes da extração', () => {
  const source = extractNamedFunction(kernelSource(), FUNCTION_NAME);
  assert.equal(Buffer.byteLength(source, 'utf8'), EXPECTED_BYTES);
  assert.equal(source.split(/\r?\n/).length, EXPECTED_LINES);
  assert.equal(crypto.createHash('sha256').update(source).digest('hex'), EXPECTED_SHA256);
});

test('airportSurfacePreset permanece puro e desacoplado de infraestrutura', () => {
  const source = extractNamedFunction(kernelSource(), FUNCTION_NAME);
  for (const token of [
    'state.', 'els.', 'document.', 'window.', 'localStorage', 'sessionStorage',
    'indexedDB', 'fetch(', 'goTo(', 'renderCurrent(', 'stopPlayback(', 'setTimeout(',
    'setInterval(', 'requestAnimationFrame(', 'navigator.', 'google.', 'L.', 'Parser',
    'realMapState', 'CustomEvent', 'dispatchEvent', 'addEventListener', 'querySelector',
    'getElementById'
  ]) assert.equal(source.includes(token), false, `acoplamento inesperado: ${token}`);
});

test('airportSurfacePreset mantém exatamente um consumidor no núcleo', () => {
  const kernel = kernelSource();
  const occurrences = [...kernel.matchAll(/\bairportSurfacePreset\s*\(/g)].length;
  assert.equal(occurrences - 1, EXPECTED_CONSUMERS);
  assert.ok(kernel.includes('const preset = airportSurfacePreset(airport);'));
});

test('AIRPORT_SURFACE_PRESETS preserva exatamente SBBR e SBGO', () => {
  const kernel = kernelSource();
  assert.equal(kernel.includes(EXPECTED_PRESETS_SOURCE), true);

  const start = kernel.indexOf(EXPECTED_PRESETS_SOURCE);
  assert.ok(start >= 0);
  assert.equal(kernel.indexOf('const AIRPORT_SURFACE_PRESETS', start + EXPECTED_PRESETS_SOURCE.length), -1);
});

test('airportSurfacePreset resolve o código normalizado sem alterar o preset', () => {
  const calls = [];
  const normalize = value => {
    calls.push(value);
    return String(value || '').trim().toUpperCase();
  };
  const presets = Object.freeze({
    SBBR: Object.freeze({ terminalBearing: 20, standDistanceM: 720 }),
    SBGO: Object.freeze({ terminalBearing: 210, standDistanceM: 620 }),
  });
  const fn = loadResolver(normalize, presets);

  assert.equal(fn({ code: ' sbbr ' }), presets.SBBR);
  assert.equal(fn({ code: 'sbgo' }), presets.SBGO);
  assert.deepEqual(calls, [' sbbr ', 'sbgo']);
});

test('airportSurfacePreset preserva fallback vazio para aeroporto ou código desconhecido', () => {
  const normalize = value => String(value || '').trim().toUpperCase();
  const fn = loadResolver(normalize, Object.freeze({ SBBR: Object.freeze({ terminalBearing: 20 }) }));

  const unknown = fn({ code: 'XXXX' });
  const missing = fn(null);

  assert.deepEqual(unknown, {});
  assert.deepEqual(missing, {});
  assert.notEqual(unknown, missing, 'fallback atual cria um novo objeto vazio a cada chamada');
});
