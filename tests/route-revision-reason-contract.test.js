'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const HTML = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const MODULE_PATH = path.join(ROOT, 'src', 'route', 'route-revision-reason.js');
const SOURCE = fs.readFileSync(MODULE_PATH, 'utf8');

function loadModule() {
  delete require.cache[require.resolve(MODULE_PATH)];
  return require(MODULE_PATH);
}

test('módulo publica fábrica mínima e congelada', () => {
  const Module = loadModule();
  assert.equal(Object.isFrozen(Module), true);
  assert.deepEqual(Object.keys(Module), ['create']);

  const api = Module.create({ shortMessageType: value => String(value) });
  assert.equal(Object.isFrozen(api), true);
  assert.deepEqual(Object.keys(api), ['routeRevisionReason']);
  assert.equal(typeof api.routeRevisionReason, 'function');
});

test('fábrica exige shortMessageType', () => {
  const Module = loadModule();
  assert.throws(() => Module.create(), /requer shortMessageType/);
  assert.throws(() => Module.create({ shortMessageType: 'CHG' }), /requer shortMessageType/);
});

test('routeRevisionReason preserva rótulos, ordem e deduplicação atuais', () => {
  const calls = [];
  const { routeRevisionReason } = loadModule().create({
    shortMessageType(value) {
      calls.push(value);
      return `TIPO:${value}`;
    },
  });

  const event = {
    messageType: 'CHG',
    changes: [
      { key: 'route' },
      { key: 'sid' },
      { key: 'route' },
      { key: 'unknown' },
      { key: 'runwayArrival' },
      { key: 'cfl' },
    ],
  };

  assert.equal(
    routeRevisionReason(event),
    'TIPO:CHG · ROTA / SID / PISTA ARR / CFL'
  );
  assert.deepEqual(calls, ['CHG']);
});

test('destinationChanged inclui ADES sem duplicar nem reordenar ADES já existente', () => {
  const { routeRevisionReason } = loadModule().create({
    shortMessageType: value => String(value),
  });

  assert.equal(
    routeRevisionReason({ operation: 'INFARC', changes: [{ key: 'route' }] }, true),
    'INFARC · ADES / ROTA'
  );

  assert.equal(
    routeRevisionReason({
      operation: 'INFARC',
      changes: [{ key: 'route' }, { key: 'ades' }, { key: 'star' }],
    }, true),
    'INFARC · ROTA / ADES / STAR'
  );
});

test('tipo preserva precedência messageType → operation → ATUALIZAÇÃO', () => {
  const seen = [];
  const { routeRevisionReason } = loadModule().create({
    shortMessageType(value) {
      seen.push(value);
      return `<${value}>`;
    },
  });

  assert.equal(routeRevisionReason({ messageType: 'CRQ', operation: 'IGNORAR', changes: [] }), '<CRQ>');
  assert.equal(routeRevisionReason({ messageType: '', operation: 'OPERAÇÃO', changes: [] }), '<OPERAÇÃO>');
  assert.equal(routeRevisionReason({ changes: [] }), '<ATUALIZAÇÃO>');
  assert.deepEqual(seen, ['CRQ', 'OPERAÇÃO', 'ATUALIZAÇÃO']);
});

test('routeRevisionReason não altera evento nem changes', () => {
  const { routeRevisionReason } = loadModule().create({
    shortMessageType: value => String(value),
  });
  const event = {
    messageType: 'CHG',
    changes: [
      { key: 'route', before: 'DCT', after: 'UL304' },
      { key: 'ades', before: 'SBBR', after: 'SBGR' },
    ],
  };
  const before = JSON.parse(JSON.stringify(event));

  routeRevisionReason(event, true);

  assert.deepEqual(event, before);
});

test('módulo permanece desacoplado de estado, DOM, storage, mapa e movimento', () => {
  for (const forbidden of [
    'state.', 'els.', 'document.', 'window.', 'localStorage', 'sessionStorage',
    'indexedDB', 'fetch(', 'goTo(', 'renderCurrent(', 'planMotionTransition',
    'snapMotionTo(', 'startMotionLoop(', 'google.', 'L.', 'realMapState',
    'requestAnimationFrame(', 'addEventListener', 'querySelector',
  ]) assert.equal(SOURCE.includes(forbidden), false, `acoplamento inesperado: ${forbidden}`);
});

test('index carrega módulo antes do kernel e mantém wiring explícito', () => {
  const tag = '<script id="flightflow-route-revision-reason" src="src/route/route-revision-reason.js"></script>';
  const tagIndex = HTML.indexOf(tag);
  const kernelIndex = HTML.indexOf('const Parser = window.FlightParser;');
  const coreUtilsIndex = HTML.indexOf('const { shortMessageType, displayValue, cleanDisplay');
  const wiringIndex = HTML.indexOf('const RouteRevisionReason = window.FlightFlowRouteRevisionReason;');
  const consumerIndex = HTML.indexOf('message:routeRevisionReason(e,destinationChanged)');

  assert.notEqual(tagIndex, -1, 'módulo deve estar referenciado');
  assert.ok(tagIndex < kernelIndex, 'módulo deve carregar antes do IIFE principal');
  assert.ok(coreUtilsIndex >= 0 && wiringIndex > coreUtilsIndex, 'wiring deve ocorrer após shortMessageType existir');
  assert.ok(consumerIndex > wiringIndex, 'módulo deve estar inicializado antes do consumidor');

  for (const token of [
    'const RouteRevisionReason = window.FlightFlowRouteRevisionReason;',
    "if (!RouteRevisionReason) throw new Error('FlightFlowRouteRevisionReason não foi carregado.');",
    'const { routeRevisionReason } = RouteRevisionReason.create({ shortMessageType });',
  ]) assert.ok(HTML.includes(token), `wiring ausente: ${token}`);

  assert.equal(HTML.includes('function routeRevisionReason('), false, 'implementação inline não pode voltar');
  assert.equal((HTML.match(/(?<![\w$.])routeRevisionReason\s*\(/g) || []).length, 1);
  assert.ok(HTML.includes('message:routeRevisionReason(e,destinationChanged)'));
});
