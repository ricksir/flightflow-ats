'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const crypto = require('node:crypto');

const HTML = fs.readFileSync('index.html', 'utf8');
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

function extractNamedFunction(source, name) {
  const marker = new RegExp('\\bfunction\\s+' + name + '\\s*\\([^)]*\\)\\s*\\{', 'g');
  const match = marker.exec(source);
  assert.ok(match, name + ' deve existir no núcleo');
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

function loadFunction(knowledgeClickFields, escapeHtml, resolveKnowledgeEntry) {
  const source = extractNamedFunction(KERNEL, FUNCTION_NAME);
  return Function(
    'KNOWLEDGE_CLICK_FIELDS',
    'escapeHtml',
    'resolveKnowledgeEntry',
    source + '\nreturn renderKnowledgeFieldLabel;'
  )(knowledgeClickFields, escapeHtml, resolveKnowledgeEntry);
}

test('renderKnowledgeFieldLabel mantém identidade byte a byte antes da extração', () => {
  const source = extractNamedFunction(KERNEL, FUNCTION_NAME);
  assert.equal(source, EXPECTED_SOURCE);
  assert.equal(Buffer.byteLength(source, 'utf8'), EXPECTED_BYTES);
  assert.equal(crypto.createHash('sha256').update(source, 'utf8').digest('hex'), EXPECTED_SHA256);
});

test('renderKnowledgeFieldLabel permanece sem acoplamento com estado, DOM ou núcleo temporal/espacial', () => {
  const source = extractNamedFunction(KERNEL, FUNCTION_NAME);
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
  const fn = loadFunction(
    new Set(['status']),
    value => '[' + String(value) + ']',
    () => { resolveCalls += 1; return { key: 'unexpected' }; }
  );

  assert.equal(fn('callsign', '<Label>', 'raw', { id: 1 }), '[<Label>]');
  assert.equal(resolveCalls, 0);
});

test('campo clicável sem entrada correspondente retorna apenas label escapado', () => {
  const calls = [];
  const event = { id: 7 };
  const fn = loadFunction(
    new Set(['status']),
    value => '[' + String(value) + ']',
    (...args) => { calls.push(args); return null; }
  );

  assert.equal(fn('status', '<Label>', 'RAW', event), '[<Label>]');
  assert.deepEqual(calls, [['status', 'RAW', event]]);
});

test('entrada resolvida produz exatamente o botão normativo com todos os valores escapados', () => {
  const event = { id: 8 };
  const fn = loadFunction(
    new Set(['status']),
    value => '[' + String(value) + ']',
    (key, rawValue, receivedEvent) => {
      assert.equal(key, 'status');
      assert.equal(rawValue, 'RAW');
      assert.equal(receivedEvent, event);
      return { key: 'entry-key', code: 'ABC' };
    }
  );

  assert.equal(
    fn('status', '<Label>', 'RAW', event),
    '<button type="button" class="field-knowledge-link" data-knowledge-key="[entry-key]" data-knowledge-field="[status]" title="Consultar [ABC] na base normativa ATM">[<Label>]</button>'
  );
});

test('erros das dependências continuam propagando sem interceptação', () => {
  const sentinel = new Error('sentinel');
  const fn = loadFunction(
    new Set(['status']),
    value => String(value),
    () => { throw sentinel; }
  );
  assert.throws(() => fn('status', 'Label', 'RAW', {}), error => error === sentinel);
});

test('renderKnowledgeFieldLabel mantém exatamente um consumidor executável no núcleo', () => {
  assert.equal((KERNEL.match(/\brenderKnowledgeFieldLabel\b/g) || []).length, 2);
  assert.equal(
    KERNEL.split('renderKnowledgeFieldLabel(key, def.label, snapshot[key], event)').length - 1,
    1
  );
});
