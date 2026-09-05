'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = path.resolve(__dirname, '..');
const HTML = path.join(ROOT, 'index.html');
const MODULE = path.join(ROOT, 'src', 'timeline', 'control-state-controller.js');
const REFERENCE = '<script id="flightflow-control-state-controller" src="src/timeline/control-state-controller.js"></script>';
const MODULE_BYTES = 1550;
const MODULE_SHA256 = '25d5b3bd525b0ee5af7e7a00b2a360f0036f8f334331e9723d3a487cac85e2e5';
const CONTROL_IDS = [
  'exportBtn', 'showProtocolBtn', 'exactMessageBtn', 'copySummaryBtn',
  'restartBtn', 'prevBtn', 'playBtn', 'nextBtn', 'scrubber', 'speedSelect',
  'soundBtn', 'fpvToggleBtn', 'stripToggleBtn',
];

function moduleSource() {
  return fs.readFileSync(MODULE, 'utf8');
}

function loadModule() {
  delete require.cache[require.resolve(MODULE)];
  return require(MODULE);
}

function makeElement() {
  return { disabled: false };
}

function harness({ index = 0, events = null } = {}) {
  const Controller = loadModule();
  const els = Object.fromEntries(CONTROL_IDS.map(id => [id, makeElement()]));
  els.scrubber.max = '999';
  els.endTimeLabel = { textContent: 'stale' };
  const state = {
    index,
    parsed: events === null ? null : { events },
  };
  const api = Controller.create({ state, getElements: () => els });
  return { Controller, els, state, api };
}

function occurrences(text, needle) {
  return text.split(needle).length - 1;
}

test('módulo de estado dos controles mantém identidade estrutural e API mínima', () => {
  const source = moduleSource();
  assert.equal(Buffer.byteLength(source, 'utf8'), MODULE_BYTES);
  assert.equal(crypto.createHash('sha256').update(source).digest('hex'), MODULE_SHA256);
  assert.ok(source.startsWith('(function (root, factory) {'));
  assert.ok(source.includes('root.FlightFlowControlStateController = api;'));
  assert.ok(source.includes('function enableControls(enabled) {'));
  const Controller = loadModule();
  assert.equal(Object.isFrozen(Controller), true);
  assert.deepEqual(Object.keys(Controller), ['create']);
});

test('fábrica exige somente state e resolução tardia dos elementos', () => {
  const Controller = loadModule();
  assert.throws(() => Controller.create(), /requer state/);
  assert.throws(() => Controller.create({ state: {} }), /requer getElements/);
});

test('instância é congelada e expõe somente enableControls', () => {
  const h = harness();
  assert.equal(Object.isFrozen(h.api), true);
  assert.deepEqual(Object.keys(h.api), ['enableControls']);
  assert.equal(typeof h.api.enableControls, 'function');
});

test('enableControls(false) desabilita todos os controles e limpa faixa temporal', () => {
  const h = harness({ index: 2, events: [{ time: '10:00:00' }, { time: '10:01:00' }, { time: '10:02:00' }] });
  h.api.enableControls(false);
  for (const id of CONTROL_IDS) assert.equal(h.els[id].disabled, true, `${id} deve ficar desabilitado`);
  assert.equal(h.els.scrubber.max, '0');
  assert.equal(h.els.endTimeLabel.textContent, '--:--:--');
});

test('enableControls(true) habilita controles e preserva limites no primeiro evento', () => {
  const h = harness({ index: 0, events: [{ time: '10:00:00' }, { time: '10:01:00' }, { time: '10:02:30' }] });
  h.api.enableControls(true);
  assert.equal(h.els.scrubber.max, '2');
  assert.equal(h.els.endTimeLabel.textContent, '10:02:30');
  assert.equal(h.els.prevBtn.disabled, true);
  assert.equal(h.els.nextBtn.disabled, false);
  for (const id of CONTROL_IDS.filter(id => id !== 'prevBtn')) {
    if (id !== 'nextBtn') assert.equal(h.els[id].disabled, false, `${id} deve ficar habilitado`);
  }
});

test('enableControls(true) preserva limites no último evento', () => {
  const h = harness({ index: 2, events: [{ time: '10:00:00' }, { time: '10:01:00' }, { time: '10:02:30' }] });
  h.api.enableControls(true);
  assert.equal(h.els.prevBtn.disabled, false);
  assert.equal(h.els.nextBtn.disabled, true);
});

test('enableControls(true) em evento intermediário mantém Anterior e Próximo habilitados', () => {
  const h = harness({ index: 1, events: [{ time: '10:00:00' }, { time: '10:01:00' }, { time: '10:02:30' }] });
  h.api.enableControls(true);
  assert.equal(h.els.prevBtn.disabled, false);
  assert.equal(h.els.nextBtn.disabled, false);
});

test('sem histórico carregado, faixa temporal permanece neutra sem inventar eventos', () => {
  const h = harness({ index: 0, events: null });
  h.api.enableControls(true);
  assert.equal(h.els.scrubber.max, '0');
  assert.equal(h.els.endTimeLabel.textContent, '--:--:--');
});

test('módulo permanece desacoplado de navegação, render, playback, mapa, parser e storage', () => {
  const source = moduleSource();
  for (const forbidden of [
    'goTo(', 'renderCurrent(', 'buildTimeline(', 'startPlayback(', 'stopPlayback(',
    'realMapState', 'google.', 'L.', 'FlightParser', 'localStorage', 'indexedDB',
  ]) assert.equal(source.includes(forbidden), false, `acoplamento inesperado: ${forbidden}`);
});

test('index carrega o controlador antes do núcleo e wiring delega enableControls ao módulo', () => {
  const html = fs.readFileSync(HTML, 'utf8');
  assert.equal(occurrences(html, REFERENCE), 1, 'referência externa deve ser única');
  const referenceIndex = html.indexOf(REFERENCE);
  const anchorIndex = html.indexOf('window.__FlightFlowFirBridge = Object.freeze({');
  const mainScriptStart = html.lastIndexOf('<script', anchorIndex);
  assert.ok(referenceIndex >= 0 && referenceIndex < mainScriptStart, 'controlador deve carregar antes do IIFE principal');

  for (const token of [
    'const ControlStateController = window.FlightFlowControlStateController;',
    "if (!ControlStateController) throw new Error('FlightFlowControlStateController não foi carregado.');",
    'const { enableControls } = ControlStateController.create({',
    'state,',
    'getElements: () => els,',
  ]) assert.ok(html.includes(token), `integração ausente: ${token}`);

  const anchor = 'window.__FlightFlowFirBridge = Object.freeze({';
  const open = html.lastIndexOf('<script', html.indexOf(anchor));
  const bodyStart = html.indexOf('>', open) + 1;
  const close = html.indexOf('</script>', html.indexOf(anchor));
  const kernel = html.slice(bodyStart, close);
  assert.equal(kernel.includes('function enableControls('), false, 'implementação inline deve ter sido removida');
});
