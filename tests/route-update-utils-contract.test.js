'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');
const HTML = path.join(ROOT, 'index.html');
const MODULE = path.join(ROOT, 'src/route/route-update-utils.js');
const EXPECTED_MODULE_BYTES = 1164;
const EXPECTED_MODULE_SHA256 = 'eae7d84c9c7553c95a53c4042f1ebbbf738e8e4a52580f3574d550675300bd7e';
const EXPECTED_KEYS_BYTES = 120;
const EXPECTED_KEYS_SHA256 = 'cffa5c6145b62b630d7775d75120f9f33ebcf9f1deefbee0cbe7210eba968281';
const EXPECTED_MEANINGFUL_BYTES = 460;
const EXPECTED_MEANINGFUL_LINES = 9;
const EXPECTED_MEANINGFUL_SHA256 = '107a888c42632b1198ee29b8c47285e8533ce648c861217b20c73ebc20022fbe';
const EXPECTED_EVENT_BYTES = 456;
const EXPECTED_EVENT_LINES = 7;
const EXPECTED_EVENT_SHA256 = 'bf51357fa087053af5a77946db8ca958c435efa95d198a36986f018cea5baee3';

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
  const paren = container.indexOf('(', start);
  let i = paren, depth = 0, quote = null, escaped = false;
  while (i < container.length) {
    const c = container[i];
    if (quote) {
      if (escaped) escaped = false;
      else if (c === '\\') escaped = true;
      else if (c === quote) quote = null;
      i += 1; continue;
    }
    if (c === "'" || c === '"' || c === '`') { quote = c; i += 1; continue; }
    if (c === '(') depth += 1;
    else if (c === ')') { depth -= 1; if (depth === 0) break; }
    i += 1;
  }
  let brace = i + 1;
  while (/\s/.test(container[brace] || '')) brace += 1;
  assert.equal(container[brace], '{');
  depth = 0; quote = null; escaped = false;
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

function keysSource(source) {
  const key = "  const ROUTE_UPDATE_KEYS = new Set(['route','sid','star','adep','ades','runwayDeparture','runwayArrival','cfl','rfl']);";
  assert.equal(source.includes(key), true);
  return key;
}

function loadInternalCluster() {
  const source = fs.readFileSync(MODULE, 'utf8');
  const keys = keysSource(source);
  const meaningful = functionSource(source, 'isMeaningfulRouteChange');
  const event = functionSource(source, 'isRouteUpdateEvent');
  return Function(`${keys}\n${meaningful}\n${event}\nreturn { ROUTE_UPDATE_KEYS, isMeaningfulRouteChange, isRouteUpdateEvent };`)();
}

