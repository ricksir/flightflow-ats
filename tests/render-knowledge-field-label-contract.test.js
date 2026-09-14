'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');
const HTML_PATH = path.join(ROOT, 'index.html');
const MODULE_PATH = path.join(ROOT, 'src', 'knowledge', 'knowledge-field-label-renderer.js');
const HTML = fs.readFileSync(HTML_PATH, 'utf8');
const MODULE_SOURCE = fs.readFileSync(MODULE_PATH, 'utf8');
const scriptMatches = [...HTML.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)];
const KERNEL = scriptMatches.map(match => match[1]).sort((a, b) => b.length - a.length)[0];

const FUNCTION_NAME = 'renderKnowledgeFieldLabel';
const EXPECTED_SOURCE = [
  'function renderKnowledgeFieldLabel(key, label, rawValue, event) {',
  '    if (!KNOWLEDGE_CLICK_FIELDS.has(key)) return escapeHtml(label);',
  '    const entry = resolveKnowledgeEntry(key, rawValue, event);',
  '    if (!entry) return escapeHtml(label);',
  '    return `<button type="button" class="field-knowledge-link" data-knowledge-key="${escapeHtml(entry.key)}" data-knowledge-field="${escapeHtml(key)}" title="Consultar ${escapeHtml(entry.code)} na base normativa ATM">${escapeHtml(label)}</button>`;',
  '  }'
].join('\n');
const EXPECTED_BYTES = 491;
const EXPECTED_SHA256 = 'ce1b96ba294b91abb5db41098c9106b57570e37560948d33c7c8cb15224e78e4';
const MODULE_BYTES = 1338;
const MODULE_SHA256 = '92aa1e4a96b8d0fff402b0c093dd6b0d8ee49c61f37dbbe0d11bc360ded44729';

function extractNamedFunction(source, name) {
  const marker = new RegExp('\\bfunction\\s+' + name + '\\s*\\([^)]*\\)\\s*\\{', 'g');
  const match = marker.exec(source);
  assert.ok(match, name + ' deve existir no módulo');
  const start = match.index;
  const braceStart = start + match[0].length - 1;
  let depth = 0;
  let mode = 'code';

  for (let i = braceStart; i < source.length; i += 1) {
    const c = source[i];
    const n = source[i + 1];
    if (mode === 'code') {
      if (c === "'") mode = 'sq';
      else if (c === '"') mode = 'dq';
      else if (c === '`') mode = 'tpl';
      else if (c === '/' && n === '/') { mode = 'line'; i += 1; }
      else if (c === '/' && n === '*') { mode = 'block'; i += 1; }
      else if (c === '{') depth += 1;
      else if (c === '}') {
        depth -= 1;
        if (depth === 0) return source.slice(start, i + 1);
      }
    } else if (mode === 'sq') {
      if (c === '\\') i += 1;
      else if (c === "'") mode = 'code';
    } else if (mode === 'dq') {
      if (c === '\\') i += 1;
      else if (c === '"') mode = 'code';
    } else if (mode === 'tpl') {
      if (c === '\\') i += 1;
      else if (c === '`') mode = 'code';
    } else if (mode === 'line') {
      if (c === '\n') mode = 'code';
    } else if (mode === 'block') {
      if (c === '*' && n === '/') { mode = 'code'; i += 1; }
    }
  }

  throw new Error('fim de ' + name + ' não encontrado');
}

function loadApi() {
  const context = { window: {} };
  vm.runInNewContext(MODULE_SOURCE, context);
  return context.window.FlightFlowKnowledgeFieldLabelRenderer;
}

test('módulo knowledge-field-label-renderer mantém identidade estrutural congelada', () => {
  assert.equal(Buffer.byteLength(MODULE_SOURCE, 'utf8'), MODULE_BYTES);
  assert.equal(crypto.createHash('sha256').update(MODULE_SOURCE).digest('hex'), MODULE_SHA256);
  assert.match(MODULE_SOURCE, /^\(function \(\) \{\n  'use strict';/);
  assert.match(MODULE_SOURCE, /\}\)\(\);\n$/);
});

test('renderKnowledgeFieldLabel preserva exatamente o corpo congelado após a extração', () => {
  const source = extractNamedFunction(MODULE_SOURCE, FUNCTION_NAME);
  assert.equal(source, EXPECTED_SOURCE);
  assert.equal(Buffer.byteLength(source, 'utf8'), EXPECTED_BYTES);
  assert.equal(crypto.createHash('sha256').update(source, 'utf8').digest('hex'), EXPECTED_SHA256);
});

test('API pública exige as três dependências e retorna fronteira congelada', () => {
  const api = loadApi();
  assert.ok(api);
  assert.equal(Object.isFrozen(api), true);
  assert.deepEqual(Object.keys(api), ['create']);

  assert.throws(
    () => api.create({}),
    /FlightFlowKnowledgeFieldLabelRenderer requer knowledgeClickFields/
  );
  assert.throws(
    () => api.create({
      knowledgeClickFields: new Set(),
      escapeHtml: value => String(value),
    }),
    /FlightFlowKnowledgeFieldLabelRenderer requer escapeHtml e resolveKnowledgeEntry/
  );

  const scoped = api.create({
    knowledgeClickFields: new Set(['status']),
    escapeHtml: value => String(value),
    resolveKnowledgeEntry: () => null,
  });
  assert.equal(Object.isFrozen(scoped), true);
  assert.deepEqual(Object.keys(scoped), ['renderKnowledgeFieldLabel']);
});

