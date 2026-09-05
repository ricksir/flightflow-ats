'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = path.resolve(__dirname, '..');
const HTML = path.join(ROOT, 'index.html');
const MODULE = path.join(ROOT, 'src', 'timeline', 'keyboard-navigation-controller.js');
const REFERENCE = '<script id="flightflow-keyboard-navigation-controller" src="src/timeline/keyboard-navigation-controller.js"></script>';
const MODULE_BYTES = 2755;
const MODULE_SHA256 = '27def372414b3b4e113649717c127994cb8f11d338fc111d448c7901cefbe0ab';
const DOCUMENT_BINDING = "document.addEventListener('keydown', handleKeyboard);";

function moduleSource() {
  return fs.readFileSync(MODULE, 'utf8');
}

function htmlSource() {
  return fs.readFileSync(HTML, 'utf8');
}

function loadModule() {
  delete require.cache[require.resolve(MODULE)];
  return require(MODULE);
}

function harness(overrides = {}) {
  const KeyboardController = loadModule();
  const state = Object.assign({
    parsed: { events: [{}, {}, {}, {}, {}] },
    index: 2,
  }, overrides.state || {});
  const calls = [];
  const api = KeyboardController.create({
    state,
    isTargetEditable: overrides.isTargetEditable || (() => false),
    hasOpenDialog: overrides.hasOpenDialog || (() => false),
    togglePlayback: () => calls.push(['togglePlayback']),
    stopPlayback: () => calls.push(['stopPlayback']),
    goTo: (...args) => calls.push(['goTo', ...args]),
    showExactMessage: () => calls.push(['showExactMessage']),
    toggleFpv: () => calls.push(['toggleFpv']),
    toggleStrip: () => calls.push(['toggleStrip']),
  });
  return { KeyboardController, state, calls, api };
}

function keyboardEvent({ key = '', code = '', target = {}, ...rest } = {}) {
  let prevented = false;
  return {
    key,
    code,
    target,
    preventDefault() { prevented = true; },
    wasPrevented() { return prevented; },
    ...rest,
  };
}

test('módulo de teclado mantém identidade estrutural e API pública mínima', () => {
  const source = moduleSource();
  assert.equal(Buffer.byteLength(source, 'utf8'), MODULE_BYTES);
  assert.equal(crypto.createHash('sha256').update(source).digest('hex'), MODULE_SHA256);
  assert.ok(source.startsWith('(function (root, factory) {'));
  assert.ok(source.includes('root.FlightFlowKeyboardNavigationController = api;'));
  assert.ok(source.includes('function handleKeyboard(event) {'));
  const KeyboardController = loadModule();
  assert.equal(Object.isFrozen(KeyboardController), true);
  assert.deepEqual(Object.keys(KeyboardController), ['create']);
});

test('fábrica exige somente as dependências explícitas da fronteira', () => {
  const api = loadModule();
  assert.throws(() => api.create(), /requer state/);
  assert.throws(() => api.create({ state: {} }), /requer isTargetEditable/);
  assert.throws(() => api.create({ state: {}, isTargetEditable() {} }), /requer hasOpenDialog/);
  assert.throws(() => api.create({ state: {}, isTargetEditable() {}, hasOpenDialog() {} }), /requer togglePlayback/);
  assert.throws(() => api.create({ state: {}, isTargetEditable() {}, hasOpenDialog() {}, togglePlayback() {} }), /requer stopPlayback/);
  assert.throws(() => api.create({ state: {}, isTargetEditable() {}, hasOpenDialog() {}, togglePlayback() {}, stopPlayback() {} }), /requer goTo/);
  assert.throws(() => api.create({ state: {}, isTargetEditable() {}, hasOpenDialog() {}, togglePlayback() {}, stopPlayback() {}, goTo() {} }), /requer showExactMessage/);
  assert.throws(() => api.create({ state: {}, isTargetEditable() {}, hasOpenDialog() {}, togglePlayback() {}, stopPlayback() {}, goTo() {}, showExactMessage() {} }), /requer toggleFpv/);
  assert.throws(() => api.create({ state: {}, isTargetEditable() {}, hasOpenDialog() {}, togglePlayback() {}, stopPlayback() {}, goTo() {}, showExactMessage() {}, toggleFpv() {} }), /requer toggleStrip/);
});

test('instância é congelada e expõe somente handleKeyboard', () => {
  const h = harness();
  assert.equal(Object.isFrozen(h.api), true);
  assert.deepEqual(Object.keys(h.api), ['handleKeyboard']);
  assert.equal(typeof h.api.handleKeyboard, 'function');
});

test('campo editável e dialog aberto bloqueiam tudo antes de consultar atalhos', () => {
  const editable = harness({ isTargetEditable: () => true });
  const e1 = keyboardEvent({ key: 'ArrowRight' });
  editable.api.handleKeyboard(e1);
  assert.deepEqual(editable.calls, []);
  assert.equal(e1.wasPrevented(), false);

  const dialog = harness({ hasOpenDialog: () => true });
  const e2 = keyboardEvent({ key: 'ArrowRight' });
  dialog.api.handleKeyboard(e2);
  assert.deepEqual(dialog.calls, []);
  assert.equal(e2.wasPrevented(), false);
});

test('sem histórico carregado nenhum atalho executa ação', () => {
  const h = harness({ state: { parsed: null } });
  const event = keyboardEvent({ code: 'Space', key: ' ' });
  h.api.handleKeyboard(event);
  assert.deepEqual(h.calls, []);
  assert.equal(event.wasPrevented(), false);
});

