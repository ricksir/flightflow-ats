const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = path.resolve(__dirname, '..');
const HTML = path.join(ROOT, 'index.html');
const ANCHOR = 'window.__FlightFlowFirBridge = Object.freeze({';

const EXPECTED = Object.freeze({
  startPlayback: { bytes: 272, sha256: 'e27c3e1eee3c48b1bf731709ff24ef71ff93f42a5886064b0f72b579c8178cd4' },
  stopPlayback: { bytes: 255, sha256: '41165a7fd8d9bbde9ca2d253bfe01b678e538e6e07e51e9c3057b61e3c9072ab' },
  togglePlayback: { bytes: 118, sha256: '528472ed19d86105a0c455b091b27ed5c94496e9203b7b1e5650442ae0b7f511' },
  scheduleNext: { bytes: 589, sha256: 'c80be2e78585bba2901431681caef02c88aa77fc2b1090bac744e6738f9736f6' },
});

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

function scanBalanced(source, openIndex, openChar, closeChar) {
  let depth = 0;
  let mode = 'code';
  let quote = '';
  let escape = false;
  for (let i = openIndex; i < source.length; i += 1) {
    const c = source[i];
    const next = source[i + 1] || '';
    if (mode === 'line-comment') { if (c === '\n') mode = 'code'; continue; }
    if (mode === 'block-comment') { if (c === '*' && next === '/') { mode = 'code'; i += 1; } continue; }
    if (mode === 'string') { if (escape) escape = false; else if (c === '\\') escape = true; else if (c === quote) mode = 'code'; continue; }
    if (mode === 'template') { if (escape) escape = false; else if (c === '\\') escape = true; else if (c === '`') mode = 'code'; continue; }
    if (c === '/' && next === '/') { mode = 'line-comment'; i += 1; continue; }
    if (c === '/' && next === '*') { mode = 'block-comment'; i += 1; continue; }
    if (c === '"' || c === "'") { mode = 'string'; quote = c; continue; }
    if (c === '`') { mode = 'template'; continue; }
    if (c === openChar) depth += 1;
    else if (c === closeChar) { depth -= 1; if (depth === 0) return i; }
  }
  return -1;
}

function extractFunction(source, name) {
  const pattern = new RegExp('(^|\\n)([ \\t]*)function\\s+' + name + '\\s*\\(', 'g');
  const matches = [...source.matchAll(pattern)];
  assert.equal(matches.length, 1, `${name} deve existir exatamente uma vez no núcleo`);
  const match = matches[0];
  const offset = match.index + (match[1] === '\n' ? 1 : 0);
  const paren = source.indexOf('(', offset);
  const parenEnd = scanBalanced(source, paren, '(', ')');
  assert.ok(parenEnd > paren, `${name}: parâmetros não terminados`);
  let brace = parenEnd + 1;
  while (/\s/.test(source[brace] || '')) brace += 1;
  assert.equal(source[brace], '{', `${name}: abertura não encontrada`);
  const end = scanBalanced(source, brace, '{', '}');
  assert.ok(end > brace, `${name}: declaração não terminada`);
  return source.slice(offset, end + 1);
}

function controllerHarness(overrides = {}) {
  const source = kernelSource();
  const controllerSource = Object.keys(EXPECTED).map(name => extractFunction(source, name)).join('\n\n');
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
  const els = { playBtn: { textContent: '▶', title: 'Reproduzir (Espaço)' }, ...(overrides.els || {}) };
  const calls = { goTo: [], clearTimeout: [], setTimeout: [] };
  const timers = [];
  const fakeWindow = {
    clearTimeout(id) { calls.clearTimeout.push(id); },
    setTimeout(fn, delay) {
      const id = { fn, delay, ordinal: timers.length + 1 };
      timers.push(id);
      calls.setTimeout.push({ delay });
      return id;
    },
  };
  const goTo = (...args) => {
    calls.goTo.push(args);
    const next = Number(args[0]);
    if (Number.isFinite(next)) state.index = Math.max(0, Math.min(state.parsed.events.length - 1, next));
  };
  const currentEvent = () => state.parsed?.events?.[state.index] || null;
  const api = Function('state', 'els', 'window', 'goTo', 'currentEvent', `${controllerSource}; return { startPlayback, stopPlayback, togglePlayback, scheduleNext };`)(
    state, els, fakeWindow, goTo, currentEvent
  );
  return { state, els, calls, timers, api };
}

