'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = path.resolve(__dirname, '..');
const HTML = path.join(ROOT, 'index.html');
const MODULE = path.join(ROOT, 'src', 'geo', 'airport-surface-utils.js');
const REFERENCE = '<script id="flightflow-airport-surface-utils" src="src/geo/airport-surface-utils.js"></script>';
const MODULE_BYTES = 1071;
const MODULE_SHA256 = '55bf9697f1fc9ced0b5b4ce1c3388035683190fef62c9ee3c16068b6fce2450d';
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

function loadModule() {
  const source = fs.readFileSync(MODULE, 'utf8');
  const fakeWindow = {};
  return Function('window', `${source}\nreturn window.FlightFlowAirportSurfaceUtils;`)(fakeWindow);
}

test('airportSurfacePreset mantém identidade exata após a extração', () => {
  const source = extractNamedFunction(fs.readFileSync(MODULE, 'utf8'), FUNCTION_NAME);
  assert.equal(Buffer.byteLength(source, 'utf8'), EXPECTED_BYTES);
  assert.equal(source.split(/\r?\n/).length, EXPECTED_LINES);
  assert.equal(crypto.createHash('sha256').update(source).digest('hex'), EXPECTED_SHA256);
});

test('airportSurfacePreset permanece puro e desacoplado de infraestrutura', () => {
  const source = extractNamedFunction(fs.readFileSync(MODULE, 'utf8'), FUNCTION_NAME);
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
  assert.equal(occurrences, EXPECTED_CONSUMERS);
  assert.ok(kernel.includes('const preset = airportSurfacePreset(airport);'));
  assert.equal(kernel.includes('function airportSurfacePreset('), false);
  assert.equal(kernel.includes('const AIRPORT_SURFACE_PRESETS = Object.freeze({'), false);
});

test('airport-surface-utils carrega antes do núcleo e expõe API congelada', () => {
  const html = fs.readFileSync(HTML, 'utf8');
  const source = fs.readFileSync(MODULE, 'utf8');

  assert.equal(Buffer.byteLength(source, 'utf8'), MODULE_BYTES);
  assert.equal(crypto.createHash('sha256').update(source).digest('hex'), MODULE_SHA256);
  assert.equal(html.split(REFERENCE).length - 1, 1);

  const referenceIndex = html.indexOf(REFERENCE);
  const anchorIndex = html.indexOf('window.__FlightFlowFirBridge = Object.freeze({');
  const mainScriptStart = html.lastIndexOf('<script', anchorIndex);
  assert.ok(referenceIndex >= 0 && referenceIndex < mainScriptStart);

  const api = loadModule();
  assert.equal(Object.isFrozen(api), true);
  assert.equal(Object.isFrozen(api.presets), true);
  assert.equal(typeof api.create, 'function');

  const kernel = kernelSource();
  assert.ok(kernel.includes('const AirportSurfaceUtils = window.FlightFlowAirportSurfaceUtils;'));
  assert.ok(kernel.includes("if (!AirportSurfaceUtils) throw new Error('FlightFlowAirportSurfaceUtils não foi carregado.');"));
  assert.ok(kernel.includes('const { airportSurfacePreset } = AirportSurfaceUtils.create({ normalizeLocalityCode });'));
});

test('AIRPORT_SURFACE_PRESETS preserva exatamente SBBR e SBGO no módulo', () => {
  const source = fs.readFileSync(MODULE, 'utf8');
  assert.equal(source.includes(EXPECTED_PRESETS_SOURCE), true);

  const api = loadModule();
  assert.deepEqual(api.presets.SBBR, {
    terminalBearing: 20,
    standDistanceM: 720,
    apronDistanceM: 560,
    thresholdDistanceM: 1420,
    rolloutDistanceM: 920,
    approachDistanceM: 5600,
    climbDistanceM: 3400,
  });
  assert.deepEqual(api.presets.SBGO, {
    terminalBearing: 210,
    standDistanceM: 620,
    apronDistanceM: 500,
    thresholdDistanceM: 1180,
    rolloutDistanceM: 820,
    approachDistanceM: 4300,
    climbDistanceM: 2800,
  });
});

test('airportSurfacePreset resolve o código normalizado sem alterar o preset', () => {
  const calls = [];
  const normalizeLocalityCode = value => {
    calls.push(value);
    return String(value || '').trim().toUpperCase();
  };
  const api = loadModule();
  const { airportSurfacePreset } = api.create({ normalizeLocalityCode });

  assert.equal(airportSurfacePreset({ code: ' sbbr ' }), api.presets.SBBR);
  assert.equal(airportSurfacePreset({ code: 'sbgo' }), api.presets.SBGO);
  assert.deepEqual(calls, [' sbbr ', 'sbgo']);
});

test('airportSurfacePreset preserva fallback vazio e exige normalizador', () => {
  const api = loadModule();
  assert.throws(
    () => api.create({}),
    /FlightFlowAirportSurfaceUtils requer normalizeLocalityCode/
  );

  const normalizeLocalityCode = value => String(value || '').trim().toUpperCase();
  const { airportSurfacePreset } = api.create({ normalizeLocalityCode });
  const unknown = airportSurfacePreset({ code: 'XXXX' });
  const missing = airportSurfacePreset(null);

  assert.deepEqual(unknown, {});
  assert.deepEqual(missing, {});
  assert.notEqual(unknown, missing, 'fallback atual cria um novo objeto vazio a cada chamada');
});