test('Space previne default e delega somente ao playback', () => {
  const h = harness();
  const event = keyboardEvent({ code: 'Space', key: ' ' });
  h.api.handleKeyboard(event);
  assert.equal(event.wasPrevented(), true);
  assert.deepEqual(h.calls, [['togglePlayback']]);
});

test('ArrowLeft e ArrowRight interrompem playback antes de navegar relativamente', () => {
  const left = harness({ state: { index: 3 } });
  const leftEvent = keyboardEvent({ key: 'ArrowLeft' });
  left.api.handleKeyboard(leftEvent);
  assert.equal(leftEvent.wasPrevented(), true);
  assert.deepEqual(left.calls, [['stopPlayback'], ['goTo', 2]]);

  const right = harness({ state: { index: 3 } });
  const rightEvent = keyboardEvent({ key: 'ArrowRight' });
  right.api.handleKeyboard(rightEvent);
  assert.equal(rightEvent.wasPrevented(), true);
  assert.deepEqual(right.calls, [['stopPlayback'], ['goTo', 4]]);
});

test('Home e End interrompem playback e preservam os limites atuais', () => {
  const home = harness();
  home.api.handleKeyboard(keyboardEvent({ key: 'Home' }));
  assert.deepEqual(home.calls, [['stopPlayback'], ['goTo', 0]]);

  const end = harness();
  end.api.handleKeyboard(keyboardEvent({ key: 'End' }));
  assert.deepEqual(end.calls, [['stopPlayback'], ['goTo', 4]]);
});

test('M, F e S preservam exatamente suas ações atuais', () => {
  const message = harness();
  message.api.handleKeyboard(keyboardEvent({ key: 'M' }));
  assert.deepEqual(message.calls, [['showExactMessage']]);

  const fpv = harness();
  fpv.api.handleKeyboard(keyboardEvent({ key: 'F' }));
  assert.deepEqual(fpv.calls, [['toggleFpv']]);

  const strip = harness();
  strip.api.handleKeyboard(keyboardEvent({ key: 'S' }));
  assert.deepEqual(strip.calls, [['toggleStrip']]);
});

test('Ctrl+ArrowRight continua navegando porque modificadores não são filtrados', () => {
  const h = harness({ state: { index: 1 } });
  const event = keyboardEvent({ key: 'ArrowRight', ctrlKey: true });
  h.api.handleKeyboard(event);
  assert.equal(event.wasPrevented(), true);
  assert.deepEqual(h.calls, [['stopPlayback'], ['goTo', 2]]);
  for (const absent of ['ctrlKey', 'metaKey', 'altKey', 'defaultPrevented']) {
    assert.equal(moduleSource().includes(absent), false, `módulo não deve introduzir filtro silencioso para ${absent}`);
  }
});

test('módulo permanece desacoplado de document, rota, mapa, aeronave, storage e parser', () => {
  const source = moduleSource();
  for (const forbidden of [
    'document.', 'querySelector', 'FlightFlowRouteProcessedV7412', 'transitionPlanForEvents', 'transitionDurations',
    'realMapState', 'google.', 'L.', 'aircraft', 'plane', 'localStorage', 'sessionStorage', 'indexedDB',
    'FlightParser', 'Parser.'
  ]) assert.equal(source.includes(forbidden), false, `acoplamento proibido: ${forbidden}`);
});

test('index carrega controlador antes do núcleo, injeta guardas atuais e mantém binding global único', () => {
  const html = htmlSource();
  assert.equal(html.split(REFERENCE).length - 1, 1, 'referência externa deve ser única');
  assert.equal(html.split(DOCUMENT_BINDING).length - 1, 1, 'binding global deve permanecer único');
  const referenceIndex = html.indexOf(REFERENCE);
  const anchorIndex = html.indexOf('window.__FlightFlowFirBridge = Object.freeze({');
  const mainScriptStart = html.lastIndexOf('<script', anchorIndex);
  assert.ok(referenceIndex >= 0 && referenceIndex < mainScriptStart, 'controlador deve carregar antes do IIFE principal');

  for (const token of [
    'const KeyboardNavigationController = window.FlightFlowKeyboardNavigationController;',
    "if (!KeyboardNavigationController) throw new Error('FlightFlowKeyboardNavigationController não foi carregado.');",
    'const { handleKeyboard } = KeyboardNavigationController.create({',
    `isTargetEditable: target => target.matches('input, textarea, select, [contenteditable="true"]'),`,
    `hasOpenDialog: () => Boolean(document.querySelector('dialog[open]')),`,
    'togglePlayback: () => togglePlayback(),',
    'stopPlayback: () => stopPlayback(),',
    'goTo: (index, options) => goTo(index, options),',
    'showExactMessage: () => showExactMessage(),',
    'toggleFpv: () => toggleFpv(),',
    'toggleStrip: () => toggleStrip(),',
  ]) assert.ok(html.includes(token), `integração ausente: ${token}`);

  const anchor = html.indexOf('window.__FlightFlowFirBridge = Object.freeze({');
  const start = html.lastIndexOf('<script', anchor);
  const bodyStart = html.indexOf('>', start) + 1;
  const bodyEnd = html.indexOf('</script>', anchor);
  const kernel = html.slice(bodyStart, bodyEnd);
  assert.doesNotMatch(kernel, /function\s+handleKeyboard\s*\(/, 'handleKeyboard não deve continuar inline');
});
