'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = path.resolve(__dirname, '..');
const HTML = path.join(ROOT, 'index.html');
const FUNCTION_NAME = 'findKnowledgeEntryByKey';
const EXPECTED_CONSUMERS = 5;
const EXPECTED_SOURCE = [
  '  function findKnowledgeEntryByKey(key) {',
  '    return knowledgeEntries().find(entry => entry.key === key) || null;',
  '  }',
].join('\n');
const EXPECTED_BYTES = 117;
const EXPECTED_SHA256 = 'a2c41cfd7762ae0c95386cf046a8fd745ead43e420c098b721b5d2004f3a8d62';

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
  const paren = source.indexOf('(', start);
  let i = paren;
  let depth = 0;
  let quote = null;
  let escaped = false;

  while (i < source.length) {
    const c = source[i];
    if (quote) {
      if (escaped) escaped = false;
      else if (c === '\\') escaped = true;
      else if (c === quote) quote = null;
      i += 1;
      continue;
    }
    if (c === "'" || c === '"' || c === '`') { quote = c; i += 1; continue; }
    if (c === '(') depth += 1;
    else if (c === ')') {
      depth -= 1;
      if (depth === 0) break;
    }
    i += 1;
  }

  let brace = i + 1;
  while (/\s/.test(source[brace] || '')) brace += 1;
  assert.equal(source[brace], '{');

  depth = 0;
  quote = null;
  escaped = false;
  for (i = brace; i < source.length; i += 1) {
    const c = source[i];
    if (quote) {
      if (escaped) escaped = false;
      else if (c === '\\') escaped = true;
      else if (c === quote) quote = null;
      continue;
    }
    if (c === "'" || c === '"' || c === '`') { quote = c; continue; }
    if (c === '{') depth += 1;
    else if (c === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  throw new Error(`fim de ${name} não encontrado`);
}

function loadFunction(entriesFactory) {
  const source = extractNamedFunction(kernelSource(), FUNCTION_NAME);
  return Function(
    'knowledgeEntries',
    `${source}\nreturn findKnowledgeEntryByKey;`
  )(entriesFactory);
}

test('findKnowledgeEntryByKey mantém identidade byte a byte antes da extração', () => {
  const source = extractNamedFunction(kernelSource(), FUNCTION_NAME);
  assert.equal(source, EXPECTED_SOURCE);
  assert.equal(Buffer.byteLength(source, 'utf8'), EXPECTED_BYTES);
  assert.equal(crypto.createHash('sha256').update(source, 'utf8').digest('hex'), EXPECTED_SHA256);
});

test('findKnowledgeEntryByKey permanece puro e sem acoplamento de infraestrutura', () => {
  const source = extractNamedFunction(kernelSource(), FUNCTION_NAME);
  for (const token of [
    'state.', 'els.', 'document.', 'window.', 'localStorage', 'sessionStorage',
    'indexedDB', 'fetch(', 'goTo(', 'renderCurrent(', 'stopPlayback(', 'setTimeout(',
    'setInterval(', 'requestAnimationFrame(', 'navigator.', 'google.', 'L.', 'Parser',
    'realMapState', 'CustomEvent', 'dispatchEvent', 'addEventListener', 'querySelector',
    'getElementById'
  ]) assert.equal(source.includes(token), false, `acoplamento inesperado: ${token}`);
  assert.equal((source.match(/\bknowledgeEntries\s*\(/g) || []).length, 1);
});

test('findKnowledgeEntryByKey mantém exatamente cinco consumidores no núcleo', () => {
  const kernel = kernelSource();
  const occurrences = [...kernel.matchAll(/\bfindKnowledgeEntryByKey\s*\(/g)].length;
  assert.equal(occurrences - 1, EXPECTED_CONSUMERS);
  assert.ok(kernel.includes('findKnowledgeEntryByKey(trigger.dataset.knowledgeKey)'));
  assert.ok(kernel.includes('findKnowledgeEntryByKey(state.activeKnowledgeKey)'));
  assert.ok(kernel.includes('findKnowledgeEntryByKey(button.dataset.relatedKnowledge)'));
  assert.ok(kernel.includes('findKnowledgeEntryByKey(initialKey)'));
  assert.ok(kernel.includes('findKnowledgeEntryByKey(button.dataset.knowledgeListKey)'));
});

test('findKnowledgeEntryByKey retorna a primeira entrada com chave estritamente igual', () => {
  const first = { key: 'MCA:ABC', title: 'Primeira' };
  const second = { key: 'MCA:ABC', title: 'Segunda' };
  const fn = loadFunction(() => [
    { key: 7, title: 'Numérica' },
    first,
    second,
    { key: '7', title: 'Texto' },
  ]);
  assert.equal(fn('MCA:ABC'), first);
  assert.equal(fn('7').title, 'Texto');
  assert.equal(fn(7).title, 'Numérica');
});

test('findKnowledgeEntryByKey retorna null quando a chave não existe ou a base está vazia', () => {
  const withEntries = loadFunction(() => [{ key: 'KNOWN' }]);
  const empty = loadFunction(() => []);
  assert.equal(withEntries('UNKNOWN'), null);
  assert.equal(empty('ANY'), null);
});

test('findKnowledgeEntryByKey consulta knowledgeEntries exatamente uma vez por busca', () => {
  let calls = 0;
  const fn = loadFunction(() => {
    calls += 1;
    return [{ key: 'KNOWN' }];
  });
  assert.equal(fn('KNOWN').key, 'KNOWN');
  assert.equal(calls, 1);
  assert.equal(fn('UNKNOWN'), null);
  assert.equal(calls, 2);
});
