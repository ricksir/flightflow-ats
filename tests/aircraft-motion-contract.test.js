'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');
const HTML = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const MOTION_MODULE = fs.readFileSync(path.join(ROOT, 'src', 'map', 'aircraft-motion-controller.js'), 'utf8');
const EVENT_NAVIGATION_MODULE = fs.readFileSync(path.join(ROOT, 'src', 'core', 'event-navigation-controller.js'), 'utf8');
const EXPECTED = Object.freeze({
  resetMotionController: {
    bytes: 497,
    lines: 15,
    sha256: '62e4cc8842cddeade958648cf9c512aedc7a8255cc9b9911c24e23758d565b54',
  },
  motionRoute: {
    bytes: 273,
    lines: 5,
    sha256: '54e89c6440959f7ba8aaf0b6b679ebe1491b43608c01275702241ec291d26297',
  },
  applyMotionFrame: {
    bytes: 1590,
    lines: 25,
    sha256: '79ac80d9e27df513f2c319caccf72fa578c9f401182435fef59ff53114fafdac',
  },
  snapMotionTo: {
    bytes: 302,
    lines: 9,
    sha256: 'e17236857c343cdb7ee183bb741cc72e432f476d46989c282a56062c24fb8857',
  },
  startMotionLoop: {
    bytes: 3442,
    lines: 55,
    sha256: '314642962044d602d68ceded1adae4a3846828a8a33ae19627287db00cbbcbf8',
  },
});

function sourceContainer(name) {
  if (Object.prototype.hasOwnProperty.call(EXPECTED, name)) return MOTION_MODULE;
  if (name === 'goTo') return EVENT_NAVIGATION_MODULE;
  return HTML;
}

