'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = path.resolve(__dirname, '..');
const HTML = path.join(ROOT, 'index.html');
const FUNCTION_NAME = 'normalizeSearchText';
const EXPECTED_CONSUMERS = 6;
const EXPECTED_SOURCE = [
  '  function normalizeSearchText(value) {',
  "    return String(value || '').normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLocaleLowerCase('pt-BR');",
  '  }',
].join('\n');
const EXPECTED_BYTES = 151;
const EXPECTED_SHA256 = '57a99fe512a7f7ffb1b25a5609ef1d377791418703ff89862b7dce8cf476422c';

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
  return Function(`${source}\nreturn normalizeSearchText;`)();
}

test('normalizeSearchText mantém identidade byte a byte antes da extração', () => {
  const source = extractNamedFunction(kernelSource(), FUNCTION_NAME);
  assert.equal(source, EXPECTED_SOURCE);
  assert.equal(Buffer.byteLength(source, 'utf8'), EXPECTED_BYTES);
  assert.equal(crypto.createHash('sha256').update(source, 'utf8').digest('hex'), EXPECTED_SHA256);
});

test('normalizeSearchText permanece puro e sem dependências da aplicação', () => {
  const source = extractNamedFunction(kernelSource(), FUNCTION_NAME);
  for (const token of [
    'state.', 'els.', 'document.', 'window.', 'localStorage', 'sessionStorage',
    'indexedDB', 'fetch(', 'goTo(', 'renderCurrent(', 'currentEvent(', 'setTimeout(',
    'setInterval(', 'requestAnimationFrame(', 'navigator.', 'google.', 'L.', 'Parser',
    'realMapState', 'normalizeLocalityCode(', 'normalizeKnowledgeText(', 'escapeHtml('
  ]) assert.equal(source.includes(token), false, `acoplamento inesperado: ${token}`);
  assert.equal((source.match(/\.normalize\('NFD'\)/g) || []).length, 1);
  assert.equal((source.match(/\.toLocaleLowerCase\('pt-BR'\)/g) || []).length, 1);
});

test('normalizeSearchText mantém exatamente seis consumidores no núcleo', () => {
  const kernel = kernelSource();
  const declarations = [...kernel.matchAll(/\bfunction\s+normalizeSearchText\s*\(/g)].length;
  const references = [...kernel.matchAll(/\bnormalizeSearchText\b/g)].length;
  assert.equal(declarations, 1);
  assert.equal(references - declarations, EXPECTED_CONSUMERS);
  assert.ok(kernel.includes('const wanted=normalizeSearchText(hint);'));
  assert.ok(kernel.includes('some(v=>normalizeSearchText(v)===wanted)'));
  assert.ok(kernel.includes("const text=normalizeSearchText([event.operation,event.messageType,event.content,event.rawBlock,s.groundState,s.status].filter(Boolean).join(' '));"));
  assert.ok(kernel.includes('SearchExcerpt.create({ normalizeSearchText, escapeHtml })'));
  assert.ok(kernel.includes('const normalizedQuery = normalizeSearchText(query);'));
  assert.ok(kernel.includes('if (normalizeSearchText(searchable).includes(normalizedQuery))'));
});

test('normalizeSearchText remove diacríticos e converte para minúsculas pt-BR', () => {
  const fn = loadFunction();
  assert.equal(fn('Brasília'), 'brasilia');
  assert.equal(fn('ÁÉÍÓÚ Ç ÃÕ'), 'aeiou c ao');
  assert.equal(fn('PLANO DE VÔO'), 'plano de voo');
});

test('normalizeSearchText preserva pontuação, separadores e dígitos', () => {
  const fn = loadFunction();
  assert.equal(fn('  SBBR-ZTZX / 123  '), '  sbbr-ztzx / 123  ');
  assert.equal(fn('A.B,C;D:E'), 'a.b,c;d:e');
});

test('normalizeSearchText trata valores vazios e é idempotente', () => {
  const fn = loadFunction();
  assert.equal(fn(null), '');
  assert.equal(fn(undefined), '');
  assert.equal(fn(''), '');
  const once = fn('AÇÃO / Brasília-DF');
  assert.equal(fn(once), once);
});
