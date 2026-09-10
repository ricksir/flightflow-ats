'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const HTML = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const MODULE_PATH = path.join(ROOT, 'src', 'core', 'current-event-selector.js');
const SOURCE = fs.readFileSync(MODULE_PATH, 'utf8');

function loadSelector() {
  delete require.cache[require.resolve(MODULE_PATH)];
  return require(MODULE_PATH);
}

test('módulo publica fábrica mínima e congelada', () => {
  const Selector = loadSelector();
  assert.equal(Object.isFrozen(Selector), true);
  assert.deepEqual(Object.keys(Selector), ['create']);

  const api = Selector.create({ state: { parsed: null, index: 0 } });
  assert.equal(Object.isFrozen(api), true);
  assert.deepEqual(Object.keys(api), ['currentEvent']);
  assert.equal(typeof api.currentEvent, 'function');
});

test('fábrica exige somente state', () => {
  const Selector = loadSelector();
  assert.throws(() => Selector.create(), /requer state/);
});

test('currentEvent preserva referência exata do evento apontado por state.index', () => {
  const Selector = loadSelector();
  const events = [{ id: 0 }, { id: 1 }, { id: 2 }];
  const state = { parsed: { events }, index: 1 };
  const api = Selector.create({ state });

  assert.strictEqual(api.currentEvent(), events[1]);
  state.index = 2;
  assert.strictEqual(api.currentEvent(), events[2]);
  state.index = 0;
  assert.strictEqual(api.currentEvent(), events[0]);
});

test('currentEvent retorna null sem parsed, fora do intervalo ou em slot vazio', () => {
  const Selector = loadSelector();
  const state = { parsed: null, index: 0 };
  const api = Selector.create({ state });

  assert.equal(api.currentEvent(), null);

  state.parsed = { events: [{ id: 0 }, null, { id: 2 }] };
  state.index = 5;
  assert.equal(api.currentEvent(), null);

  state.index = 1;
  assert.equal(api.currentEvent(), null);
});

test('currentEvent é seletor puro: não altera index, parsed nem coleção', () => {
  const Selector = loadSelector();
  const events = [{ id: 0 }, { id: 1 }];
  const parsed = { events };
  const state = { parsed, index: 1 };
  const beforeEvents = events.slice();
  const api = Selector.create({ state });

  const result = api.currentEvent();

  assert.strictEqual(result, events[1]);
  assert.equal(state.index, 1);
  assert.strictEqual(state.parsed, parsed);
  assert.deepEqual(events, beforeEvents);
});

test('módulo permanece desacoplado de renderização, navegação, rota e DOM', () => {
  for (const forbidden of [
    'renderCurrent(', 'goTo(', 'planMotionTransition', 'FlightFlowRouteProcessedV7412',
    'document.', 'localStorage', 'sessionStorage', 'fetch(', 'requestAnimationFrame',
  ]) assert.equal(SOURCE.includes(forbidden), false, `acoplamento proibido: ${forbidden}`);
});

test('index carrega seletor antes do núcleo e mantém wiring explícito', () => {
  const tag = '<script id="flightflow-current-event-selector" src="src/core/current-event-selector.js"></script>';
  const tagIndex = HTML.indexOf(tag);
  const kernelIndex = HTML.indexOf('const Parser = window.FlightParser;');
  const stateIndex = HTML.indexOf('const state = {');
  const wiringIndex = HTML.indexOf('const CurrentEventSelector = window.FlightFlowCurrentEventSelector;');
  const firstDirectConsumer = HTML.indexOf('const RealMapAircraftController = window.FlightFlowRealMapAircraftController;');

  assert.notEqual(tagIndex, -1, 'seletor deve estar referenciado');
  assert.ok(tagIndex < kernelIndex, 'seletor deve carregar antes do IIFE principal');
  assert.ok(stateIndex >= 0 && wiringIndex > stateIndex, 'seletor deve ser instanciado somente após state');
  assert.ok(firstDirectConsumer > wiringIndex, 'seletor deve estar inicializado antes do primeiro consumidor direto');
  assert.equal(HTML.includes('  function currentEvent()'), false, 'currentEvent não deve voltar ao IIFE');

  for (const token of [
    'const CurrentEventSelector = window.FlightFlowCurrentEventSelector;',
    "if (!CurrentEventSelector) throw new Error('FlightFlowCurrentEventSelector não foi carregado.');",
    'const { currentEvent } = CurrentEventSelector.create({ state });',
  ]) assert.ok(HTML.includes(token), `wiring ausente: ${token}`);
});
