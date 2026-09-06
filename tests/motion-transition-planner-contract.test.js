'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');
const MODULE = path.join(ROOT, 'src', 'map', 'motion-transition-planner.js');
const SOURCE = fs.readFileSync(MODULE, 'utf8');

function loadApi() {
  const sandbox = {};
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(SOURCE, sandbox, { filename: MODULE });
  return sandbox.FlightFlowMotionTransitionPlanner;
}

function baseState(overrides = {}) {
  const state = {
    parsed: { events: [{ index: 0 }, { index: 1 }, { index: 2 }] },
    index: 0,
    speed: 1,
    playing: false,
    geo: {
      eventRoutes: [
        { target: 0.1 },
        { target: 0.5 },
        { target: 0.8 },
      ],
    },
    motion: {
      initialized: true,
      currentProgress: 0.2,
      targetProgress: 0.2,
      velocity: 7,
      ffrpTransition: null,
    },
    ...overrides,
  };
  if (overrides.geo) state.geo = overrides.geo;
  if (overrides.motion === null) state.motion = null;
  else if (overrides.motion) state.motion = {
    initialized: true,
    currentProgress: 0.2,
    targetProgress: 0.2,
    velocity: 7,
    ffrpTransition: null,
    ...overrides.motion,
  };
  return state;
}

function createHarness(options = {}) {
  const state = baseState(options.state || {});
  const calls = [];
  const warnings = [];
  const plan = options.plan === undefined ? {
    fromIndex: 0,
    toIndex: 2,
    fromProgress: 0.2,
    toProgress: 0.8,
    checkpoints: [{ ident: 'PADIL', progress: 0.4 }],
  } : options.plan;
  const steps = options.steps === undefined ? [
    { ident: 'PADIL', progress: 0.4, duration: 340 },
    { ident: 'EVENTO', progress: 0.8, duration: 240, eventEnd: true },
  ] : options.steps;

  const routeApi = options.routeApiMissing ? undefined : {
    transitionPlanForEvents(from, to) {
      calls.push(['transitionPlanForEvents', from, to]);
      if (options.planError) throw new Error(options.planError);
      return plan;
    },
    transitionDurations(value, speed, playing) {
      calls.push(['transitionDurations', value, speed, playing]);
      if (options.durationError) throw new Error(options.durationError);
      return steps;
    },
  };

  const api = loadApi();
  const planner = api.create({
    state,
    getRouteProcessedApi: () => routeApi,
    now: () => options.now ?? 1234,
    warn: (...args) => warnings.push(args),
  });
  return { api, planner, state, calls, warnings, plan, steps };
}

test('módulo publica fábrica mínima e congelada', () => {
  const api = loadApi();
  assert.equal(Object.isFrozen(api), true);
  assert.deepEqual(Object.keys(api), ['create']);
  assert.equal(typeof api.create, 'function');
});

test('fábrica exige estado, provedor da Rota Processada, relógio e warning', () => {
  const api = loadApi();
  assert.throws(() => api.create(), /state é obrigatório/);
  assert.throws(() => api.create({ state: {} }), /getRouteProcessedApi deve ser função/);
  assert.throws(() => api.create({ state: {}, getRouteProcessedApi: () => null }), /now deve ser função/);
  assert.throws(() => api.create({ state: {}, getRouteProcessedApi: () => null, now: () => 0 }), /warn deve ser função/);
});

test('instância é congelada e expõe somente planMotionTransition', () => {
  const { planner } = createHarness();
  assert.equal(Object.isFrozen(planner), true);
  assert.deepEqual(Object.keys(planner), ['planMotionTransition']);
});

test('planner não assume navegação quando motion não existe', () => {
  const { planner, state, calls } = createHarness({ state: { motion: null, index: 1 } });
  planner.planMotionTransition(2);
  assert.equal(state.index, 1);
  assert.deepEqual(calls, []);
});

test('planner consulta a Rota Processada com índice atual → próximo sem alterar state.index', () => {
  const { planner, state, calls } = createHarness({ state: { index: 1 } });
  planner.planMotionTransition(2);
  assert.deepEqual(calls[0], ['transitionPlanForEvents', 1, 2]);
  assert.equal(state.index, 1);
});

