'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = path.resolve(__dirname, '..');
const HTML = path.join(ROOT, 'index.html');
const FUNCTION_NAME = 'knowledgeCategoryLabel';
const EXPECTED_CONSUMERS = 4;
const EXPECTED_SOURCE = [
  '  function knowledgeCategoryLabel(category) {',
  '    return KNOWLEDGE_CATEGORY_LABELS[category] || humanize(category);',
  '  }',
].join('\n');
const EXPECTED_BYTES = 119;
const EXPECTED_SHA256 = '40eecb777708abf7e0bfcb2a1fbb90a6672ef130ce7a443809da61ca920296c0';

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

function loadFunction(labels, humanize) {
  const source = extractNamedFunction(kernelSource(), FUNCTION_NAME);
  return Function(
    'KNOWLEDGE_CATEGORY_LABELS',
    'humanize',
    `${source}\nreturn knowledgeCategoryLabel;`
  )(labels, humanize);
}

test('knowledgeCategoryLabel mantém identidade byte a byte antes da extração', () => {
  const source = extractNamedFunction(kernelSource(), FUNCTION_NAME);
  assert.equal(source, EXPECTED_SOURCE);
  assert.equal(Buffer.byteLength(source, 'utf8'), EXPECTED_BYTES);
  assert.equal(crypto.createHash('sha256').update(source, 'utf8').digest('hex'), EXPECTED_SHA256);
});

test('knowledgeCategoryLabel permanece puro e sem acoplamento de infraestrutura', () => {
  const source = extractNamedFunction(kernelSource(), FUNCTION_NAME);
  for (const token of [
    'state.', 'els.', 'document.', 'window.', 'localStorage', 'sessionStorage',
    'indexedDB', 'fetch(', 'goTo(', 'renderCurrent(', 'stopPlayback(', 'setTimeout(',
    'setInterval(', 'requestAnimationFrame(', 'navigator.', 'google.', 'L.', 'Parser',
    'realMapState', 'CustomEvent', 'dispatchEvent', 'addEventListener', 'querySelector',
    'getElementById'
  ]) assert.equal(source.includes(token), false, `acoplamento inesperado: ${token}`);
});

test('knowledgeCategoryLabel mantém exatamente quatro consumidores no núcleo', () => {
  const kernel = kernelSource();
  const occurrences = [...kernel.matchAll(/\bknowledgeCategoryLabel\s*\(/g)].length;
  assert.equal(occurrences - 1, EXPECTED_CONSUMERS);
  assert.ok(kernel.includes('escapeHtml(knowledgeCategoryLabel(entry.category))'));
  assert.ok(kernel.includes('knowledgeCategoryLabel(a.category).localeCompare(knowledgeCategoryLabel(b.category)'));
  assert.ok(kernel.includes('escapeHtml(knowledgeCategoryLabel(entry.category))}</span><b>'));
});

test('knowledgeCategoryLabel preserva rótulos conhecidos sem chamar fallback', () => {
  const calls = [];
  const labels = {
    message: 'Mensagem ATS',
    status_sagitario: 'Status SAGITARIO',
    training_general: 'Conceito da apresentação',
  };
  const fn = loadFunction(labels, value => {
    calls.push(value);
    return `fallback:${value}`;
  });

  assert.equal(fn('message'), 'Mensagem ATS');
  assert.equal(fn('status_sagitario'), 'Status SAGITARIO');
  assert.equal(fn('training_general'), 'Conceito da apresentação');
  assert.deepEqual(calls, []);
});

test('knowledgeCategoryLabel preserva fallback por humanize exatamente uma vez', () => {
  const calls = [];
  const fn = loadFunction({}, value => {
    calls.push(value);
    return 'Categoria customizada';
  });

  assert.equal(fn('custom_category'), 'Categoria customizada');
  assert.deepEqual(calls, ['custom_category']);
});

test('knowledgeCategoryLabel preserva fallback para categoria vazia', () => {
  const calls = [];
  const fn = loadFunction({}, value => {
    calls.push(value);
    return 'Vazio';
  });

  assert.equal(fn(''), 'Vazio');
  assert.deepEqual(calls, ['']);
});
