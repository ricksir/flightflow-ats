'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = path.resolve(__dirname, '..');
const HTML = path.join(ROOT, 'index.html');
const FUNCTION_NAME = 'findKnowledgeEntriesByCode';
const EXPECTED_CONSUMERS = 2;
const EXPECTED_SOURCE = [
  '  function findKnowledgeEntriesByCode(code) {',
  '    const normalized = canonicalKnowledgeCode(code);',
  '    return knowledgeEntries().filter(entry => canonicalKnowledgeCode(entry.code) === normalized || (entry.aliases || []).some(alias => canonicalKnowledgeCode(alias) === normalized));',
  '  }',
].join('\n');
const EXPECTED_BYTES = 285;
const EXPECTED_SHA256 = '7166b261151e266666ff3fbfb9c88f64f988eeb401b1b7cd92cd632c062564bb';

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

function loadFunction(entriesFactory, canonicalKnowledgeCode) {
  const source = extractNamedFunction(kernelSource(), FUNCTION_NAME);
  return Function(
    'knowledgeEntries',
    'canonicalKnowledgeCode',
    `${source}\nreturn findKnowledgeEntriesByCode;`
  )(entriesFactory, canonicalKnowledgeCode);
}

function canonical(value) {
  return String(value || '').trim().toUpperCase().replace(/\s+/g, ' ');
}

test('findKnowledgeEntriesByCode mantém identidade byte a byte antes da extração', () => {
  const source = extractNamedFunction(kernelSource(), FUNCTION_NAME);
  assert.equal(source, EXPECTED_SOURCE);
  assert.equal(Buffer.byteLength(source, 'utf8'), EXPECTED_BYTES);
  assert.equal(crypto.createHash('sha256').update(source, 'utf8').digest('hex'), EXPECTED_SHA256);
});

test('findKnowledgeEntriesByCode permanece puro e sem acoplamento de infraestrutura', () => {
  const source = extractNamedFunction(kernelSource(), FUNCTION_NAME);
  for (const token of [
    'state.', 'els.', 'document.', 'window.', 'localStorage', 'sessionStorage',
    'indexedDB', 'fetch(', 'goTo(', 'renderCurrent(', 'stopPlayback(', 'setTimeout(',
    'setInterval(', 'requestAnimationFrame(', 'navigator.', 'google.', 'L.', 'Parser',
    'realMapState', 'CustomEvent', 'dispatchEvent', 'addEventListener', 'querySelector',
    'getElementById'
  ]) assert.equal(source.includes(token), false, `acoplamento inesperado: ${token}`);
  assert.equal((source.match(/\bknowledgeEntries\s*\(/g) || []).length, 1);
  assert.equal((source.match(/\bcanonicalKnowledgeCode\s*\(/g) || []).length, 3);
});

test('findKnowledgeEntriesByCode mantém exatamente dois consumidores no núcleo', () => {
  const kernel = kernelSource();
  const occurrences = [...kernel.matchAll(/\bfindKnowledgeEntriesByCode\s*\(/g)].length;
  assert.equal(occurrences - 1, EXPECTED_CONSUMERS);
  assert.ok(kernel.includes('codes.forEach(code => findKnowledgeEntriesByCode(code).forEach(item => {'));
  assert.ok(kernel.includes('const matches=findKnowledgeEntriesByCode(value).sort((a,b)=>{'));
});

test('findKnowledgeEntriesByCode encontra código direto e aliases preservando a ordem da base', () => {
  const first = { key: 'A', code: 'ABC', aliases: ['ALT', 'A B C'] };
  const second = { key: 'B', code: 'ALT' };
  const third = { key: 'C', code: 'OTHER', aliases: ['ALT-2'] };
  const fn = loadFunction(() => [first, second, third], canonical);

  assert.deepEqual(fn(' alt '), [first, second]);
  assert.deepEqual(fn('a   b c'), [first]);
  assert.deepEqual(fn('ALT-2'), [third]);
});

test('findKnowledgeEntriesByCode ignora entradas não correspondentes e aliases ausentes', () => {
  const entries = [
    { key: 'A', code: 'ABC' },
    { key: 'B', code: 'DEF', aliases: [] },
  ];
  const fn = loadFunction(() => entries, canonical);

  assert.deepEqual(fn('XYZ'), []);
  assert.deepEqual(fn(null), []);
});

test('findKnowledgeEntriesByCode retorna novo array sem alterar a base', () => {
  const entries = [{ key: 'A', code: 'ABC' }, { key: 'B', code: 'DEF' }];
  const snapshot = JSON.stringify(entries);
  const fn = loadFunction(() => entries, canonical);
  const result = fn('ABC');

  assert.notEqual(result, entries);
  assert.deepEqual(result, [entries[0]]);
  assert.equal(JSON.stringify(entries), snapshot);
});

test('findKnowledgeEntriesByCode consulta knowledgeEntries exatamente uma vez por busca', () => {
  let calls = 0;
  const fn = loadFunction(() => {
    calls += 1;
    return [{ key: 'A', code: 'ABC', aliases: ['ALT'] }];
  }, canonical);

  assert.equal(fn('ABC').length, 1);
  assert.equal(calls, 1);
  assert.equal(fn('ALT').length, 1);
  assert.equal(calls, 2);
});