test('playback controller preserva identidade byte a byte antes da extração', () => {
  const source = kernelSource();
  for (const [name, expected] of Object.entries(EXPECTED)) {
    const body = extractFunction(source, name);
    assert.equal(Buffer.byteLength(body, 'utf8'), expected.bytes, `${name}: tamanho mudou`);
    assert.equal(crypto.createHash('sha256').update(body).digest('hex'), expected.sha256, `${name}: SHA mudou`);
  }
});

test('playback permanece desacoplado de rota, mapa, aeronave, storage e parser', () => {
  const source = kernelSource();
  const forbidden = [
    'FlightFlowRouteProcessedV7412', 'transitionPlanForEvents', 'transitionDurations',
    'realMapState', 'google.', 'L.', 'aircraft', 'plane', 'motion',
    'localStorage', 'sessionStorage', 'indexedDB', 'FlightParser', 'Parser.'
  ];
  for (const name of Object.keys(EXPECTED)) {
    const body = extractFunction(source, name);
    for (const token of forbidden) assert.ok(!body.includes(token), `${name} não deve depender diretamente de ${token}`);
  }
});

test('startPlayback no último evento reinicia silenciosamente no primeiro antes de reproduzir', () => {
  const h = controllerHarness({ state: { index: 2 } });
  h.api.startPlayback();
  assert.deepEqual(h.calls.goTo, [[0, { silent: true }]]);
  assert.equal(h.state.index, 0);
  assert.equal(h.state.playing, true);
  assert.equal(h.els.playBtn.textContent, 'Ⅱ');
  assert.equal(h.els.playBtn.title, 'Pausar (Espaço)');
  assert.equal(h.timers.length, 1, 'início deve agendar o próximo avanço');
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
  assert.equal(h.els.playBtn.textContent, '▶');
  assert.equal(h.els.playBtn.title, 'Reproduzir (Espaço)');
});

test('togglePlayback alterna exclusivamente entre iniciar e parar', () => {
  const h = controllerHarness();
  h.api.togglePlayback();
  assert.equal(h.state.playing, true);
  assert.equal(h.timers.length, 1);
  h.api.togglePlayback();
  assert.equal(h.state.playing, false);
  assert.equal(h.state.timer, null);
  assert.equal(h.els.playBtn.title, 'Reproduzir (Espaço)');
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

test('scheduleNext avança um evento e agenda novamente enquanto houver eventos', () => {
  const h = controllerHarness({ state: { playing: true, index: 0 } });
  h.api.scheduleNext();
  assert.equal(h.timers.length, 1);
  h.timers[0].fn();
  assert.equal(h.state.index, 1);
  assert.deepEqual(h.calls.goTo, [[1]]);
  assert.equal(h.timers.length, 2, 'após avançar deve agendar a etapa seguinte');
});

test('scheduleNext encerra no último evento sem ultrapassar o limite', () => {
  const h = controllerHarness({ state: { playing: true, index: 2 } });
  h.api.scheduleNext();
  assert.equal(h.timers.length, 1);
  h.timers[0].fn();
  assert.equal(h.state.index, 2);
  assert.deepEqual(h.calls.goTo, []);
  assert.equal(h.state.playing, false);
  assert.equal(h.state.timer, null);
  assert.equal(h.els.playBtn.title, 'Reproduzir (Espaço)');
});
