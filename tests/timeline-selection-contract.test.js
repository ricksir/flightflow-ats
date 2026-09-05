'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = path.resolve(__dirname, '..');
const HTML = path.join(ROOT, 'index.html');
const ANCHOR = 'window.__FlightFlowFirBridge = Object.freeze({';
const FUNCTION_NAME = 'updateTimelineSelection';
const FUNCTION_BYTES = 461;
const FUNCTION_SHA256 = 'de1f5864d3d8dbd3fc528e194671c2529ca1b434785cc7b833814995e1e82b70';

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
  return { source, make: (els, state, document) => new Function('els', 'state', 'document', `${source}\nreturn ${FUNCTION_NAME};`)(els, state, document) };
}

function harness({ index = 1, panelActive = false } = {}) {
  const calls = [];
  const items = [0, 1, 2].map(eventIndex => {
    const classes = new Set();
    return {
      dataset: { eventIndex: String(eventIndex) },
      classList: {
        toggle(name, force) { if (force) classes.add(name); else classes.delete(name); },
        contains(name) { return classes.has(name); },
      },
      scrollIntoView(options) { calls.push({ eventIndex: String(eventIndex), options }); },
    };
  });
  const timelineList = {
    querySelectorAll(selector) {
      assert.equal(selector, '.timeline-item');
      return items;
    },
    querySelector(selector) {
      assert.equal(selector, '.timeline-item.active');
      return items.find(item => item.classList.contains('active')) || null;
    },
  };
  const document = {
    querySelector(selector) {
      assert.equal(selector, '[data-panel="timeline"]');
      return { classList: { contains(name) { assert.equal(name, 'active'); return panelActive; } } };
    },
  };
  const state = { index };
  const { source, make } = loadInlineFunction();
  const updateTimelineSelection = make({ timelineList }, state, document);
  return { source, state, items, calls, updateTimelineSelection };
}

function activeIndexes(items) {
  return items.filter(item => item.classList.contains('active')).map(item => Number(item.dataset.eventIndex));
}

test('updateTimelineSelection mantém identidade exata antes da extração', () => {
  const source = extractNamedFunction(kernelSource(), FUNCTION_NAME);
  assert.equal(Buffer.byteLength(source, 'utf8'), FUNCTION_BYTES);
  assert.equal(crypto.createHash('sha256').update(source).digest('hex'), FUNCTION_SHA256);
});

test('seleção ativa acompanha exclusivamente state.index vivo', () => {
  const h = harness({ index: 1 });
  h.updateTimelineSelection();
  assert.deepEqual(activeIndexes(h.items), [1]);
  h.state.index = 2;
  h.updateTimelineSelection();
  assert.deepEqual(activeIndexes(h.items), [2]);
});

test('timeline oculta atualiza classe active sem executar scroll', () => {
  const h = harness({ index: 1, panelActive: false });
  h.updateTimelineSelection();
  assert.deepEqual(activeIndexes(h.items), [1]);
  assert.deepEqual(h.calls, []);
});

test('timeline visível rola somente o item ativo com nearest + smooth', () => {
  const h = harness({ index: 2, panelActive: true });
  h.updateTimelineSelection();
  assert.deepEqual(activeIndexes(h.items), [2]);
  assert.deepEqual(h.calls, [{ eventIndex: '2', options: { block: 'nearest', behavior: 'smooth' } }]);
});

test('núcleo mantém os dois consumidores conhecidos sem acoplamento de rota no helper', () => {
  const kernel = kernelSource();
  const source = extractNamedFunction(kernel, FUNCTION_NAME);
  assert.equal(kernel.split('updateTimelineSelection();').length - 1, 2);
  assert.ok(kernel.includes('renderCommunication(event);\n    updateTimelineSelection();\n    renderOriginalEvent(event);'));
  assert.ok(kernel.includes("if (name === 'timeline') updateTimelineSelection();"));
  for (const token of [
    'FlightFlowRouteProcessedV7412', 'transitionPlanForEvents', 'transitionDurations',
    'realMapState', 'google.', 'L.', 'aircraft', 'plane', 'localStorage', 'indexedDB', 'FlightParser', 'goTo(', 'renderCurrent('
  ]) assert.equal(source.includes(token), false, `acoplamento proibido: ${token}`);
});