function functionSource(name) {
  const source = sourceContainer(name);
  const marker = `  function ${name}(`;
  const start = source.indexOf(marker);
  assert.ok(start >= 0, `${name} deve existir na fronteira esperada`);
  let i = source.indexOf('(', start);
  let depth = 0;
  let quote = null;
  let escaped = false;
  for (; i < source.length; i += 1) {
    const ch = source[i];
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
  while (/\s/.test(source[brace])) brace += 1;
  assert.equal(source[brace], '{', `${name} deve possuir corpo`);
  depth = 0;
  quote = null;
  escaped = false;
  for (i = brace; i < source.length; i += 1) {
    const ch = source[i];
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
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  assert.fail(`fim de ${name} não encontrado`);
}

function sha256(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

function compile(name, context = {}) {
  const sandbox = { ...context };
  vm.createContext(sandbox);
  return vm.runInContext(`(${functionSource(name).trim()})`, sandbox, { filename: `aircraft-motion:${name}` });
}

test('cinco funções do motor de movimento mantêm identidade byte a byte congelada', () => {
  for (const [name, expected] of Object.entries(EXPECTED)) {
    const source = functionSource(name);
    assert.equal(Buffer.byteLength(source, 'utf8'), expected.bytes, `${name}: bytes`);
    assert.equal(source.split(/\r?\n/).length, expected.lines, `${name}: linhas`);
    assert.equal(sha256(source), expected.sha256, `${name}: SHA-256`);
  }
});

test('resetMotionController preserva baseline de posição, heading e transição', () => {
  const state = {
    motion: { initialized: true, targetProgress: 9, currentProgress: 9, velocity: 8, heading: 1, pitch: 2, bank: 3, lastFrame: 0, lastPoint: null, ffrpTransition: {} },
    renderedProgress: 9,
    renderedPlane: null,
  };
  const resetMotionController = compile('resetMotionController', { state, performance: { now: () => 1234 } });
  resetMotionController();
  assert.deepEqual(JSON.parse(JSON.stringify(state.motion)), {
    initialized: false,
    targetProgress: 0,
    currentProgress: 0,
    velocity: 0,
    heading: 90,
    pitch: 0,
    bank: 0,
    lastFrame: 1234,
    lastPoint: { x: 205, y: 748 },
    ffrpTransition: null,
  });
  assert.equal(state.renderedProgress, 0);
  assert.deepEqual(JSON.parse(JSON.stringify(state.renderedPlane)), { x:205, y:748, angle:90, heading:90, progress:0, scale:1 });
});

test('motionRoute usa a rota do evento e mantém fallback conhecido quando ela não existe', () => {
  const state = { index: 1, geo: { eventRoutes: [null, { points: [{x:1,y:2},{x:3,y:4}] }] } };
  const motionRoute = compile('motionRoute', { state });
  assert.deepEqual(JSON.parse(JSON.stringify(motionRoute())), [{x:1,y:2},{x:3,y:4}]);
  state.geo.eventRoutes[1] = { points: [{x:1,y:2}] };
  assert.deepEqual(JSON.parse(JSON.stringify(motionRoute())), [{x:205,y:748},{x:800,y:450},{x:1370,y:575}]);
});

test('applyMotionFrame preserva interpolação espacial, menor giro angular e smoothing de heading', () => {
  const state = {
    motion: { heading: 350, lastPoint: null },
    renderedProgress: 0,
    renderedPlane: null,
    lastPlane: null,
  };
  const calls = [];
  const point = { x: 400, y: 300 };
  const applyMotionFrame = compile('applyMotionFrame', {
    state,
    els: { planeGroup: null, completedPath: null },
    motionRoute: () => [{x:0,y:0},{x:10,y:0}],
    pointAlongPolyline: () => ({ point, index: 1, ratio: .5, distance: 5 }),
    clamp01: value => Math.max(0, Math.min(1, Number(value))),
    getCurrentMapSymbolScale: () => 1.25,
    smoothPath: () => 'PATH',
    slicePolyline: () => ({ prefix: [] }),
    updateRadarTagPosition: value => calls.push(['radar', value]),
    maybeFollowAircraft: value => calls.push(['follow', value]),
    updateRealMapAircraft: value => calls.push(['real', value]),
  });
  applyMotionFrame(.5, false);
  assert.ok(Math.abs(state.motion.heading - 368) < 1e-9, 'heading deve girar pelo menor arco e aplicar smoothing de 18%');
  assert.equal(state.renderedProgress, .5);
  assert.equal(state.renderedPlane.x, 400);
  assert.equal(state.renderedPlane.y, 300);
  assert.equal(state.renderedPlane.scale, 1.25);
  assert.equal(calls.map(item => item[0]).join(','), 'radar,follow,real');
});

test('applyMotionFrame em modo immediate chega ao heading calculado sem smoothing residual', () => {
  const state = { motion: { heading: 10 }, renderedProgress: 0, renderedPlane: null, lastPlane: null };
  const applyMotionFrame = compile('applyMotionFrame', {
    state,
    els: { planeGroup: null, completedPath: null },
    motionRoute: () => [{x:0,y:0},{x:10,y:0}],
    pointAlongPolyline: () => ({ point: {x:5,y:0}, index: 1, ratio: .5, distance: 5 }),
    clamp01: value => Math.max(0, Math.min(1, Number(value))),
    getCurrentMapSymbolScale: () => 1,
    smoothPath: () => '',
    slicePolyline: () => ({ prefix: [] }),
    updateRadarTagPosition: () => {},
    maybeFollowAircraft: () => {},
    updateRealMapAircraft: () => {},
  });
  applyMotionFrame(.5, true);
  assert.equal(state.motion.heading, 90);
});

test('snapMotionTo cancela transição, zera velocidade e força frame imediato', () => {
  const calls = [];
  const state = { motion: { currentProgress: .2, targetProgress: .9, velocity: 4, ffrpTransition: { mode: 'waypoints' }, initialized: false } };
  const snapMotionTo = compile('snapMotionTo', {
    state,
    clamp01: value => Math.max(0, Math.min(1, Number(value))),
    applyMotionFrame: (...args) => calls.push(args),
  });
  snapMotionTo(1.5);
  assert.equal(state.motion.currentProgress, 1);
  assert.equal(state.motion.targetProgress, 1);
  assert.equal(state.motion.velocity, 0);
  assert.equal(state.motion.ffrpTransition, null);
  assert.equal(state.motion.initialized, true);
  assert.deepEqual(JSON.parse(JSON.stringify(calls)), [[1, true]]);
});

test('startMotionLoop preserva easing senoidal e passagem explícita no fixo', () => {
  const callbacks = [];
  const frames = [];
  const events = [];
  const state = {
    parsed: {},
    index: 78,
    playing: false,
    motion: {
      raf: null,
      lastFrame: 1,
      initialized: true,
      targetProgress: .6,
      currentProgress: .2,
      velocity: 0,
      ffrpTransition: {
        mode: 'waypoints',
        from: .2,
        to: .6,
        steps: [{ ident: 'ILVES', progress: .6, duration: 1000 }],
        stepIndex: 0,
        stepFrom: .2,
        stepStart: 1,
      },
    },
  };
  class CustomEventMock {
    constructor(type, init) { this.type = type; this.detail = init.detail; }
  }
  const startMotionLoop = compile('startMotionLoop', {
    state,
    clamp: (value, min, max) => Math.max(min, Math.min(max, Number(value))),
    clamp01: value => Math.max(0, Math.min(1, Number(value))),
    applyMotionFrame: (...args) => frames.push(args),
    cancelAnimationFrame: () => {},
    requestAnimationFrame: callback => { callbacks.push(callback); return callbacks.length; },
    performance: { now: () => 1 },
    window: { dispatchEvent: event => events.push(event) },
    CustomEvent: CustomEventMock,
  });
  startMotionLoop();
  assert.equal(callbacks.length, 1);
  callbacks.shift()(501);
  assert.ok(Math.abs(state.motion.currentProgress - .4) < 1e-9, 'meio da perna deve usar easing senoidal de 50%');
  assert.equal(frames.length, 1);
  assert.equal(frames[0].length, 1);
  assert.ok(Math.abs(frames[0][0] - .4) < 1e-9, 'frame intermediário deve refletir o mesmo progresso com tolerância de ponto flutuante');
  assert.equal(events.length, 0);

  callbacks.shift()(1001);
  assert.equal(state.motion.currentProgress, .6);
  assert.equal(state.motion.ffrpTransition, null);
  assert.equal(events.length, 1);
  assert.equal(events[0].type, 'flightflow:route-fix-crossed');
  assert.deepEqual(JSON.parse(JSON.stringify(events[0].detail)), { ident: 'ILVES', progress: .6, eventIndex: 78 });
  assert.ok(frames.some(args => args[0] === .6 && args[1] === true), 'fixo deve ser renderizado explicitamente em frame imediato');
});

test('startMotionLoop mantém os três regimes temporais: waypoint, smoothstep e amortecimento exponencial', () => {
  const source = functionSource('startMotionLoop');
  for (const token of [
    "transition.mode === 'waypoints'",
    'const eased = .5 - .5 * Math.cos(Math.PI * u);',
    "new CustomEvent('flightflow:route-fix-crossed'",
    'const eased = u * u * (3 - 2 * u);',
    'const factor = 1 - Math.exp(-dt * (state.playing ? 2.4 : 3.0));',
    'Math.abs(diff) > .00005',
    'state.motion.raf = requestAnimationFrame(frame);',
  ]) assert.ok(source.includes(token), `contrato temporal ausente: ${token}`);
});

test('goTo delega o planejamento; planner monta a transição e motor apenas a executa', () => {
  const source = functionSource('goTo');
  assert.ok(source.includes('planMotionTransition(nextIndex)'));
  assert.equal(source.includes("mode:'waypoints'"), false);
  assert.equal(source.includes('transitionPlanForEvents'), false);
  assert.equal(source.includes('transitionDurations'), false);
  assert.equal(source.includes('state.motion.ffrpTransition'), false);

  const plannerSource = fs.readFileSync(path.join(ROOT, 'src', 'map', 'motion-transition-planner.js'), 'utf8');
  assert.ok(plannerSource.includes("mode:'waypoints'"));
  assert.ok(plannerSource.includes('transitionPlanForEvents'));
  assert.ok(plannerSource.includes('transitionDurations'));
  assert.ok(plannerSource.includes('state.motion.ffrpTransition'));

  const motionLoop = functionSource('startMotionLoop');
  assert.equal(motionLoop.includes('transitionPlanForEvents'), false);
  assert.equal(motionLoop.includes('transitionDurations'), false);
});

test('goTo, renderCurrent e Rota Processada permanecem fora do motor de movimento', () => {
  assert.equal(HTML.includes('  function goTo('), false, 'goTo não deve voltar ao IIFE principal');
  assert.equal(HTML.includes('  function renderCurrent('), false, 'renderCurrent não deve voltar ao IIFE principal');
  assert.ok(HTML.includes('src/core/event-navigation-controller.js'), 'goTo deve permanecer no controller dedicado');
  assert.ok(HTML.includes('src/core/render-current-controller.js'), 'renderCurrent deve permanecer no controller dedicado');
  assert.ok(HTML.includes('FlightFlowEventNavigationController'));
  assert.ok(HTML.includes('FlightFlowRenderCurrentController'));
  assert.ok(HTML.includes('FlightFlowRouteProcessedV7412'));
  const combined = Object.keys(EXPECTED).map(functionSource).join('\n');
  assert.equal(combined.includes('function renderCurrent('), false);
  assert.equal(combined.includes('function goTo('), false);
});


test('aircraft motion controller é carregado antes do kernel e remove as cinco declarações inline', () => {
  const tag = '<script src="src/map/aircraft-motion-controller.js"></script>';
  const tagIndex = HTML.indexOf(tag);
  const kernelIndex = HTML.indexOf('const Parser = window.FlightParser;');
  assert.notEqual(tagIndex, -1);
  assert.notEqual(kernelIndex, -1);
  assert.ok(tagIndex < kernelIndex, 'motion controller deve carregar antes do kernel');
  for (const name of Object.keys(EXPECTED)) {
    assert.equal(HTML.includes(`  function ${name}(`), false, `${name} não deve continuar inline`);
  }
  assert.ok(HTML.includes('const AircraftMotionController = window.FlightFlowAircraftMotionController;'));
  assert.ok(HTML.includes('const { resetMotionController, motionRoute, applyMotionFrame, snapMotionTo, startMotionLoop } = AircraftMotionController.create({'));
});

test('aircraft motion controller expõe somente as cinco operações congeladas', () => {
  const context = { window: {} };
  vm.createContext(context);
  vm.runInContext(MOTION_MODULE, context, { filename: 'aircraft-motion-controller.js' });
  const factory = context.window.FlightFlowAircraftMotionController;
  assert.ok(factory);
  assert.equal(Object.isFrozen(factory), true);
  assert.deepEqual(Array.from(Object.keys(factory)), ['create']);
  const noop = () => {};
  const controller = factory.create({
    state: { motion: {} },
    els: {},
    pointAlongPolyline: noop,
    clamp01: value => value,
    getCurrentMapSymbolScale: () => 1,
    smoothPath: () => '',
    slicePolyline: noop,
    updateRadarTagPosition: noop,
    maybeFollowAircraft: noop,
    updateRealMapAircraft: noop,
    clamp: value => value,
  });
  assert.equal(Object.isFrozen(controller), true);
  assert.deepEqual(Array.from(Object.keys(controller)), [
    'resetMotionController', 'motionRoute', 'applyMotionFrame', 'snapMotionTo', 'startMotionLoop'
  ]);
});

test('motion controller não absorve planejamento de navegação nem renderCurrent', () => {
  assert.equal(MOTION_MODULE.includes('transitionPlanForEvents'), false);
  assert.equal(MOTION_MODULE.includes('transitionDurations'), false);
  assert.equal(MOTION_MODULE.includes('function goTo('), false);
  assert.equal(MOTION_MODULE.includes('function renderCurrent('), false);
  assert.ok(MOTION_MODULE.includes("new CustomEvent('flightflow:route-fix-crossed'"));
});
