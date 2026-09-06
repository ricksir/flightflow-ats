'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');
const HTML = path.join(ROOT, 'index.html');
const MODULE = path.join(ROOT, 'src', 'map', 'aircraft-visual-utils.js');
const ANCHOR = 'window.__FlightFlowFirBridge = Object.freeze({';
const EXPECTED_MODULE_BYTES = 1265;
const EXPECTED_MODULE_SHA256 = '2614f28d576fadc7773a698f3543f4bf51b2b53c0e617c093c95c7ee1360f275';
const EXPECTED = Object.freeze({
  aircraftPixelSizeForZoom: {
    bytes: 156,
    sha256: '20aa9c98a5d48b25893a8741eaefa60ec0f920d348bd188a7cbe294abdb647a7',
  },
  planeIconHtml: {
    bytes: 693,
    sha256: '9e7709914d527334d2c91c38c1204e6c54e563cfa90f5053c2f852f46a2f53bf',
  },
});

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

function functionSource(container, name) {
  const marker = `  function ${name}(`;
  const start = container.indexOf(marker);
  assert.ok(start >= 0, `${name} deve existir no módulo`);
  let i = container.indexOf('(', start);
  let depth = 0;
  let quote = null;
  let escaped = false;
  for (; i < container.length; i += 1) {
    const ch = container[i];
    if (quote) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === quote) quote = null;
      continue;
    }
    if (ch === "'" || ch === '"' || ch === '`') { quote = ch; continue; }
    if (ch === '(') depth += 1;
    else if (ch === ')') {
      depth -= 1;
      if (depth === 0) break;
    }
  }
  let brace = i + 1;
  while (/\s/.test(container[brace])) brace += 1;
  assert.equal(container[brace], '{', `${name} deve possuir corpo`);
  depth = 0;
  quote = null;
  escaped = false;
  for (i = brace; i < container.length; i += 1) {
    const ch = container[i];
    if (quote) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === quote) quote = null;
      continue;
    }
    if (ch === "'" || ch === '"' || ch === '`') { quote = ch; continue; }
    if (ch === '{') depth += 1;
    else if (ch === '}') {
      depth -= 1;
      if (depth === 0) return container.slice(start, i + 1);
    }
  }
  assert.fail(`fim de ${name} não encontrado`);
}

