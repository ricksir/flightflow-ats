'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const HTML = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

function extractNamedFunction(source, name) {
  const match = new RegExp(`^[ \\t]*function[ \\t]+${name}[ \\t]*\\(`, 'm').exec(source);
  assert.ok(match, `${name} deve continuar inline neste corte`);
  const start = match.index;
  const openParen = source.indexOf('(', match.index);
  const closeParen = source.indexOf(')', openParen + 1);
  assert.ok(openParen >= 0 && closeParen > openParen, `${name} deve manter assinatura válida`);
  const brace = source.indexOf('{', closeParen + 1);
  assert.ok(brace > closeParen, `${name} deve manter corpo delimitado`);

  let depth = 0;
  let quote = null;
  let escaped = false;
  let lineComment = false;
  let blockComment = false;

  for (let i = brace; i < source.length; i += 1) {
    const ch = source[i];
    const next = source[i + 1] || '';
    if (lineComment) {
      if (ch === '\n') lineComment = false;
      continue;
    }
    if (blockComment) {
      if (ch === '*' && next === '/') {
        blockComment = false;
        i += 1;
      }
      continue;
    }
    if (quote) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === quote) quote = null;
      continue;
    }
    if (ch === '/' && next === '/') {
      lineComment = true;
      i += 1;
      continue;
    }
    if (ch === '/' && next === '*') {
      blockComment = true;
      i += 1;
      continue;
    }
    if (ch === '\'' || ch === '"' || ch === '`') quote = ch;
    else if (ch === '{') depth += 1;
    else if (ch === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(start, i + 1).trim();
    }
  }
  throw new Error(`${name} não terminou corretamente`);
}

const GO_TO_SOURCE = extractNamedFunction(HTML, 'goTo');

function createHarness(options = {}) {
  const calls = [];
  const events = options.events || [{ index: 0 }, { index: 1 }, { index: 2 }];
  const state = {
    parsed: { events },
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
    ...(options.state || {}),
  };
  if (options.state?.geo) state.geo = options.state.geo;
  if (options.state?.motion === null) state.motion = null;
  else if (options.state?.motion) state.motion = { initialized: true, currentProgress: 0.2, velocity: 7, ffrpTransition: null, ...options.state.motion };

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

  const routeApi = {
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
  const windowObject = options.routeApiMissing ? {} : { FlightFlowRouteProcessedV7412: routeApi };
  const warnings = [];
  const consoleObject = { warn: (...args) => warnings.push(args) };
  const performanceObject = { now: () => options.now ?? 1234 };
  const renderCalls = [];
  const renderCurrent = renderOptions => {
    renderCalls.push({ options: renderOptions, indexAtRender: state.index, transition: state.motion?.ffrpTransition || null });
  };

  const factory = new Function(
    'state', 'window', 'performance', 'renderCurrent', 'console',
    `${GO_TO_SOURCE}; return goTo;`,
  );
  const goTo = factory(state, windowObject, performanceObject, renderCurrent, consoleObject);

  return { goTo, state, calls, warnings, renderCalls, plan, steps };
}

test('goTo mantém o bloco de planejamento por fixos antes de qualquer extração', () => {
  for (const token of [
    'api.transitionPlanForEvents(state.index, nextIndex)',
    'api.transitionDurations(plan, state.speed, state.playing)',
    "mode:'waypoints'",
    'steps:waypointPlan.steps',
    'stepIndex:0',
    'stepFrom:current',
    'stepStart:performance.now()',
    'state.index = nextIndex;',
    'renderCurrent(options);',
  ]) assert.ok(GO_TO_SOURCE.includes(token), `contrato ausente em goTo: ${token}`);
});

test('goTo sem plano carregado não altera índice nem renderiza', () => {
  const harness = createHarness({ state: { parsed: null } });
  harness.goTo(2, { source: 'test' });
  assert.equal(harness.state.index, 0);
  assert.deepEqual(harness.calls, []);
  assert.deepEqual(harness.renderCalls, []);
});

test('goTo limita o índice e renderiza somente depois de comprometer state.index', () => {
  const harness = createHarness({ state: { motion: null } });
  const options = { source: 'boundary' };
  harness.goTo(99, options);
  assert.equal(harness.state.index, 2);
  assert.equal(harness.renderCalls.length, 1);
  assert.equal(harness.renderCalls[0].indexAtRender, 2);
  assert.equal(harness.renderCalls[0].options, options);
});

test('goTo consulta a Rota Processada com índice anterior → próximo índice', () => {
  const harness = createHarness();
  harness.state.index = 1;
  harness.state.geo.eventRoutes[2].target = 0.8;
  harness.goTo(2);
  assert.deepEqual(harness.calls[0], ['transitionPlanForEvents', 1, 2]);
  assert.equal(harness.state.index, 2);
});

test('goTo instala transição waypoint preservando plano, etapas e instante inicial', () => {
  const harness = createHarness({ now: 9876, state: { speed: 4, playing: true } });
  harness.goTo(2, { source: 'next' });

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
  assert.equal(harness.renderCalls[0].indexAtRender, 2);
});

test('goTo usa transição suave quando não há etapas de waypoint', () => {
  const harness = createHarness({ steps: [], now: 5000, state: { speed: 4, playing: true } });
  harness.goTo(2);

  assert.deepEqual(harness.state.motion.ffrpTransition, {
    from: 0.2,
    to: 0.8,
    start: 5000,
    duration: 725,
  });
  assert.equal(harness.state.motion.velocity, 0);
});

test('goTo preserva limites 650..1450 ms da transição suave manual', () => {
  const short = createHarness({ steps: [], state: { motion: { currentProgress: 0.79 } } });
  short.goTo(2);
  assert.equal(short.state.motion.ffrpTransition.duration, 722);

  const long = createHarness({ steps: [], state: { motion: { currentProgress: 0 } } });
  long.goTo(2);
  assert.equal(long.state.motion.ffrpTransition.duration, 1450);
});

test('falha da API de checkpoints degrada para transição suave e registra aviso', () => {
  const harness = createHarness({ planError: 'falha simulada', now: 4321 });
  harness.goTo(2);

  assert.equal(harness.warnings.length, 1);
  assert.match(String(harness.warnings[0][0]), /plano de transição por fixos/i);
  assert.deepEqual(harness.state.motion.ffrpTransition, {
    from: 0.2,
    to: 0.8,
    start: 4321,
    duration: 1450,
  });
  assert.equal(harness.state.index, 2);
});

test('API ausente também preserva fallback suave sem bloquear navegação', () => {
  const harness = createHarness({ routeApiMissing: true, now: 2468 });
  harness.goTo(2);
  assert.deepEqual(harness.state.motion.ffrpTransition, {
    from: 0.2,
    to: 0.8,
    start: 2468,
    duration: 1450,
  });
  assert.equal(harness.state.index, 2);
});

test('target inválido ou motion não inicializado limpa a transição sem impedir render', () => {
  const invalidTarget = createHarness({
    state: {
      geo: { eventRoutes: [{ target: 0.1 }, { target: 0.5 }, { target: Number.NaN }] },
    },
  });
  invalidTarget.goTo(2);
  assert.equal(invalidTarget.state.motion.ffrpTransition, null);
  assert.equal(invalidTarget.state.motion.velocity, 0);
  assert.equal(invalidTarget.state.index, 2);
  assert.equal(invalidTarget.renderCalls.length, 1);

  const notInitialized = createHarness({ state: { motion: { initialized: false } } });
  notInitialized.goTo(2);
  assert.equal(notInitialized.state.motion.ffrpTransition, null);
  assert.equal(notInitialized.state.index, 2);
});