test('planner instala transição waypoint preservando plano, etapas e instante inicial', () => {
  const harness = createHarness({ now: 9876, state: { speed: 4, playing: true } });
  harness.planner.planMotionTransition(2);

  assert.deepEqual(harness.calls, [
    ['transitionPlanForEvents', 0, 2],
    ['transitionDurations', harness.plan, 4, true],
  ]);
  assert.deepEqual(harness.state.motion.ffrpTransition, {
    mode: 'waypoints',
    from: 0.2,
    to: 0.8,
    steps: harness.steps,
    stepIndex: 0,
    stepFrom: 0.2,
    stepStart: 9876,
    plan: harness.plan,
  });
  assert.equal(harness.state.motion.velocity, 0);
  assert.equal(harness.state.index, 0);
});

test('planner usa fallback suave quando não há etapas de waypoint', () => {
  const harness = createHarness({ steps: [], now: 5000, state: { speed: 4, playing: true } });
  harness.planner.planMotionTransition(2);
  assert.deepEqual(harness.state.motion.ffrpTransition, {
    from: 0.2,
    to: 0.8,
    start: 5000,
    duration: 725,
  });
  assert.equal(harness.state.motion.velocity, 0);
});

test('fallback manual mantém os limites temporais conhecidos', () => {
  const short = createHarness({ steps: [], state: { motion: { currentProgress: 0.79 } } });
  short.planner.planMotionTransition(2);
  assert.equal(short.state.motion.ffrpTransition.duration, 722);

  const long = createHarness({ steps: [], state: { motion: { currentProgress: 0 } } });
  long.planner.planMotionTransition(2);
  assert.equal(long.state.motion.ffrpTransition.duration, 1450);
});

test('falha da API de checkpoints degrada para fallback suave e registra warning', () => {
  const harness = createHarness({ planError: 'falha simulada', now: 4321 });
  harness.planner.planMotionTransition(2);
  assert.equal(harness.warnings.length, 1);
  assert.match(String(harness.warnings[0][0]), /plano de transição por fixos/i);
  assert.deepEqual(harness.state.motion.ffrpTransition, {
    from: 0.2,
    to: 0.8,
    start: 4321,
    duration: 1450,
  });
  assert.equal(harness.state.index, 0);
});

test('API ausente também preserva fallback suave', () => {
  const harness = createHarness({ routeApiMissing: true, now: 2468 });
  harness.planner.planMotionTransition(2);
  assert.deepEqual(harness.state.motion.ffrpTransition, {
    from: 0.2,
    to: 0.8,
    start: 2468,
    duration: 1450,
  });
});

test('target inválido ou motion não inicializado limpa transição e zera velocidade', () => {
  const invalidTarget = createHarness({
    state: {
      geo: { eventRoutes: [{ target: 0.1 }, { target: 0.5 }, { target: Number.NaN }] },
    },
  });
  invalidTarget.state.motion.ffrpTransition = { stale: true };
  invalidTarget.planner.planMotionTransition(2);
  assert.equal(invalidTarget.state.motion.ffrpTransition, null);
  assert.equal(invalidTarget.state.motion.velocity, 0);

  const notInitialized = createHarness({ state: { motion: { initialized: false } } });
  notInitialized.state.motion.ffrpTransition = { stale: true };
  notInitialized.planner.planMotionTransition(2);
  assert.equal(notInitialized.state.motion.ffrpTransition, null);
  assert.equal(notInitialized.state.motion.velocity, 0);
});

test('currentProgress inválido preserva fallback conhecido para o target', () => {
  const harness = createHarness({ steps: [], now: 111, state: { motion: { currentProgress: Number.NaN } } });
  harness.planner.planMotionTransition(2);
  assert.deepEqual(harness.state.motion.ffrpTransition, {
    from: 0.8,
    to: 0.8,
    start: 111,
    duration: 700,
  });
});

test('planner permanece sem DOM, storage, fetch, mapa e renderização', () => {
  for (const forbidden of ['document.', 'localStorage', 'sessionStorage', 'fetch(', 'renderCurrent(', 'state.index =', 'requestAnimationFrame']) {
    assert.equal(SOURCE.includes(forbidden), false, `dependência proibida no planner: ${forbidden}`);
  }
});
