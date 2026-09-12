'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = path.resolve(__dirname, '..');
const HTML = path.join(ROOT, 'index.html');
const FUNCTION_NAME = 'canonicalKnowledgeCode';
const EXPECTED_CONSUMERS = 9;
const EXPECTED_SOURCE = [
  '  function canonicalKnowledgeCode(value) {',
  "    return normalizeKnowledgeText(value).replace(/[^A-Z0-9]/g, '');",
  '  }',
].join('\n');
const EXPECTED_BYTES = 114;
const EXPECTED_SHA256 = '2758c3035fc2ce162a5470d7da91e4695f979636cae2499426ce178bd98ac229';

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

function loadFunction(normalizeKnowledgeText) {
  const source = extractNamedFunction(kernelSource(), FUNCTION_NAME);
  return Function(
    'normalizeKnowledgeText',
    `${source}\nreturn canonicalKnowledgeCode;`
  )(normalizeKnowledgeText);
}

test('canonicalKnowledgeCode mantém identidade byte a byte antes da extração', () => {
  const source = extractNamedFunction(kernelSource(), FUNCTION_NAME);
  assert.equal(source, EXPECTED_SOURCE);
  assert.equal(Buffer.byteLength(source, 'utf8'), EXPECTED_BYTES);
  assert.equal(crypto.createHash('sha256').update(source, 'utf8').digest('hex'), EXPECTED_SHA256);
});

test('canonicalKnowledgeCode permanece puro e depende somente de normalizeKnowledgeText', () => {
  const source = extractNamedFunction(kernelSource(), FUNCTION_NAME);
  for (const token of [
    'state.', 'els.', 'document.', 'window.', 'localStorage', 'sessionStorage',
    'indexedDB', 'fetch(', 'goTo(', 'renderCurrent(', 'stopPlayback(', 'setTimeout(',
    'setInterval(', 'requestAnimationFrame(', 'navigator.', 'google.', 'L.', 'Parser',
    'realMapState', 'CustomEvent', 'dispatchEvent', 'addEventListener', 'querySelector',
    'getElementById', 'knowledgeEntries(', 'currentEvent('
  ]) assert.equal(source.includes(token), false, `acoplamento inesperado: ${token}`);
  assert.equal((source.match(/\bnormalizeKnowledgeText\s*\(/g) || []).length, 1);
});

test('canonicalKnowledgeCode mantém exatamente nove consumidores no núcleo', () => {
  const kernel = kernelSource();
  const declarations = [...kernel.matchAll(/\bfunction\s+canonicalKnowledgeCode\s*\(/g)].length;
  const references = [...kernel.matchAll(/\bcanonicalKnowledgeCode\b/g)].length;
  assert.equal(declarations, 1);
  assert.equal(references - declarations, EXPECTED_CONSUMERS);
  assert.ok(kernel.includes('canonicalKnowledgeCode,'));
});

test('canonicalKnowledgeCode usa exatamente uma normalização por chamada', () => {
  let calls = 0;
  const inputs = [];
  const fn = loadFunction(value => {
    calls += 1;
    inputs.push(value);
    return 'ABC-12 / DEF';
  });

  assert.equal(fn('original'), 'ABC12DEF');
  assert.equal(calls, 1);
  assert.deepEqual(inputs, ['original']);
});

test('canonicalKnowledgeCode remove tudo que não seja A-Z ou 0-9 após a normalização', () => {
  const fn = loadFunction(value => String(value ?? ''));

  assert.equal(fn('ABC-123'), 'ABC123');
  assert.equal(fn('A B/C_D.E'), 'ABCDE');
  assert.equal(fn('AZ09'), 'AZ09');
  assert.equal(fn('---'), '');
  assert.equal(fn(''), '');
});

test('canonicalKnowledgeCode preserva a saída alfanumérica da dependência sem mutação adicional', () => {
  const samples = new Map([
    ['acentuado', 'SAO-PAULO'],
    ['pontuado', 'A1.B2/C3'],
    ['vazio', ''],
  ]);
  const fn = loadFunction(value => samples.get(value));

  assert.equal(fn('acentuado'), 'SAOPAULO');
  assert.equal(fn('pontuado'), 'A1B2C3');
  assert.equal(fn('vazio'), '');
});
