'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');
const SOURCE = fs.readFileSync(path.join(ROOT, 'src/map/aircraft-motion-controller.js'), 'utf8');

function loadModule() {
  const sandbox = {
    window: {},
    performance: { now: () => 0 },
    requestAnimationFrame: () => 1,
    cancelAnimationFrame: () => {},
    CustomEvent: class CustomEventMock {},
  };
  vm.createContext(sandbox);
  vm.runInContext(SOURCE, sandbox, { filename: 'aircraft-motion-controller.js' });
  return sandbox.window.FlightFlowAircraftMotionController;
}

function baseDeps(overrides = {}) {
  const state = {
    index: 0,
    geo: { eventRoutes: [{ points: [{ x: 0, y: 0 }, { x: 10, y: 0 }] }] },
    motion: { heading: 90 },
    renderedProgress: 0,
    renderedPlane: null,
    lastPlane: null,
  };
  return {
    state,
    els: { planeGroup: null, completedPath: null },
    pointAlongPolyline: () => ({ point: { x: 2.5, y: 0 }, index: 1, ratio: .25, distance: 2.5 }),
    clamp01: value => Math.max(0, Math.min(1, Number(value))),
    getCurrentMapSymbolScale: () => 1.25,
    smoothPath: () => '',
    slicePolyline: () => ({ prefix: [] }),
    updateRadarTagPosition: () => {},
    maybeFollowAircraft: () => {},
    updateRealMapAircraft: () => {},
    clamp: (value, min, max) => Math.max(min, Math.min(max, Number(value))),
    ...overrides,
  };
}

test('radar tag, follow/camera and real-map adapters remain mandatory motion outputs', () => {
  for (const name of ['updateRadarTagPosition', 'maybeFollowAircraft', 'updateRealMapAircraft']) {
    const api = loadModule();
    const deps = baseDeps();
    deps[name] = null;
    assert.throws(
      () => api.create(deps),
      error => error instanceof TypeError && error.message === `${name} deve ser função.`,
      `${name} deve permanecer uma dependência explícita do motor`,
    );
  }
});

test('applyMotionFrame fans out one frame to radar, follow and real map exactly once and in order', () => {
  const api = loadModule();
  const calls = [];
  const point = { x: 400, y: 300 };
  const deps = baseDeps({
    pointAlongPolyline: () => ({ point, index: 1, ratio: .5, distance: 5 }),
    updateRadarTagPosition: value => calls.push(['radar', value]),
    maybeFollowAircraft: value => calls.push(['follow', value]),
    updateRealMapAircraft: value => calls.push(['real', value]),
  });
  const controller = api.create(deps);

  controller.applyMotionFrame(.5, true);

  assert.deepEqual(calls.map(call => call[0]), ['radar', 'follow', 'real']);
  assert.equal(calls.length, 3);
  assert.strictEqual(calls[0][1], point, 'radar deve receber o ponto espacial calculado');
  assert.strictEqual(calls[1][1], point, 'follow/camera deve receber o mesmo ponto espacial calculado');
  assert.strictEqual(calls[2][1], deps.state.renderedPlane, 'mapa real deve receber o frame renderizado atual');
});

test('all output adapters observe the state already committed for the current frame', () => {
  const api = loadModule();
  const observations = [];
  const point = { x: 250, y: 175 };
  const deps = baseDeps({
    pointAlongPolyline: () => ({ point, index: 1, ratio: .75, distance: 7.5 }),
  });
  const observe = (kind, payload) => {
    observations.push({
      kind,
      payload,
      renderedProgress: deps.state.renderedProgress,
      renderedPlane: deps.state.renderedPlane,
      lastPlane: deps.state.lastPlane,
    });
  };
  deps.updateRadarTagPosition = value => observe('radar', value);
  deps.maybeFollowAircraft = value => observe('follow', value);
  deps.updateRealMapAircraft = value => observe('real', value);
  const controller = api.create(deps);

  controller.applyMotionFrame(.75, true);

  assert.equal(deps.state.renderedProgress, .75);
  assert.deepEqual(deps.state.lastPlane, { x: 250, y: 175 });
  assert.equal(deps.state.renderedPlane.x, 250);
  assert.equal(deps.state.renderedPlane.y, 175);
  assert.equal(deps.state.renderedPlane.progress, .75);
  assert.equal(deps.state.renderedPlane.scale, 1.25);

  for (const observation of observations) {
    assert.equal(observation.renderedProgress, .75, `${observation.kind} deve observar o progresso já atualizado`);
    assert.strictEqual(observation.renderedPlane, deps.state.renderedPlane, `${observation.kind} deve observar o frame atual`);
    assert.deepEqual(observation.lastPlane, { x: 250, y: 175 }, `${observation.kind} deve observar lastPlane atual`);
  }
  assert.strictEqual(observations[0].payload, point);
  assert.strictEqual(observations[1].payload, point);
  assert.strictEqual(observations[2].payload, deps.state.renderedPlane);
});
