'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const HTML = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const MODULE_PATH = path.join(ROOT, 'src', 'core', 'event-navigation-controller.js');
const SOURCE = fs.readFileSync(MODULE_PATH, 'utf8');

function loadController() {
  delete require.cache[require.resolve(MODULE_PATH)];
  return require(MODULE_PATH);
}

function createHarness(options = {}) {
  const Controller = loadController();
  const state = {
    parsed: options.parsed === false ? null : { events: [{ index: 0 }, { index: 1 }, { index: 2 }] },
    index: options.index ?? 0,
    motion: options.motion === false ? null : {},
  };
  const plannerCalls = [];
  const renderCalls = [];
  const planMotionTransition = nextIndex => {
    plannerCalls.push({ nextIndex, indexAtPlan: state.index });
  };
  const renderCurrent = renderOptions => {
    renderCalls.push({ options: renderOptions, indexAtRender: state.index });
  };
  const api = Controller.create({ state, planMotionTransition, renderCurrent });
  return { Controller, api, goTo: api.goTo, state, plannerCalls, renderCalls };
}

test('módulo publica fábrica mínima e congelada', () => {
  const Controller = loadController();
  assert.equal(Object.isFrozen(Controller), true);
  assert.deepEqual(Object.keys(Controller), ['create']);
  const h = createHarness();
  assert.equal(Object.isFrozen(h.api), true);
  assert.deepEqual(Object.keys(h.api), ['goTo']);
});

test('fábrica exige somente state, planner e renderCurrent', () => {
  const Controller = loadController();
  assert.throws(() => Controller.create(), /requer state/);
  assert.throws(() => Controller.create({ state: {} }), /requer planMotionTransition/);
  assert.throws(
    () => Controller.create({ state: {}, planMotionTransition() {} }),
    /requer renderCurrent/,
  );
});

test('goTo delega planejamento ao MotionTransitionPlanner e permanece orquestrador fino', () => {
  for (const token of [
    'if (state.motion) planMotionTransition(nextIndex);',
    'state.index = nextIndex;',
    'renderCurrent(options);',
  ]) assert.ok(SOURCE.includes(token), `contrato ausente em goTo: ${token}`);

  for (const forbidden of [
    'transitionPlanForEvents',
    'transitionDurations',
    'ffrpTransition',
    'FlightFlowRouteProcessedV7412',
    'performance.now()',
    'console.warn',
  ]) assert.equal(SOURCE.includes(forbidden), false, `planejamento ainda absorvido por goTo: ${forbidden}`);
});

test('goTo sem plano carregado continua no-op', () => {
  const harness = createHarness({ parsed: false });
  harness.goTo(2, { source: 'test' });
  assert.equal(harness.state.index, 0);
  assert.deepEqual(harness.plannerCalls, []);
  assert.deepEqual(harness.renderCalls, []);
});

test('goTo limita o índice antes de delegar e planner observa o índice anterior', () => {
  const harness = createHarness({ index: 0 });
  harness.goTo(99);
  assert.deepEqual(harness.plannerCalls, [{ nextIndex: 2, indexAtPlan: 0 }]);
  assert.equal(harness.state.index, 2);

  const lower = createHarness({ index: 2 });
  lower.goTo(-99);
  assert.deepEqual(lower.plannerCalls, [{ nextIndex: 0, indexAtPlan: 2 }]);
  assert.equal(lower.state.index, 0);
});

test('goTo compromete state.index antes de renderCurrent e preserva options', () => {
  const harness = createHarness({ index: 1 });
  const options = { source: 'timeline', silent: true };
  harness.goTo(2, options);
  assert.equal(harness.renderCalls.length, 1);
  assert.equal(harness.renderCalls[0].indexAtRender, 2);
  assert.equal(harness.renderCalls[0].options, options);
});

test('goTo sem motion não chama planner, mas continua navegando e renderizando', () => {
  const harness = createHarness({ index: 0, motion: false });
  harness.goTo(1, { source: 'no-motion' });
  assert.deepEqual(harness.plannerCalls, []);
  assert.equal(harness.state.index, 1);
  assert.equal(harness.renderCalls[0].indexAtRender, 1);
});

test('index carrega controller antes do núcleo e mantém wiring explícito', () => {
  const tag = '<script id="flightflow-event-navigation-controller" src="src/core/event-navigation-controller.js"></script>';
  const tagIndex = HTML.indexOf(tag);
  const kernelIndex = HTML.indexOf('const Parser = window.FlightParser;');
  assert.notEqual(tagIndex, -1, 'controller deve estar referenciado');
  assert.ok(tagIndex < kernelIndex, 'controller deve carregar antes do IIFE principal');
  assert.equal(HTML.includes('  function goTo('), false, 'goTo não deve voltar ao IIFE principal');
  for (const token of [
    'const EventNavigationController = window.FlightFlowEventNavigationController;',
    "if (!EventNavigationController) throw new Error('FlightFlowEventNavigationController não foi carregado.');",
    'const { goTo } = EventNavigationController.create({',
    'state,',
    'planMotionTransition: (...args) => planMotionTransition(...args),',
    'renderCurrent: (...args) => renderCurrent(...args),',
  ]) assert.ok(HTML.includes(token), `wiring ausente: ${token}`);
});
