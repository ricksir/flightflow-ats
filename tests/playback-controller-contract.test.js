const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = path.resolve(__dirname, '..');
const HTML = path.join(ROOT, 'index.html');
const MODULE = path.join(ROOT, 'src', 'timeline', 'playback-controller.js');
const ANCHOR = 'window.__FlightFlowFirBridge = Object.freeze({';
const REFERENCE = '<script id="flightflow-playback-controller" src="src/timeline/playback-controller.js"></script>';
const MODULE_BYTES = 2426;
const MODULE_SHA256 = 'fbb16dca96619407c8f41df7bd08ccdf1f1a1e13b81be035b662ab55310d1c41';
const PLAYBACK_FUNCTIONS = ['startPlayback', 'stopPlayback', 'togglePlayback', 'scheduleNext'];

function moduleSource() {
  return fs.readFileSync(MODULE, 'utf8');
}

function kernelSource() {
  const html = fs.readFileSync(HTML, 'utf8');
  const anchorIndex = html.indexOf(ANCHOR);
  assert.ok(anchorIndex >= 0, 'núcleo principal deve manter a ponte FIR usada como âncora');
  const scriptStart = html.lastIndexOf('<script', anchorIndex);
  const bodyStart = html.indexOf('>', scriptStart) + 1;
  const bodyEnd = html.indexOf('</script>', anchorIndex);
  assert.ok(scriptStart >= 0 && bodyStart > scriptStart && bodyEnd > bodyStart);
  return html.slice(bodyStart, bodyEnd);
}

function loadModule() {
  delete require.cache[require.resolve(MODULE)];
  return require(MODULE);
}

function controllerHarness(overrides = {}) {
  const PlaybackController = loadModule();
  const state = Object.assign({
    parsed: { events: [
      { messageType: 'CPL', changes: [] },
      { messageType: 'DEP', changes: [] },
      { messageType: 'EST', changes: [] },
    ] },
    index: 0,
    playing: false,
    timer: null,
    config: { baseIntervalMs: 1000 },
    speed: 1,
  }, overrides.state || {});
  const playBtn = overrides.playBtn || { textContent: '▶', title: 'Reproduzir (Espaço)' };
  const calls = { goTo: [], clearTimeout: [], setTimeout: [] };
  const timers = [];
  const clearTimeout = id => calls.clearTimeout.push(id);
  const setTimeout = (fn, delay) => {
    const id = { fn, delay, ordinal: timers.length + 1 };
    timers.push(id);
    calls.setTimeout.push({ delay });
    return id;
  };
  const goTo = (...args) => {
    calls.goTo.push(args);
    const next = Number(args[0]);
    if (Number.isFinite(next)) state.index = Math.max(0, Math.min(state.parsed.events.length - 1, next));
  };
  const currentEvent = () => state.parsed?.events?.[state.index] || null;
  const api = PlaybackController.create({ state, playBtn, currentEvent, goTo, setTimeout, clearTimeout });
  return { PlaybackController, state, playBtn, calls, timers, api };
}

test('módulo playback mantém identidade estrutural e API pública mínima', () => {
  const source = moduleSource();
  assert.equal(Buffer.byteLength(source, 'utf8'), MODULE_BYTES);
  assert.equal(crypto.createHash('sha256').update(source).digest('hex'), MODULE_SHA256);
  assert.ok(source.startsWith('(function (root, factory) {'));
  assert.ok(source.includes('root.FlightFlowPlaybackController = api;'));
  assert.ok(source.includes('const create = (options = {}) => {'));
  assert.ok(source.endsWith('});\n'));

  const api = loadModule();
  assert.equal(Object.isFrozen(api), true);
  assert.deepEqual(Object.keys(api), ['create']);
  assert.equal(typeof api.create, 'function');
});

test('index carrega playback antes do IIFE e o núcleo instancia dependências explícitas', () => {
  const html = fs.readFileSync(HTML, 'utf8');
  assert.equal(html.split(REFERENCE).length - 1, 1, 'referência do playback deve ser única');
  const referenceIndex = html.indexOf(REFERENCE);
  const anchorIndex = html.indexOf(ANCHOR);
  const mainScriptStart = html.lastIndexOf('<script', anchorIndex);
  assert.ok(referenceIndex >= 0 && referenceIndex < mainScriptStart, 'playback deve carregar antes do IIFE principal');

  const kernel = kernelSource();
  for (const token of [
    'const PlaybackController = window.FlightFlowPlaybackController;',
    "if (!PlaybackController) throw new Error('FlightFlowPlaybackController não foi carregado.');",
    'const { startPlayback, stopPlayback, togglePlayback, scheduleNext } = PlaybackController.create({',
    'playBtn: els.playBtn,',
    'currentEvent: () => currentEvent(),',
    'goTo: (index, options) => goTo(index, options),',
    'setTimeout: (fn, delay) => window.setTimeout(fn, delay),',
    'clearTimeout: timer => window.clearTimeout(timer),'
  ]) assert.ok(kernel.includes(token), `integração ausente: ${token}`);

  for (const name of PLAYBACK_FUNCTIONS) {
    assert.doesNotMatch(kernel, new RegExp(`function\\s+${name}\\s*\\(`), `${name} não deve continuar inline`);
    assert.match(moduleSource(), new RegExp(`function\\s+${name}\\s*\\(`), `${name} deve existir no módulo`);
  }
});

