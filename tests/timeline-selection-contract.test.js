'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = path.resolve(__dirname, '..');
const HTML = path.join(ROOT, 'index.html');
const MODULE = path.join(ROOT, 'src', 'timeline', 'timeline-selection-controller.js');
const REFERENCE = '<script id="flightflow-timeline-selection-controller" src="src/timeline/timeline-selection-controller.js"></script>';
const MODULE_BYTES = 1387;
const MODULE_SHA256 = '3b1449594d70c1cf136c7568bcc3d3c0d7d961a64b883497d9a5411d54a84861';

function moduleSource() {
  return fs.readFileSync(MODULE, 'utf8');
}

function loadModule() {
  delete require.cache[require.resolve(MODULE)];
  return require(MODULE);
}

function harness({ index = 1, panelActive = false } = {}) {
  const Controller = loadModule();
  const state = { index };
  const calls = [];
  const items = [0, 1, 2].map(eventIndex => {
    const classes = new Set();
    return {
      dataset: { eventIndex: String(eventIndex) },
      classList: {
        toggle(name, force) { if (force) classes.add(name); else classes.delete(name); },
        contains(name) { return classes.has(name); },
      },
      scrollIntoView(options) { calls.push({ eventIndex: String(eventIndex), options }); },
    };
  });
  const timelineList = {
    querySelectorAll(selector) {
      assert.equal(selector, '.timeline-item');
      return items;
    },
    querySelector(selector) {
      assert.equal(selector, '.timeline-item.active');
      return items.find(item => item.classList.contains('active')) || null;
    },
  };
  const api = Controller.create({
    state,
    getTimelineList: () => timelineList,
    isTimelinePanelActive: () => panelActive,
  });
  return { Controller, state, items, calls, api };
}

function activeIndexes(items) {
  return items.filter(item => item.classList.contains('active')).map(item => Number(item.dataset.eventIndex));
}

function occurrences(text, needle) {
  return text.split(needle).length - 1;
}

test('módulo timeline-selection mantém identidade estrutural e API mínima', () => {
  const source = moduleSource();
  assert.equal(Buffer.byteLength(source, 'utf8'), MODULE_BYTES);
  assert.equal(crypto.createHash('sha256').update(source).digest('hex'), MODULE_SHA256);
  assert.ok(source.startsWith('(function (root, factory) {'));
  assert.ok(source.includes('root.FlightFlowTimelineSelectionController = api;'));
  assert.ok(source.includes('function updateTimelineSelection() {'));
  const Controller = loadModule();
  assert.equal(Object.isFrozen(Controller), true);
  assert.deepEqual(Object.keys(Controller), ['create']);
});

test('fábrica exige apenas state, lista da timeline e guarda de painel ativo', () => {
  const Controller = loadModule();
  assert.throws(() => Controller.create(), /requer state/);
  assert.throws(() => Controller.create({ state: {} }), /requer getTimelineList/);
  assert.throws(() => Controller.create({ state: {}, getTimelineList() {} }), /requer isTimelinePanelActive/);
});

test('instância é congelada e expõe somente updateTimelineSelection', () => {
  const h = harness();
  assert.equal(Object.isFrozen(h.api), true);
  assert.deepEqual(Object.keys(h.api), ['updateTimelineSelection']);
  assert.equal(typeof h.api.updateTimelineSelection, 'function');
});

test('seleção ativa acompanha exclusivamente state.index vivo', () => {
  const h = harness({ index: 1 });
  h.api.updateTimelineSelection();
  assert.deepEqual(activeIndexes(h.items), [1]);
  h.state.index = 2;
  h.api.updateTimelineSelection();
  assert.deepEqual(activeIndexes(h.items), [2]);
});

test('timeline oculta atualiza classe active sem executar scroll', () => {
  const h = harness({ index: 1, panelActive: false });
  h.api.updateTimelineSelection();
  assert.deepEqual(activeIndexes(h.items), [1]);
  assert.deepEqual(h.calls, []);
});

test('timeline visível rola somente o item ativo com nearest + smooth', () => {
  const h = harness({ index: 2, panelActive: true });
  h.api.updateTimelineSelection();
  assert.deepEqual(activeIndexes(h.items), [2]);
  assert.deepEqual(h.calls, [{ eventIndex: '2', options: { block: 'nearest', behavior: 'smooth' } }]);
});

test('módulo permanece desacoplado de DOM global, rota, mapa, aeronave, storage e parser', () => {
  const source = moduleSource();
  for (const token of [
    'document.', 'window.document', 'FlightFlowRouteProcessedV7412', 'transitionPlanForEvents', 'transitionDurations',
    'realMapState', 'google.', 'L.', 'aircraft', 'plane', 'localStorage', 'indexedDB', 'FlightParser', 'goTo(', 'renderCurrent('
  ]) assert.equal(source.includes(token), false, `acoplamento proibido: ${token}`);
});

test('index carrega controlador antes do núcleo e preserva os dois consumidores conhecidos', () => {
  const html = fs.readFileSync(HTML, 'utf8');
  assert.equal(occurrences(html, REFERENCE), 1, 'referência externa deve ser única');
  const referenceIndex = html.indexOf(REFERENCE);
  const anchorIndex = html.indexOf('window.__FlightFlowFirBridge = Object.freeze({');
  const mainScriptStart = html.lastIndexOf('<script', anchorIndex);
  assert.ok(referenceIndex >= 0 && referenceIndex < mainScriptStart, 'controlador deve carregar antes do IIFE principal');

  for (const token of [
    'const TimelineSelectionController = window.FlightFlowTimelineSelectionController;',
    "if (!TimelineSelectionController) throw new Error('FlightFlowTimelineSelectionController não foi carregado.');",
    'const { updateTimelineSelection } = TimelineSelectionController.create({',
    'state,',
    'getTimelineList: () => els.timelineList,',
    "isTimelinePanelActive: () => document.querySelector('[data-panel=\"timeline\"]').classList.contains('active'),",
    'renderCommunication(event);\n    updateTimelineSelection();\n    renderOriginalEvent(event);',
    "if (name === 'timeline') updateTimelineSelection();",
  ]) assert.ok(html.includes(token), `integração ausente: ${token}`);

  assert.doesNotMatch(html, /function\s+updateTimelineSelection\s*\(/, 'implementação inline deve ter sido removida');
  assert.equal(occurrences(html, 'updateTimelineSelection();'), 2, 'os dois consumidores existentes devem permanecer');
});