test('módulo route-update-utils mantém identidade estrutural congelada', () => {
  const source = fs.readFileSync(MODULE, 'utf8');
  assert.equal(Buffer.byteLength(source, 'utf8'), EXPECTED_MODULE_BYTES);
  assert.equal(crypto.createHash('sha256').update(source).digest('hex'), EXPECTED_MODULE_SHA256);
  assert.match(source, /^\(function \(\) \{\n\s*'use strict';/);
  assert.match(source, /window\.FlightFlowRouteUpdateUtils = Object\.freeze\(\{/);
  assert.match(source, /\}\)\(\);\n$/);
});

test('constante e duas funções preservam exatamente as identidades congeladas', () => {
  const source = fs.readFileSync(MODULE, 'utf8');
  const keys = keysSource(source);
  const meaningful = functionSource(source, 'isMeaningfulRouteChange');
  const event = functionSource(source, 'isRouteUpdateEvent');
  assert.equal(Buffer.byteLength(keys, 'utf8'), EXPECTED_KEYS_BYTES);
  assert.equal(crypto.createHash('sha256').update(keys).digest('hex'), EXPECTED_KEYS_SHA256);
  assert.equal(Buffer.byteLength(meaningful, 'utf8'), EXPECTED_MEANINGFUL_BYTES);
  assert.equal(meaningful.split(/\r?\n/).length, EXPECTED_MEANINGFUL_LINES);
  assert.equal(crypto.createHash('sha256').update(meaningful).digest('hex'), EXPECTED_MEANINGFUL_SHA256);
  assert.equal(Buffer.byteLength(event, 'utf8'), EXPECTED_EVENT_BYTES);
  assert.equal(event.split(/\r?\n/).length, EXPECTED_EVENT_LINES);
  assert.equal(crypto.createHash('sha256').update(event).digest('hex'), EXPECTED_EVENT_SHA256);
});

test('API pública é congelada e expõe somente isRouteUpdateEvent', () => {
  const source = fs.readFileSync(MODULE, 'utf8');
  const context = { window: {} };
  vm.runInNewContext(source, context);
  const api = context.window.FlightFlowRouteUpdateUtils;
  assert.ok(Object.isFrozen(api));
  assert.deepEqual(Array.from(Object.keys(api)), ['isRouteUpdateEvent']);
  assert.equal(typeof api.isRouteUpdateEvent, 'function');
});

test('index carrega módulo antes do IIFE e kernel usa alias explícito sem redeclarar cluster', () => {
  const html = fs.readFileSync(HTML, 'utf8');
  const tag = '<script id="flightflow-route-update-utils" src="src/route/route-update-utils.js"></script>';
  assert.equal(html.split(tag).length - 1, 1);
  assert.ok(html.indexOf(tag) < html.indexOf('(function () {'));
  const kernel = kernelSource();
  assert.ok(kernel.includes('const RouteUpdateUtils = window.FlightFlowRouteUpdateUtils;'));
  assert.ok(kernel.includes("if (!RouteUpdateUtils) throw new Error('FlightFlowRouteUpdateUtils não foi carregado.');"));
  assert.ok(kernel.includes('const { isRouteUpdateEvent } = RouteUpdateUtils;'));
  assert.equal(kernel.includes('ROUTE_UPDATE_KEYS'), false);
  assert.equal(kernel.includes('function isMeaningfulRouteChange('), false);
  assert.equal(kernel.includes('function isRouteUpdateEvent('), false);
  assert.equal([...kernel.matchAll(/(?<![\w$.])isRouteUpdateEvent\s*\(/g)].length, 1);
  assert.ok(kernel.includes('destinationChanged||isRouteUpdateEvent(e)'));
});

test('cluster permanece desacoplado de estado, DOM, rede, storage e mapa', () => {
  const source = fs.readFileSync(MODULE, 'utf8');
  for (const token of [
    'state.', 'els.', 'document.', 'localStorage', 'sessionStorage', 'indexedDB', 'fetch(',
    'goTo(', 'renderCurrent(', 'setTimeout(', 'setInterval(', 'requestAnimationFrame(',
    'navigator.', 'google.', 'L.', 'Parser', 'realMapState', 'CustomEvent', 'dispatchEvent',
    'addEventListener', 'querySelector', 'getElementById'
  ]) assert.equal(source.includes(token), false, `acoplamento inesperado: ${token}`);
});

test('ROUTE_UPDATE_KEYS preserva exatamente as nove chaves conhecidas', () => {
  const { ROUTE_UPDATE_KEYS } = loadInternalCluster();
  assert.deepEqual([...ROUTE_UPDATE_KEYS], ['route','sid','star','adep','ades','runwayDeparture','runwayArrival','cfl','rfl']);
});

test('isMeaningfulRouteChange preserva normalização e semântica atual', () => {
  const { isMeaningfulRouteChange } = loadInternalCluster();
  assert.equal(isMeaningfulRouteChange(null), false);
  assert.equal(isMeaningfulRouteChange({ key: 'unknown', before: 'A', after: 'B' }), false);
  assert.equal(isMeaningfulRouteChange({ key: 'route', before: ' UL304   NAXOP ', after: 'ul304 naxop' }), false);
  assert.equal(isMeaningfulRouteChange({ key: 'route', before: 'DCT', after: '   ' }), false);
  assert.equal(isMeaningfulRouteChange({ key: 'route', before: 'DCT', after: '—' }), false);
  assert.equal(isMeaningfulRouteChange({ key: 'route', before: 'DCT', after: 'n/a' }), false);
  assert.equal(isMeaningfulRouteChange({ key: 'route', before: '', after: 'DCT' }), false);
  assert.equal(isMeaningfulRouteChange({ key: 'route', before: 'DCT', after: 'UL304' }), true);
  assert.equal(isMeaningfulRouteChange({ key: 'cfl', before: 'F100', after: 'F120' }), true);
  assert.equal(isMeaningfulRouteChange({ key: 'sid', before: '', after: 'ANPU1A' }), true);
  assert.equal(isMeaningfulRouteChange({ key: 'star', before: '', after: 'KOGRA1A' }), true);
  assert.equal(isMeaningfulRouteChange({ key: 'runwayDeparture', before: '', after: '11R' }), true);
  assert.equal(isMeaningfulRouteChange({ key: 'runwayArrival', before: '', after: '29L' }), true);
});

test('isRouteUpdateEvent preserva contextos de mensagem e operação', () => {
  const { isRouteUpdateEvent } = loadInternalCluster();
  const routeChange = { key: 'route', before: 'DCT', after: 'UL304' };
  assert.equal(isRouteUpdateEvent({ messageType: 'FPL', changes: [routeChange] }), false);
  assert.equal(isRouteUpdateEvent({ messageType: 'CHG', changes: [] }), false);
  for (const messageType of ['CHG','crq','CRP','DLA','INFARC'])
    assert.equal(isRouteUpdateEvent({ messageType, changes: [routeChange] }), true, messageType);
  const sidChange = { key: 'sid', before: '', after: 'ANPU1A' };
  for (const operation of ['Modificação de plano','Atualização de rota','Recepção de Mensagem CHG','Recepção de Mensagem DLA','Envio de Mensagem CRP','Processamento INFARC'])
    assert.equal(isRouteUpdateEvent({ operation, changes: [sidChange] }), true, operation);
});