test('renderKnowledgeFieldLabel permanece sem acoplamento com estado, DOM ou núcleo temporal/espacial', () => {
  const source = extractNamedFunction(MODULE_SOURCE, FUNCTION_NAME);
  for (const token of [
    'state.', 'els.', 'document.', 'window.', 'localStorage', 'sessionStorage', 'indexedDB',
    'fetch(', 'setTimeout(', 'setInterval(', 'goTo(', 'renderCurrent(', 'currentEvent(',
    'route', 'planner', 'interpol', 'aircraft', 'timeline', 'scrubber', 'autoplay', 'DEP'
  ]) {
    assert.equal(source.includes(token), false, 'acoplamento inesperado: ' + token);
  }
  assert.equal((source.match(/\bKNOWLEDGE_CLICK_FIELDS\b/g) || []).length, 1);
  assert.equal((source.match(/\bresolveKnowledgeEntry\s*\(/g) || []).length, 1);
});

test('campo não clicável retorna apenas label escapado e não resolve conhecimento', () => {
  let resolveCalls = 0;
  const fn = loadApi().create({
    knowledgeClickFields: new Set(['status']),
    escapeHtml: value => '[' + String(value) + ']',
    resolveKnowledgeEntry: () => { resolveCalls += 1; return { key: 'unexpected' }; },
  }).renderKnowledgeFieldLabel;

  assert.equal(fn('callsign', '<Label>', 'raw', { id: 1 }), '[<Label>]');
  assert.equal(resolveCalls, 0);
});

test('campo clicável sem entrada correspondente retorna apenas label escapado', () => {
  const calls = [];
  const event = { id: 7 };
  const fn = loadApi().create({
    knowledgeClickFields: new Set(['status']),
    escapeHtml: value => '[' + String(value) + ']',
    resolveKnowledgeEntry: (...args) => { calls.push(args); return null; },
  }).renderKnowledgeFieldLabel;

  assert.equal(fn('status', '<Label>', 'RAW', event), '[<Label>]');
  assert.deepEqual(calls, [['status', 'RAW', event]]);
});

test('entrada resolvida produz exatamente o botão normativo com todos os valores escapados', () => {
  const event = { id: 8 };
  const fn = loadApi().create({
    knowledgeClickFields: new Set(['status']),
    escapeHtml: value => '[' + String(value) + ']',
    resolveKnowledgeEntry: (key, rawValue, receivedEvent) => {
      assert.equal(key, 'status');
      assert.equal(rawValue, 'RAW');
      assert.equal(receivedEvent, event);
      return { key: 'entry-key', code: 'ABC' };
    },
  }).renderKnowledgeFieldLabel;

  assert.equal(
    fn('status', '<Label>', 'RAW', event),
    '<button type="button" class="field-knowledge-link" data-knowledge-key="[entry-key]" data-knowledge-field="[status]" title="Consultar [ABC] na base normativa ATM">[<Label>]</button>'
  );
});

test('erros das dependências continuam propagando sem interceptação', () => {
  const sentinel = new Error('sentinel');
  const fn = loadApi().create({
    knowledgeClickFields: new Set(['status']),
    escapeHtml: value => String(value),
    resolveKnowledgeEntry: () => { throw sentinel; },
  }).renderKnowledgeFieldLabel;
  assert.throws(() => fn('status', 'Label', 'RAW', {}), error => error === sentinel);
});

test('index carrega módulo antes do IIFE e injeta dependências explicitamente', () => {
  const moduleScript = '<script id="flightflow-knowledge-field-label-renderer" src="src/knowledge/knowledge-field-label-renderer.js"></script>';
  const parserBinding = 'const Parser = window.FlightParser;';
  assert.ok(HTML.includes(moduleScript));
  assert.ok(HTML.indexOf(moduleScript) < HTML.indexOf(parserBinding));

  assert.ok(KERNEL.includes('const KnowledgeFieldLabelRenderer = window.FlightFlowKnowledgeFieldLabelRenderer;'));
  assert.ok(KERNEL.includes("if (!KnowledgeFieldLabelRenderer) throw new Error('FlightFlowKnowledgeFieldLabelRenderer não foi carregado.');"));
  assert.ok(KERNEL.includes('const { renderKnowledgeFieldLabel } = KnowledgeFieldLabelRenderer.create({'));
  assert.ok(KERNEL.includes('knowledgeClickFields: KNOWLEDGE_CLICK_FIELDS,'));
  assert.ok(KERNEL.includes('escapeHtml,'));
  assert.ok(KERNEL.includes('resolveKnowledgeEntry,'));
});

test('núcleo mantém o consumidor único e não redeclara renderKnowledgeFieldLabel', () => {
  assert.equal((KERNEL.match(/\bfunction\s+renderKnowledgeFieldLabel\s*\(/g) || []).length, 0);
  assert.equal((KERNEL.match(/\brenderKnowledgeFieldLabel\b/g) || []).length, 2);
  assert.equal((KERNEL.match(/\brenderKnowledgeFieldLabel\s*\(/g) || []).length, 1);
  assert.equal(
    KERNEL.split('renderKnowledgeFieldLabel(key, def.label, snapshot[key], event)').length - 1,
    1
  );
});
