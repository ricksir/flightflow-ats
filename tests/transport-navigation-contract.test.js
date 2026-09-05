'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = path.resolve(__dirname, '..');
const HTML = path.join(ROOT, 'index.html');
const MODULE = path.join(ROOT, 'src', 'timeline', 'transport-navigation-controller.js');
const REFERENCE = '<script id="flightflow-transport-navigation-controller" src="src/timeline/transport-navigation-controller.js"></script>';
const MODULE_BYTES = 1709;
const MODULE_SHA256 = '4066ee3a415382488f1f0419df2099a7c25ff6853e2374e3669a8d68c5c0c1a9';
const OPERATIONS = ['restartTransport', 'previousTransport', 'nextTransport', 'scrubTransport'];

function moduleSource() {
  return fs.readFileSync(MODULE, 'utf8');
}

function loadModule() {
  delete require.cache[require.resolve(MODULE)];
  return require(MODULE);
}

function harness(overrides = {}) {
  const Controller = loadModule();
  const state = Object.assign({ index: 3 }, overrides.state || {});
  let scrubber = overrides.scrubber || { value: '5' };
  const calls = [];
  const api = Controller.create({
    state,
    getScrubber: overrides.getScrubber || (() => scrubber),
    stopPlayback: () => calls.push(['stopPlayback']),
    snapMotionTo: value => calls.push(['snapMotionTo', value]),
    goTo: (...args) => calls.push(['goTo', ...args]),
  });
  return { Controller, state, api, calls, setScrubber: value => { scrubber = value; } };
}

function occurrences(text, needle) {
  return text.split(needle).length - 1;
}

test('módulo de transporte mantém identidade estrutural e API mínima', () => {
  const source = moduleSource();
  assert.equal(Buffer.byteLength(source, 'utf8'), MODULE_BYTES);
  assert.equal(crypto.createHash('sha256').update(source).digest('hex'), MODULE_SHA256);
  assert.ok(source.startsWith('(function (root, factory) {'));
  assert.ok(source.includes('root.FlightFlowTransportNavigationController = api;'));
  const Controller = loadModule();
  assert.equal(Object.isFrozen(Controller), true);
  assert.deepEqual(Object.keys(Controller), ['create']);
});

test('fábrica exige apenas dependências explícitas da fronteira', () => {
  const Controller = loadModule();
  assert.throws(() => Controller.create(), /requer state/);
  assert.throws(() => Controller.create({ state: {} }), /requer getScrubber/);
  assert.throws(() => Controller.create({ state: {}, getScrubber() {} }), /requer stopPlayback/);
  assert.throws(() => Controller.create({ state: {}, getScrubber() {}, stopPlayback() {} }), /requer snapMotionTo/);
  assert.throws(() => Controller.create({ state: {}, getScrubber() {}, stopPlayback() {}, snapMotionTo() {} }), /requer goTo/);
});

test('instância é congelada e expõe somente quatro operações', () => {
  const h = harness();
  assert.equal(Object.isFrozen(h.api), true);
  assert.deepEqual(Object.keys(h.api), OPERATIONS);
  for (const name of OPERATIONS) assert.equal(typeof h.api[name], 'function');
});

test('Restart preserva stopPlayback → snapMotionTo(0) → goTo(0, silent)', () => {
  const h = harness();
  h.api.restartTransport();
  assert.deepEqual(h.calls, [
    ['stopPlayback'],
    ['snapMotionTo', 0],
    ['goTo', 0, { silent: true }],
  ]);
});

test('Anterior e Próximo usam o índice vivo do state e param playback primeiro', () => {
  const previous = harness({ state: { index: 8 } });
  previous.api.previousTransport();
  assert.deepEqual(previous.calls, [['stopPlayback'], ['goTo', 7]]);

  const next = harness({ state: { index: 8 } });
  next.api.nextTransport();
  assert.deepEqual(next.calls, [['stopPlayback'], ['goTo', 9]]);
});

test('scrubber é resolvido tardiamente e convertido para número no momento do input', () => {
  let liveScrubber = null;
  const h = harness({ getScrubber: () => liveScrubber });
  liveScrubber = { value: '12' };
  h.api.scrubTransport();
  assert.deepEqual(h.calls, [['stopPlayback'], ['goTo', 12]]);
});

test('módulo permanece desacoplado de rota, mapa, aeronave, storage e parser', () => {
  const source = moduleSource();
  for (const token of [
    'FlightFlowRouteProcessedV7412', 'transitionPlanForEvents', 'transitionDurations',
    'realMapState', 'google.', 'L.', 'aircraft', 'plane', 'localStorage', 'indexedDB', 'FlightParser'
  ]) assert.equal(source.includes(token), false, `acoplamento proibido: ${token}`);
});

test('index carrega o controlador antes do núcleo e bindings delegam diretamente ao módulo', () => {
  const html = fs.readFileSync(HTML, 'utf8');
  assert.equal(occurrences(html, REFERENCE), 1, 'referência externa deve ser única');
  const referenceIndex = html.indexOf(REFERENCE);
  const anchorIndex = html.indexOf('window.__FlightFlowFirBridge = Object.freeze({');
  const mainScriptStart = html.lastIndexOf('<script', anchorIndex);
  assert.ok(referenceIndex >= 0 && referenceIndex < mainScriptStart, 'controlador deve carregar antes do IIFE principal');

  for (const token of [
    'const TransportNavigationController = window.FlightFlowTransportNavigationController;',
    "if (!TransportNavigationController) throw new Error('FlightFlowTransportNavigationController não foi carregado.');",
    'const { restartTransport, previousTransport, nextTransport, scrubTransport } = TransportNavigationController.create({',
    'getScrubber: () => els.scrubber,',
    'stopPlayback: () => stopPlayback(),',
    'snapMotionTo: progress => snapMotionTo(progress),',
    'goTo: (index, options) => goTo(index, options),',
    "els.restartBtn.addEventListener('click', restartTransport);",
    "els.prevBtn.addEventListener('click', previousTransport);",
    "els.nextBtn.addEventListener('click', nextTransport);",
    "els.scrubber.addEventListener('input', scrubTransport);",
    "els.playBtn.addEventListener('click', togglePlayback);",
  ]) assert.ok(html.includes(token), `integração ausente: ${token}`);

  for (const legacy of [
    "els.restartBtn.addEventListener('click', () => { stopPlayback(); snapMotionTo(0); goTo(0, { silent: true }); });",
    "els.prevBtn.addEventListener('click', () => { stopPlayback(); goTo(state.index - 1); });",
    "els.nextBtn.addEventListener('click', () => { stopPlayback(); goTo(state.index + 1); });",
    "els.scrubber.addEventListener('input', () => { stopPlayback(); goTo(Number(els.scrubber.value)); });",
  ]) assert.equal(html.includes(legacy), false, `binding inline deve ter sido removido: ${legacy}`);
});
