'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const HTML = path.join(ROOT, 'index.html');
const FUNCTION_NAME = 'knowledgeEntryDocumentKey';
const EXPECTED_CONSUMERS = 2;
const EXPECTED_SOURCE = [
  '  function knowledgeEntryDocumentKey(entry) {',
  "    const source = String(entry?.sourceDocument || entry?.source || '').toUpperCase();",
  "    if (source.includes('SAGITARIO ACC') || source.includes('DISCIPLINA II')) return 'SAGITARIO';",
  "    if (source.includes('MCA 100-27')) return 'MCA';",
  "    return 'CIRCEA';",
  '  }',
].join('\n');

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

function loadFunction() {
  const source = extractNamedFunction(kernelSource(), FUNCTION_NAME);
  return Function(`${source}\nreturn knowledgeEntryDocumentKey;`)();
}

test('knowledgeEntryDocumentKey mantém identidade byte a byte antes da extração', () => {
  const source = extractNamedFunction(kernelSource(), FUNCTION_NAME);
  assert.equal(source, EXPECTED_SOURCE);
  assert.equal(Buffer.byteLength(source, 'utf8'), Buffer.byteLength(EXPECTED_SOURCE, 'utf8'));
});

test('knowledgeEntryDocumentKey permanece puro e sem acoplamento de infraestrutura', () => {
  const source = extractNamedFunction(kernelSource(), FUNCTION_NAME);
  for (const token of [
    'state.', 'els.', 'document.', 'window.', 'localStorage', 'sessionStorage',
    'indexedDB', 'fetch(', 'goTo(', 'renderCurrent(', 'stopPlayback(', 'setTimeout(',
    'setInterval(', 'requestAnimationFrame(', 'navigator.', 'google.', 'L.', 'Parser',
    'realMapState', 'CustomEvent', 'dispatchEvent', 'addEventListener', 'querySelector',
    'getElementById'
  ]) assert.equal(source.includes(token), false, `acoplamento inesperado: ${token}`);
});

test('knowledgeEntryDocumentKey mantém exatamente dois consumidores no núcleo', () => {
  const kernel = kernelSource();
  const occurrences = [...kernel.matchAll(/\bknowledgeEntryDocumentKey\s*\(/g)].length;
  assert.equal(occurrences - 1, EXPECTED_CONSUMERS);
  assert.ok(kernel.includes("return KNOWLEDGE_DOCUMENT_LABELS[knowledgeEntryDocumentKey(entry)] || 'Base normativa ATM';"));
  assert.ok(kernel.includes("if (documentKey !== 'all' && knowledgeEntryDocumentKey(entry) !== documentKey) return false;"));
});

test('knowledgeEntryDocumentKey classifica SAGITARIO ACC e DISCIPLINA II como SAGITARIO', () => {
  const fn = loadFunction();
  assert.equal(fn({ sourceDocument: 'SAGITARIO ACC — módulo' }), 'SAGITARIO');
  assert.equal(fn({ sourceDocument: 'disciplina ii' }), 'SAGITARIO');
});

test('knowledgeEntryDocumentKey classifica MCA 100-27 como MCA', () => {
  const fn = loadFunction();
  assert.equal(fn({ sourceDocument: 'MCA 100-27' }), 'MCA');
  assert.equal(fn({ source: 'texto mca 100-27 revisado' }), 'MCA');
});

test('knowledgeEntryDocumentKey usa CIRCEA como fallback', () => {
  const fn = loadFunction();
  assert.equal(fn({ sourceDocument: 'CIRCEA 100-50' }), 'CIRCEA');
  assert.equal(fn({}), 'CIRCEA');
  assert.equal(fn(null), 'CIRCEA');
});

test('knowledgeEntryDocumentKey preserva precedência de sourceDocument sobre source', () => {
  const fn = loadFunction();
  assert.equal(fn({ sourceDocument: 'MCA 100-27', source: 'SAGITARIO ACC' }), 'MCA');
  assert.equal(fn({ sourceDocument: '', source: 'DISCIPLINA II' }), 'SAGITARIO');
});