function sha256(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

function loadApi() {
  const source = fs.readFileSync(MODULE, 'utf8');
  const context = { window: {} };
  vm.runInNewContext(source, context, { filename: MODULE });
  const factory = context.window.FlightFlowAircraftVisualUtils;
  const clamp = (value, min, max) => Math.max(Number(min), Math.min(Number(max), Number(value)));
  const escapeHtml = value => `ESC(${String(value)})`;
  const api = factory.create({ clamp, escapeHtml });
  return { factory, api };
}

test('módulo visual da aeronave mantém identidade estrutural congelada', () => {
  const source = fs.readFileSync(MODULE, 'utf8');
  assert.equal(Buffer.byteLength(source, 'utf8'), EXPECTED_MODULE_BYTES);
  assert.equal(sha256(source), EXPECTED_MODULE_SHA256);
  assert.match(source, /^\(function \(\) \{\n\s*'use strict';/);
  assert.match(source, /window\.FlightFlowAircraftVisualUtils = Object\.freeze\(\{ create \}\);/);
  assert.match(source, /\}\)\(\);\n$/);
});

test('dois helpers preservam exatamente as identidades congeladas', () => {
  const source = fs.readFileSync(MODULE, 'utf8');
  for (const [name, expected] of Object.entries(EXPECTED)) {
    const body = functionSource(source, name);
    assert.equal(Buffer.byteLength(body, 'utf8'), expected.bytes, `${name}: bytes`);
    assert.equal(sha256(body), expected.sha256, `${name}: SHA-256`);
  }
});

test('fábrica pública é congelada, exige dependências e expõe somente os dois helpers', () => {
  const source = fs.readFileSync(MODULE, 'utf8');
  const context = { window: {} };
  vm.runInNewContext(source, context, { filename: MODULE });
  const factory = context.window.FlightFlowAircraftVisualUtils;
  assert.ok(Object.isFrozen(factory));
  assert.deepEqual(Array.from(Object.keys(factory)), ['create']);
  assert.throws(() => factory.create({ clamp: null, escapeHtml: () => '' }), /clamp deve ser função/);
  assert.throws(() => factory.create({ clamp: () => 0, escapeHtml: null }), /escapeHtml deve ser função/);
  const { api } = loadApi();
  assert.ok(Object.isFrozen(api));
  assert.deepEqual(Array.from(Object.keys(api)), ['aircraftPixelSizeForZoom', 'planeIconHtml']);
});

test('aircraftPixelSizeForZoom preserva fallback, escala, arredondamento e limites', () => {
  const { api } = loadApi();
  assert.equal(api.aircraftPixelSizeForZoom(undefined), 18);
  assert.equal(api.aircraftPixelSizeForZoom(null), 12);
  assert.equal(api.aircraftPixelSizeForZoom(5), 12);
  assert.equal(api.aircraftPixelSizeForZoom('10'), 21);
  assert.equal(api.aircraftPixelSizeForZoom(18), 36);
  assert.equal(api.aircraftPixelSizeForZoom(100), 36);
  assert.equal(api.aircraftPixelSizeForZoom(-10), 12);
  assert.equal(api.aircraftPixelSizeForZoom('abc'), 18);
});

test('planeIconHtml preserva tamanho, rotação, modo compacto e escaping por dependência', () => {
  const { api } = loadApi();
  const regular = api.planeIconHtml(45, 'GLO<1>', 30);
  assert.match(regular, /ff-aircraft-icon /);
  assert.doesNotMatch(regular, /ff-aircraft-icon compact/);
  assert.match(regular, /--ff-aircraft-size:30px;transform:rotate\(45\.0deg\)/);
  assert.match(regular, /ff-aircraft-label" style="transform:rotate\(-45deg\)"/);
  assert.ok(regular.includes('ESC(GLO<1>)'));
  const compact = api.planeIconHtml(0, 'TAM3720', 18);
  assert.match(compact, /ff-aircraft-icon compact/);
  assert.match(compact, /--ff-aircraft-size:18px;transform:rotate\(0\.0deg\)/);
  const fallback = api.planeIconHtml(undefined, 'PSFBU');
  assert.match(fallback, /--ff-aircraft-size:30px;transform:rotate\(0\.0deg\)/);
});

test('index carrega o módulo antes do IIFE e kernel usa alias explícito sem redeclarar helpers', () => {
  const html = fs.readFileSync(HTML, 'utf8');
  const tag = '<script id="flightflow-aircraft-visual-utils" src="src/map/aircraft-visual-utils.js"></script>';
  assert.equal(html.split(tag).length - 1, 1);
  assert.ok(html.indexOf(tag) < html.indexOf('(function () {'));
  const kernel = kernelSource();
  assert.ok(kernel.includes('const AircraftVisualUtils = window.FlightFlowAircraftVisualUtils;'));
  assert.ok(kernel.includes("if (!AircraftVisualUtils) throw new Error('FlightFlowAircraftVisualUtils não foi carregado.');"));
  assert.ok(kernel.includes('const { aircraftPixelSizeForZoom, planeIconHtml } = AircraftVisualUtils.create({ clamp, escapeHtml });'));
  assert.equal(kernel.includes('function aircraftPixelSizeForZoom('), false);
  assert.equal(kernel.includes('function planeIconHtml('), false);
  assert.equal([...kernel.matchAll(/(?<![\w$.])aircraftPixelSizeForZoom\s*\(/g)].length, 0);
  assert.equal([...kernel.matchAll(/(?<![\w$.])planeIconHtml\s*\(/g)].length, 0);
  assert.ok(kernel.includes('const AircraftMarkerController = window.FlightFlowAircraftMarkerController;'));
  assert.ok(kernel.includes('const { updateLeafletAircraftMarker, googlePlaneSymbol, updateGoogleAircraftMarker } = AircraftMarkerController.create({'));
  assert.ok(kernel.includes('    aircraftPixelSizeForZoom,\n    planeIconHtml,\n    clamp,\n    addGoogleOverlay,'));
});

test('fronteira visual permanece sem estado, DOM, storage, rota ou movimento', () => {
  const source = fs.readFileSync(MODULE, 'utf8');
  const combined = [functionSource(source, 'aircraftPixelSizeForZoom'), functionSource(source, 'planeIconHtml')].join('\n');
  for (const token of [
    'state.', 'els.', 'document.', 'window.', 'localStorage', 'sessionStorage', 'indexedDB',
    'FlightParser', 'FlightFlowRouteProcessedV7412', 'goTo(', 'renderCurrent(', 'realMapState', 'motion.'
  ]) assert.equal(combined.includes(token), false, `acoplamento proibido: ${token}`);
  assert.ok(functionSource(source, 'aircraftPixelSizeForZoom').includes('clamp('));
  assert.ok(functionSource(source, 'planeIconHtml').includes('escapeHtml(callsign)'));
});
