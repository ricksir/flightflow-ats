'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = path.resolve(__dirname, '..');
const HTML = path.join(ROOT, 'index.html');
const ANCHOR = 'window.__FlightFlowFirBridge = Object.freeze({';
const FUNCTION_NAME = 'enableControls';
const FUNCTION_BYTES = 735;
const FUNCTION_SHA256 = 'b2c9ff65b7a232e97418752d8007ffe0d12e615388b330ebc62b7faff79ab605';
const CONTROL_IDS = [
  'exportBtn','showProtocolBtn','exactMessageBtn','copySummaryBtn','restartBtn','prevBtn','playBtn',
  'nextBtn','scrubber','speedSelect','soundBtn','fpvToggleBtn','stripToggleBtn'
];

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

function extractNamedFunction(source, name) {
  const marker = `  function ${name}(`;
  const start = source.indexOf(marker);
  assert.ok(start >= 0, `${name} deve existir inline no baseline`);
  const brace = source.indexOf('{', start);
  let depth = 0;
  let mode = 'code';
  let quote = '';
  let escaped = false;
  for (let i = brace; i < source.length; i += 1) {
    const c = source[i];
    const n = source[i + 1] || '';
    if (mode === 'line') { if (c === '\n') mode = 'code'; continue; }
    if (mode === 'block') { if (c === '*' && n === '/') { mode = 'code'; i += 1; } continue; }
    if (mode === 'string') {
      if (escaped) escaped = false;
      else if (c === '\\') escaped = true;
      else if (c === quote) mode = 'code';
      continue;
    }
    if (mode === 'template') {
      if (escaped) escaped = false;
      else if (c === '\\') escaped = true;
      else if (c === '`') mode = 'code';
      continue;
    }
    if (c === '/' && n === '/') { mode = 'line'; i += 1; continue; }
    if (c === '/' && n === '*') { mode = 'block'; i += 1; continue; }
    if (c === '"' || c === "'") { mode = 'string'; quote = c; continue; }
    if (c === '`') { mode = 'template'; continue; }
    if (c === '{') depth += 1;
    else if (c === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  throw new Error(`fim de ${name} não encontrado`);
}

function harness({ index = 0, events = [{ time: '10:00:00' }, { time: '10:05:00' }, { time: '10:10:00' }], parsed = true } = {}) {
  const els = Object.fromEntries(CONTROL_IDS.map(id => [id, { disabled: false }]));
  els.scrubber.max = '999';
  els.endTimeLabel = { textContent: 'antigo' };
  const state = { index, parsed: parsed ? { events } : null };
  const source = extractNamedFunction(kernelSource(), FUNCTION_NAME);
  const enableControls = new Function('els', 'state', `${source}\nreturn ${FUNCTION_NAME};`)(els, state);
  return { els, state, enableControls };
}

function disabledState(els) {
  return Object.fromEntries(CONTROL_IDS.map(id => [id, els[id].disabled]));
}

test('enableControls mantém identidade estrutural exata antes da extração', () => {
  const source = extractNamedFunction(kernelSource(), FUNCTION_NAME);
  assert.equal(Buffer.byteLength(source, 'utf8'), FUNCTION_BYTES);
  assert.equal(crypto.createHash('sha256').update(source).digest('hex'), FUNCTION_SHA256);
});

test('desabilitar controles desabilita os 13 controles e limpa metadados de timeline', () => {
  const h = harness({ index: 1 });
  h.enableControls(false);
  assert.deepEqual(disabledState(h.els), Object.fromEntries(CONTROL_IDS.map(id => [id, true])));
  assert.equal(h.els.scrubber.max, '0');
  assert.equal(h.els.endTimeLabel.textContent, '--:--:--');
});

test('habilitar no primeiro evento preserva limite Anterior e libera Próximo', () => {
  const h = harness({ index: 0 });
  h.enableControls(true);
  assert.equal(h.els.prevBtn.disabled, true);
  assert.equal(h.els.nextBtn.disabled, false);
  assert.equal(h.els.playBtn.disabled, false);
  assert.equal(h.els.scrubber.disabled, false);
  assert.equal(h.els.scrubber.max, '2');
  assert.equal(h.els.endTimeLabel.textContent, '10:10:00');
});

test('habilitar em evento intermediário libera Anterior e Próximo', () => {
  const h = harness({ index: 1 });
  h.enableControls(true);
  assert.equal(h.els.prevBtn.disabled, false);
  assert.equal(h.els.nextBtn.disabled, false);
});

test('habilitar no último evento preserva limite Próximo', () => {
  const h = harness({ index: 2 });
  h.enableControls(true);
  assert.equal(h.els.prevBtn.disabled, false);
  assert.equal(h.els.nextBtn.disabled, true);
});

test('horário final ausente usa fallback sem alterar o limite calculado', () => {
  const h = harness({ index: 1, events: [{ time: '10:00:00' }, { time: '' }] });
  h.enableControls(true);
  assert.equal(h.els.scrubber.max, '1');
  assert.equal(h.els.endTimeLabel.textContent, '--:--:--');
  assert.equal(h.els.prevBtn.disabled, false);
  assert.equal(h.els.nextBtn.disabled, true);
});

test('helper não depende diretamente de rota, movimento, storage ou outros renderizadores', () => {
  const source = extractNamedFunction(kernelSource(), FUNCTION_NAME);
  for (const token of [
    'FlightFlowRouteProcessedV7412', 'transitionPlanForEvents', 'transitionDurations',
    'realMapState', 'google.', 'L.', 'aircraft', 'plane', 'motion', 'localStorage', 'indexedDB',
    'FlightParser', 'goTo(', 'renderCurrent(', 'buildTimeline('
  ]) assert.equal(source.includes(token), false, `acoplamento proibido: ${token}`);
});