test('módulo playback não importa rota, mapa, aeronave, storage ou parser', () => {
  const source = moduleSource();
  for (const token of [
    'FlightFlowRouteProcessedV7412', 'transitionPlanForEvents', 'transitionDurations',
    'realMapState', 'google.', 'L.', 'aircraft', 'plane', 'motion',
    'localStorage', 'sessionStorage', 'indexedDB', 'FlightParser', 'Parser.'
  ]) assert.ok(!source.includes(token), `playback não deve depender diretamente de ${token}`);
});

test('fábrica exige somente as dependências explícitas necessárias', () => {
  const api = loadModule();
  assert.throws(() => api.create(), /requer state/);
  assert.throws(() => api.create({ state: {} }), /requer currentEvent/);
  assert.throws(() => api.create({ state: {}, currentEvent() {} }), /requer goTo/);
  assert.throws(() => api.create({ state: {}, currentEvent() {}, goTo() {} }), /requer timers explícitos/);
});

test('instância criada é congelada e expõe somente quatro operações', () => {
  const h = controllerHarness();
  assert.equal(Object.isFrozen(h.api), true);
  assert.deepEqual(Object.keys(h.api), PLAYBACK_FUNCTIONS);
  for (const name of PLAYBACK_FUNCTIONS) assert.equal(typeof h.api[name], 'function');
});

test('startPlayback no último evento reinicia silenciosamente no primeiro antes de reproduzir', () => {
  const h = controllerHarness({ state: { index: 2 } });
  h.api.startPlayback();
  assert.deepEqual(h.calls.goTo, [[0, { silent: true }]]);
  assert.equal(h.state.index, 0);
  assert.equal(h.state.playing, true);
  assert.equal(h.playBtn.textContent, 'Ⅱ');
  assert.equal(h.playBtn.title, 'Pausar (Espaço)');
  assert.equal(h.timers.length, 1);
});

test('startPlayback sem histórico não altera estado nem agenda timer', () => {
  const h = controllerHarness({ state: { parsed: null, playing: false } });
  h.api.startPlayback();
  assert.equal(h.state.playing, false);
  assert.equal(h.timers.length, 0);
  assert.deepEqual(h.calls.goTo, []);
});

test('stopPlayback cancela timer, limpa referência e restaura botão', () => {
  const h = controllerHarness({ state: { playing: true, timer: { id: 7 } } });
  const previousTimer = h.state.timer;
  h.api.stopPlayback();
  assert.equal(h.state.playing, false);
  assert.deepEqual(h.calls.clearTimeout, [previousTimer]);
  assert.equal(h.state.timer, null);
  assert.equal(h.playBtn.textContent, '▶');
  assert.equal(h.playBtn.title, 'Reproduzir (Espaço)');
});

test('togglePlayback alterna exclusivamente entre iniciar e parar', () => {
  const h = controllerHarness();
  h.api.togglePlayback();
  assert.equal(h.state.playing, true);
  assert.equal(h.timers.length, 1);
  h.api.togglePlayback();
  assert.equal(h.state.playing, false);
  assert.equal(h.state.timer, null);
});

test('scheduleNext respeita velocidade, ênfase ATS e piso de 350 ms', () => {
  const normal = controllerHarness({ state: { playing: true, index: 0, config: { baseIntervalMs: 1000 }, speed: 2 } });
  normal.api.scheduleNext();
  assert.equal(normal.timers[0].delay, 500);

  const emphasized = controllerHarness({ state: { playing: true, index: 1, config: { baseIntervalMs: 1000 }, speed: 2 } });
  emphasized.api.scheduleNext();
  assert.equal(emphasized.timers[0].delay, 625);

  const floored = controllerHarness({ state: { playing: true, index: 0, config: { baseIntervalMs: 200 }, speed: 4 } });
  floored.api.scheduleNext();
  assert.equal(floored.timers[0].delay, 350);
});

test('scheduleNext avança exatamente um evento e agenda novamente', () => {
  const h = controllerHarness({ state: { playing: true, index: 0 } });
  h.api.scheduleNext();
  h.timers[0].fn();
  assert.equal(h.state.index, 1);
  assert.deepEqual(h.calls.goTo, [[1]]);
  assert.equal(h.timers.length, 2);
});

test('scheduleNext encerra no último evento sem ultrapassar o limite', () => {
  const h = controllerHarness({ state: { playing: true, index: 2 } });
  h.api.scheduleNext();
  h.timers[0].fn();
  assert.equal(h.state.index, 2);
  assert.deepEqual(h.calls.goTo, []);
  assert.equal(h.state.playing, false);
  assert.equal(h.state.timer, null);
  assert.equal(h.playBtn.title, 'Reproduzir (Espaço)');
});
