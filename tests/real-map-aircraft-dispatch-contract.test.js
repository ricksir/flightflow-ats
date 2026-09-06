'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = path.resolve(__dirname, '..');
const HTML = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

function extractNamedFunction(source, name) {
  const match = new RegExp(`^\\s*function\\s+${name}\\s*\\(`, 'm').exec(source);
  assert.ok(match, `${name} deve continuar inline enquanto o dispatch é congelado`);
  const start = match.index;
  const brace = source.indexOf('{', match.index + match[0].length);
  let depth = 0;
  let quote = null;
  let escaped = false;
  for (let i = brace; i < source.length; i += 1) {
    const ch = source[i];
    if (quote) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === quote) quote = null;
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

const SOURCE = extractNamedFunction(HTML, 'updateRealMapAircraft');

function createHarness(options = {}) {
  const calls = [];
  const realMapState = {
    ready: true,
    engine: 'leaflet',
    ...(options.realMapState || {}),
  };
  const state = {
    parsed: { meta: { callsign: 'META123' } },
    geo: { eventRoutes: [{ points: ['A', 'B', 'C'] }] },
    index: 0,
    ...(options.state || {}),
  };
  const eventValue = Object.prototype.hasOwnProperty.call(options, 'currentEvent')
    ? options.currentEvent
    : { snapshot: { callsign: 'EVT123' } };
  const geoValue = options.geoValue || { lat: -15.5, lon: -47.8 };

  const deps = {
    realMapState,
    state,
    unprojectGeo: (x, y) => {
      calls.push(['unproject', x, y]);
      return geoValue;
    },
    updateRealMapCoordinateReadout: (lat, lon) => calls.push(['readout', lat, lon]),
    currentEvent: () => eventValue,
    updateGoogleAircraftMarker: (...args) => calls.push(['googleMarker', ...args]),
    updateGoogleCompletedRoute: (...args) => calls.push(['googleCompleted', ...args]),
    followRealMapAircraft: (...args) => calls.push(['follow', ...args]),
    updateLeafletAircraftMarker: (...args) => calls.push(['leafletMarker', ...args]),
    updateLeafletCompletedRoute: (...args) => calls.push(['leafletCompleted', ...args]),
  };

  const factory = new Function(
    'realMapState',
    'state',
    'unprojectGeo',
    'updateRealMapCoordinateReadout',
    'currentEvent',
    'updateGoogleAircraftMarker',
    'updateGoogleCompletedRoute',
    'followRealMapAircraft',
    'updateLeafletAircraftMarker',
    'updateLeafletCompletedRoute',
    `${SOURCE}; return updateRealMapAircraft;`,
  );
  const update = factory(
    deps.realMapState,
    deps.state,
    deps.unprojectGeo,
    deps.updateRealMapCoordinateReadout,
    deps.currentEvent,
    deps.updateGoogleAircraftMarker,
    deps.updateGoogleCompletedRoute,
    deps.followRealMapAircraft,
    deps.updateLeafletAircraftMarker,
    deps.updateLeafletCompletedRoute,
  );

  return { calls, realMapState, state, update };
}

test('updateRealMapAircraft mantém identidade estrutural congelada antes da extração', () => {
  assert.equal(Buffer.byteLength(SOURCE), 842);
  assert.equal(
    crypto.createHash('sha256').update(SOURCE).digest('hex'),
    'dd8b4660db04490cee36a8d8754a0026f936cd0859e1737c5c033eb0547520dc',
  );
});

test('dispatch não produz efeitos sem mapa pronto, plano carregado ou frame', () => {
  const notReady = createHarness({ realMapState: { ready: false } });
  notReady.update({ x: 10, y: 20 });
  assert.deepEqual(notReady.calls, []);

  const noPlan = createHarness({ state: { parsed: null, geo: { eventRoutes: [] }, index: 0 } });
  noPlan.update({ x: 10, y: 20 });
  assert.deepEqual(noPlan.calls, []);

  const noFrame = createHarness();
  noFrame.update(null);
  assert.deepEqual(noFrame.calls, []);
});

test('engine vector atualiza somente a leitura de coordenadas e encerra o dispatch', () => {
  const harness = createHarness({ realMapState: { engine: 'vector' } });
  harness.update({ x: 320, y: 180, heading: 91, progress: 0.4 });
  assert.deepEqual(harness.calls, [
    ['unproject', 320, 180],
    ['readout', -15.5, -47.8],
  ]);
});

test('engine google preserva marcador, rota concluída e follow nessa ordem', () => {
  const harness = createHarness({ realMapState: { engine: 'google' } });
  harness.update({ x: 100, y: 200, heading: 73, progress: 0.65 });
  assert.deepEqual(harness.calls, [
    ['unproject', 100, 200],
    ['googleMarker', -15.5, -47.8, 73, 'EVT123'],
    ['googleCompleted'],
    ['follow', -15.5, -47.8],
  ]);
});

test('callsign usa evento, depois meta do plano e por fim ACFT', () => {
  const fromEvent = createHarness({ realMapState: { engine: 'google' } });
  fromEvent.update({ x: 1, y: 2 });
  assert.equal(fromEvent.calls.find(call => call[0] === 'googleMarker')[4], 'EVT123');

  const fromMeta = createHarness({ realMapState: { engine: 'google' }, currentEvent: null });
  fromMeta.update({ x: 1, y: 2 });
  assert.equal(fromMeta.calls.find(call => call[0] === 'googleMarker')[4], 'META123');

  const fallback = createHarness({
    realMapState: { engine: 'google' },
    currentEvent: null,
    state: { parsed: { meta: { callsign: '' } }, geo: { eventRoutes: [] }, index: 0 },
  });
  fallback.update({ x: 1, y: 2 });
  assert.equal(fallback.calls.find(call => call[0] === 'googleMarker')[4], 'ACFT');
});

test('google preserva fallback de heading para zero', () => {
  const harness = createHarness({ realMapState: { engine: 'google' } });
  harness.update({ x: 50, y: 60, heading: null });
  assert.deepEqual(harness.calls.find(call => call[0] === 'googleMarker').slice(1), [-15.5, -47.8, 0, 'EVT123']);
});

test('leaflet atualiza marcador, trecho concluído e follow preservando rota e progresso', () => {
  const harness = createHarness({ realMapState: { engine: 'leaflet' } });
  harness.update({ x: 700, y: 400, heading: 182, progress: 0.42 });
  assert.deepEqual(harness.calls, [
    ['unproject', 700, 400],
    ['leafletMarker', -15.5, -47.8, 182, 'EVT123'],
    ['leafletCompleted', ['A', 'B', 'C'], 0.42],
    ['follow', -15.5, -47.8],
  ]);
});

test('leaflet omite atualização da rota quando o evento não tem geometria e mantém follow', () => {
  const harness = createHarness({
    realMapState: { engine: 'leaflet' },
    state: { parsed: { meta: { callsign: 'META123' } }, geo: { eventRoutes: [] }, index: 4 },
  });
  harness.update({ x: 30, y: 40, heading: 15, progress: 0.7 });
  assert.deepEqual(harness.calls, [
    ['unproject', 30, 40],
    ['leafletMarker', -15.5, -47.8, 15, 'EVT123'],
    ['follow', -15.5, -47.8],
  ]);
});

test('leaflet preserva fallback de heading e progress para zero', () => {
  const harness = createHarness({ realMapState: { engine: 'leaflet' } });
  harness.update({ x: 9, y: 8, heading: undefined, progress: undefined });
  assert.deepEqual(harness.calls.find(call => call[0] === 'leafletMarker').slice(1), [-15.5, -47.8, 0, 'EVT123']);
  assert.deepEqual(harness.calls.find(call => call[0] === 'leafletCompleted').slice(1), [['A', 'B', 'C'], 0]);
});
