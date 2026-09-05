'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const HTML = path.join(ROOT, 'index.html');
const FUNCTION_NAME = 'enableControls';
const CONTROL_IDS = [
  'exportBtn', 'showProtocolBtn', 'exactMessageBtn', 'copySummaryBtn',
  'restartBtn', 'prevBtn', 'playBtn', 'nextBtn', 'scrubber', 'speedSelect',
  'soundBtn', 'fpvToggleBtn', 'stripToggleBtn',
];

function kernelSource() {
  const html = fs.readFileSync(HTML, 'utf8');
  const anchor = 'window.__FlightFlowFirBridge = Object.freeze({';
  const anchorIndex = html.indexOf(anchor);
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
  assert.ok(start >= 0, `${name} deve permanecer inline antes da extração`);
  const brace = source.indexOf('{', start);
  let depth = 0;
  let quote = null;
  let escaped = false;
  for (let index = brace; index < source.length; index += 1) {
    const char = source[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === quote) quote = null;
      continue;
    }
    if (char === "'" || char === '"' || char === '`') { quote = char; continue; }
    if (char === '{') depth += 1;
    else if (char === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(start, index + 1);
    }
  }
  throw new Error(`fim de ${name} não encontrado`);
}

function loadInlineFunction() {
  const source = extractNamedFunction(kernelSource(), FUNCTION_NAME);
  const make = (els, state) => new Function('els', 'state', `${source}\nreturn ${FUNCTION_NAME};`)(els, state);
  return { source, make };
}

function makeElement() {
  return { disabled: false };
}

function harness({ index = 0, events = null } = {}) {
  const els = Object.fromEntries(CONTROL_IDS.map(id => [id, makeElement()]));
  els.scrubber.max = '999';
  els.endTimeLabel = { textContent: 'stale' };
  const state = {
    index,
    parsed: events === null ? null : { events },
  };
  const { source, make } = loadInlineFunction();
  return { source, els, state, enableControls: make(els, state) };
}

test('enableControls permanece isolado no núcleo com responsabilidade de controles', () => {
  const { source } = loadInlineFunction();
  for (const token of [
    "['exportBtn','showProtocolBtn','exactMessageBtn','copySummaryBtn','restartBtn','prevBtn','playBtn','nextBtn','scrubber','speedSelect','soundBtn','fpvToggleBtn','stripToggleBtn']",
    'const lastIndex = Math.max(0, state.parsed.events.length - 1);',
    'els.scrubber.max = String(lastIndex);',
    "els.endTimeLabel.textContent = state.parsed.events[state.parsed.events.length - 1].time || '--:--:--';",
    'els.prevBtn.disabled = state.index <= 0;',
    'els.nextBtn.disabled = state.index >= lastIndex;',
  ]) assert.ok(source.includes(token), `contrato ausente: ${token}`);

  for (const forbidden of [
    'goTo(', 'renderCurrent(', 'buildTimeline(', 'startPlayback(', 'stopPlayback(',
    'realMapState', 'FlightParser', 'localStorage', 'indexedDB',
  ]) assert.equal(source.includes(forbidden), false, `acoplamento inesperado: ${forbidden}`);
});

test('enableControls(false) desabilita todos os controles e limpa faixa temporal', () => {
  const h = harness({ index: 2, events: [{ time: '10:00:00' }, { time: '10:01:00' }, { time: '10:02:00' }] });
  h.enableControls(false);
  for (const id of CONTROL_IDS) assert.equal(h.els[id].disabled, true, `${id} deve ficar desabilitado`);
  assert.equal(h.els.scrubber.max, '0');
  assert.equal(h.els.endTimeLabel.textContent, '--:--:--');
});

test('enableControls(true) habilita controles e preserva limites no primeiro evento', () => {
  const h = harness({ index: 0, events: [{ time: '10:00:00' }, { time: '10:01:00' }, { time: '10:02:30' }] });
  h.enableControls(true);
  assert.equal(h.els.scrubber.max, '2');
  assert.equal(h.els.endTimeLabel.textContent, '10:02:30');
  assert.equal(h.els.prevBtn.disabled, true);
  assert.equal(h.els.nextBtn.disabled, false);
  for (const id of CONTROL_IDS.filter(id => !['prevBtn'].includes(id))) {
    if (id !== 'nextBtn') assert.equal(h.els[id].disabled, false, `${id} deve ficar habilitado`);
  }
});

test('enableControls(true) preserva limites no último evento', () => {
  const h = harness({ index: 2, events: [{ time: '10:00:00' }, { time: '10:01:00' }, { time: '10:02:30' }] });
  h.enableControls(true);
  assert.equal(h.els.prevBtn.disabled, false);
  assert.equal(h.els.nextBtn.disabled, true);
});

test('enableControls(true) em evento intermediário mantém Anterior e Próximo habilitados', () => {
  const h = harness({ index: 1, events: [{ time: '10:00:00' }, { time: '10:01:00' }, { time: '10:02:30' }] });
  h.enableControls(true);
  assert.equal(h.els.prevBtn.disabled, false);
  assert.equal(h.els.nextBtn.disabled, false);
});

test('sem histórico carregado, faixa temporal permanece neutra sem inventar eventos', () => {
  const h = harness({ index: 0, events: null });
  h.enableControls(true);
  assert.equal(h.els.scrubber.max, '0');
  assert.equal(h.els.endTimeLabel.textContent, '--:--:--');
});
