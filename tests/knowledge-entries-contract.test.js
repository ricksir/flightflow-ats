'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const crypto = require('node:crypto');

const HTML = fs.readFileSync('index.html', 'utf8');
const scriptMatches = [...HTML.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)];
const KERNEL = scriptMatches.map(match => match[1]).sort((a, b) => b.length - a.length)[0];

const FUNCTION_NAME = 'knowledgeEntries';
const EXPECTED_SOURCE = [
  'function knowledgeEntries() {',
  '    const circea = Array.isArray(CIRCEA_KNOWLEDGE.entries) ? CIRCEA_KNOWLEDGE.entries : [];',
  '    const mca = Array.isArray(MCA_KNOWLEDGE.entries) ? MCA_KNOWLEDGE.entries : [];',
  '    const sagitario = Array.isArray(SAGITARIO_ACC_KNOWLEDGE.entries) ? SAGITARIO_ACC_KNOWLEDGE.entries : [];',
  '    return [...circea, ...mca, ...sagitario];',
  '  }'
].join('\n');
const EXPECTED_BYTES = 363;
const EXPECTED_SHA256 = '1ed0db4735547d51112af91b9a4ade803d292b2f462a33271100cfb57b869730';

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

function loadFunction(circea, mca, sagitario) {
  const source = extractNamedFunction(KERNEL, FUNCTION_NAME);
  return Function(
    'CIRCEA_KNOWLEDGE',
    'MCA_KNOWLEDGE',
    'SAGITARIO_ACC_KNOWLEDGE',
    source + '\nreturn knowledgeEntries;'
  )(circea, mca, sagitario);
}

test('knowledgeEntries mantém identidade byte a byte antes da extração', () => {
  const source = extractNamedFunction(KERNEL, FUNCTION_NAME);
  assert.equal(source, EXPECTED_SOURCE);
  assert.equal(Buffer.byteLength(source, 'utf8'), EXPECTED_BYTES);
  assert.equal(crypto.createHash('sha256').update(source, 'utf8').digest('hex'), EXPECTED_SHA256);
});

test('knowledgeEntries permanece puro e depende somente das três bases injetáveis', () => {
  const source = extractNamedFunction(KERNEL, FUNCTION_NAME);
  for (const token of [
    'state.', 'els.', 'document.', 'window.', 'localStorage', 'sessionStorage', 'indexedDB',
    'fetch(', 'setTimeout(', 'setInterval(', 'goTo(', 'renderCurrent(', 'currentEvent(',
    'route', 'planner', 'interpol', 'aircraft', 'timeline', 'scrubber', 'autoplay', 'DEP'
  ]) {
    assert.equal(source.includes(token), false, 'acoplamento inesperado: ' + token);
  }
  assert.equal((source.match(/\bCIRCEA_KNOWLEDGE\b/g) || []).length, 2);
  assert.equal((source.match(/\bMCA_KNOWLEDGE\b/g) || []).length, 2);
  assert.equal((source.match(/\bSAGITARIO_ACC_KNOWLEDGE\b/g) || []).length, 2);
});

test('knowledgeEntries concatena as três bases na ordem CIRCEA → MCA → SAGITARIO', () => {
  const c1 = { key: 'c1' };
  const c2 = { key: 'c2' };
  const m1 = { key: 'm1' };
  const s1 = { key: 's1' };
  const fn = loadFunction(
    { entries: [c1, c2] },
    { entries: [m1] },
    { entries: [s1] }
  );
  const result = fn();

  assert.deepEqual(result, [c1, c2, m1, s1]);
  assert.equal(result[0], c1);
  assert.equal(result[2], m1);
  assert.equal(result[3], s1);
});

test('knowledgeEntries ignora entries que não sejam arrays', () => {
  const m1 = { key: 'm1' };
  const fn = loadFunction(
    { entries: null },
    { entries: [m1] },
    { entries: 'invalid' }
  );
  assert.deepEqual(fn(), [m1]);

  const empty = loadFunction({}, { entries: 42 }, { entries: null });
  assert.deepEqual(empty(), []);
});

test('knowledgeEntries cria novo array sem clonar as entradas', () => {
  const entry = { key: 'same-reference' };
  const sourceArray = [entry];
  const fn = loadFunction(
    { entries: sourceArray },
    { entries: [] },
    { entries: [] }
  );
  const first = fn();
  const second = fn();

  assert.notEqual(first, second);
  assert.notEqual(first, sourceArray);
  assert.equal(first[0], entry);
  assert.equal(second[0], entry);
  assert.deepEqual(sourceArray, [entry], 'array de origem não deve ser alterado');
});

test('knowledgeEntries mantém exatamente seis consumidores executáveis no núcleo', () => {
  assert.equal((KERNEL.match(/\bknowledgeEntries\b/g) || []).length, 7);
  assert.equal((KERNEL.match(/\bknowledgeEntries\s*\(/g) || []).length, 5);
  assert.equal(KERNEL.split('knowledgeEntries,').length - 1, 2);

  assert.equal(KERNEL.split('return knowledgeEntries().map(entry => ({ ...entry }));').length - 1, 1);
  assert.equal(KERNEL.split('const entries = knowledgeEntries().slice().sort').length - 1, 1);
  assert.equal(KERNEL.split('const initial = findKnowledgeEntryByKey(initialKey) || knowledgeEntries()[0];').length - 1, 1);
  assert.equal(KERNEL.split('const filtered = knowledgeEntries().filter(entry => {').length - 1, 1);
});
