'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');
const HTML = path.join(ROOT, 'index.html');
const MODULE = path.join(ROOT, 'src', 'timeline', 'communication-context-utils.js');
const FUNCTION_NAME = 'knowledgeEntryDocumentLabel';
const EXPECTED_CONSUMERS = 5;
const EXPECTED_SOURCE = [
  '  function knowledgeEntryDocumentLabel(entry) {',
  "    return KNOWLEDGE_DOCUMENT_LABELS[knowledgeEntryDocumentKey(entry)] || 'Base normativa ATM';",
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
  assert.ok(start >= 0, `${name} deve existir no módulo após a extração`);
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

function loadFunction(labels, knowledgeEntryDocumentKey) {
  const source = fs.readFileSync(MODULE, 'utf8');
  const context = { window: {} };
  vm.runInNewContext(source, context);
  return context.window.FlightFlowCommunicationContextUtils
    .createKnowledgeDocumentLabeler({
      knowledgeDocumentLabels: labels,
      knowledgeEntryDocumentKey,
    })
    .knowledgeEntryDocumentLabel;
}

test('knowledgeEntryDocumentLabel mantém identidade byte a byte após a extração', () => {
  const source = extractNamedFunction(fs.readFileSync(MODULE, 'utf8'), FUNCTION_NAME);
  assert.equal(source, EXPECTED_SOURCE);
  assert.equal(Buffer.byteLength(source, 'utf8'), Buffer.byteLength(EXPECTED_SOURCE, 'utf8'));
});

test('knowledgeEntryDocumentLabel permanece puro e sem acoplamento de infraestrutura', () => {
  const source = extractNamedFunction(fs.readFileSync(MODULE, 'utf8'), FUNCTION_NAME);
  for (const token of [
    'state.', 'els.', 'document.', 'window.', 'localStorage', 'sessionStorage',
    'indexedDB', 'fetch(', 'goTo(', 'renderCurrent(', 'stopPlayback(', 'setTimeout(',
    'setInterval(', 'requestAnimationFrame(', 'navigator.', 'google.', 'L.', 'Parser',
    'realMapState', 'CustomEvent', 'dispatchEvent', 'addEventListener', 'querySelector',
    'getElementById'
  ]) assert.equal(source.includes(token), false, `acoplamento inesperado: ${token}`);
});

test('knowledgeEntryDocumentLabel mantém exatamente cinco consumidores no núcleo e não permanece inline', () => {
  const kernel = kernelSource();
  const occurrences = [...kernel.matchAll(/\bknowledgeEntryDocumentLabel\s*\(/g)].length;
  assert.equal(occurrences, EXPECTED_CONSUMERS);
  assert.ok(kernel.includes('els.knowledgePopoverSource.textContent = knowledgeEntryDocumentLabel(entry);'));
  assert.ok(kernel.includes('escapeHtml(knowledgeEntryDocumentLabel(entry))'));
  assert.ok(kernel.includes('entry.source, knowledgeEntryDocumentLabel(entry)'));
  assert.ok(kernel.includes("const base=`${entry.title}${entry.short&&entry.short!==entry.title?` — ${entry.short}`:''} (${knowledgeEntryDocumentLabel(entry)}).`;"));
  assert.equal(kernel.includes('function knowledgeEntryDocumentLabel('), false);
  assert.ok(kernel.includes('const { knowledgeEntryDocumentLabel } = CommunicationContextUtils.createKnowledgeDocumentLabeler({'));
});

test('knowledgeEntryDocumentLabel preserva os três rótulos normativos conhecidos', () => {
  const labels = {
    CIRCEA: 'CIRCEA 100-77/2017',
    MCA: 'MCA 100-27/2025',
    SAGITARIO: 'SAGITARIO ACC - Disciplina II (2023)',
  };
  const calls = [];
  const fn = loadFunction(labels, entry => {
    calls.push(entry.key);
    return entry.key;
  });

  assert.equal(fn({ key: 'CIRCEA' }), 'CIRCEA 100-77/2017');
  assert.equal(fn({ key: 'MCA' }), 'MCA 100-27/2025');
  assert.equal(fn({ key: 'SAGITARIO' }), 'SAGITARIO ACC - Disciplina II (2023)');
  assert.deepEqual(calls, ['CIRCEA', 'MCA', 'SAGITARIO']);
});

test('knowledgeEntryDocumentLabel preserva fallback Base normativa ATM', () => {
  const fn = loadFunction(
    { CIRCEA: 'CIRCEA 100-77/2017' },
    () => 'DESCONHECIDO'
  );
  assert.equal(fn({ source: 'qualquer' }), 'Base normativa ATM');
});

test('knowledgeEntryDocumentLabel delega a classificação ao knowledgeEntryDocumentKey uma única vez', () => {
  const calls = [];
  const entry = { sourceDocument: 'MCA 100-27' };
  const fn = loadFunction(
    { MCA: 'MCA 100-27/2025' },
    received => {
      calls.push(received);
      return 'MCA';
    }
  );

  assert.equal(fn(entry), 'MCA 100-27/2025');
  assert.deepEqual(calls, [entry]);
});
