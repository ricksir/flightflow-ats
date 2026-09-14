'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = path.resolve(__dirname, '..');
const HTML = path.join(ROOT, 'index.html');
const MODULE = path.join(ROOT, 'src', 'timeline', 'communication-context-utils.js');
const FUNCTION_NAME = 'normalizeKnowledgeText';
const EXPECTED_CONSUMERS = 11;
const EXPECTED_SOURCE = [
  '  function normalizeKnowledgeText(value) {',
  "    return String(value || '').normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toUpperCase().replace(/[–—]/g,'-').replace(/[^A-Z0-9-]+/g,' ').replace(/\\s+/g,' ').trim();",
  '  }',
].join('\n');
const EXPECTED_BYTES = 221;
const EXPECTED_SHA256 = 'eb60fdefec2aa5732c3a5d1ca9c74be3dad16613ab7ba0187bfb9f5216c768f2';

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

function loadFunction() {
  const source = extractNamedFunction(fs.readFileSync(MODULE, 'utf8'), FUNCTION_NAME);
  return Function(`${source}\nreturn normalizeKnowledgeText;`)();
}

test('normalizeKnowledgeText mantém identidade byte a byte após a extração', () => {
  const source = extractNamedFunction(fs.readFileSync(MODULE, 'utf8'), FUNCTION_NAME);
  assert.equal(source, EXPECTED_SOURCE);
  assert.equal(Buffer.byteLength(source, 'utf8'), EXPECTED_BYTES);
  assert.equal(crypto.createHash('sha256').update(source, 'utf8').digest('hex'), EXPECTED_SHA256);
});

test('normalizeKnowledgeText permanece puro e desacoplado de infraestrutura', () => {
  const source = extractNamedFunction(fs.readFileSync(MODULE, 'utf8'), FUNCTION_NAME);
  for (const token of [
    'state.', 'els.', 'document.', 'window.', 'localStorage', 'sessionStorage',
    'indexedDB', 'fetch(', 'goTo(', 'renderCurrent(', 'currentEvent(', 'setTimeout(',
    'setInterval(', 'requestAnimationFrame(', 'navigator.', 'google.', 'L.', 'Parser',
    'realMapState', 'normalizeLocalityCode(', 'normalizeSearchText(', 'escapeHtml('
  ]) assert.equal(source.includes(token), false, `acoplamento inesperado: ${token}`);
  assert.equal((source.match(/\.normalize\('NFD'\)/g) || []).length, 1);
  assert.equal((source.match(/\.toUpperCase\(\)/g) || []).length, 1);
  assert.equal((source.match(/\.trim\(\)/g) || []).length, 1);
});

test('normalizeKnowledgeText mantém consumidores distribuídos entre núcleo e token matcher extraído', () => {
  const kernel = kernelSource();
  const moduleSource = fs.readFileSync(MODULE, 'utf8');
  const declarations = [...kernel.matchAll(/\bfunction\s+normalizeKnowledgeText\s*\(/g)].length;
  const references = [...kernel.matchAll(/\bnormalizeKnowledgeText\b/g)].length;
  assert.equal(declarations, 0);
  assert.equal(references, EXPECTED_CONSUMERS + 1);
  assert.ok(kernel.includes('const { normalizeKnowledgeText } = CommunicationContextUtils;'));

  for (const token of [
    'CommunicationContextUtils.createCanonicalKnowledgeCode({ normalizeKnowledgeText })',
    "const normalized = normalizeKnowledgeText(textParts.filter(Boolean).join(' '));",
    "const query = normalizeKnowledgeText(els.knowledgeSearchInput ? els.knowledgeSearchInput.value : '');",
    "const haystack = normalizeKnowledgeText([entry.code, entry.title, entry.short, entry.definition, entry.direction, entry.when, entry.source, knowledgeEntryDocumentLabel(entry), ...(entry.aliases || [])].join(' '));",
    'const codeA = normalizeKnowledgeText(a.code);',
    'const codeB = normalizeKnowledgeText(b.code);',
    'normalizeKnowledgeText(a.title).includes(query)',
    'normalizeKnowledgeText(b.title).includes(query)',
    'const normalized=normalizeKnowledgeText(value);',
    'Object.keys(direct).find(key=>normalizeKnowledgeText(key)===normalized)',
  ]) assert.ok(kernel.includes(token), `consumidor ausente no núcleo: ${token}`);

  assert.ok(kernel.includes('CommunicationContextUtils.createEntryMatchesToken({'));
  assert.ok(kernel.includes('normalizeKnowledgeText,'));
  const matcher = extractNamedFunction(moduleSource, 'entryMatchesToken');
  assert.ok(matcher.includes('.map(normalizeKnowledgeText).filter(Boolean)'));
});

test('normalizeKnowledgeText remove diacríticos, usa caixa alta e normaliza travessões', () => {
  const fn = loadFunction();
  assert.equal(fn('Brasília'), 'BRASILIA');
  assert.equal(fn('ÁÉÍÓÚ Ç ÃÕ'), 'AEIOU C AO');
  assert.equal(fn('A–B—C'), 'A-B-C');
});

test('normalizeKnowledgeText preserva hífen ASCII e reduz pontuação a espaços', () => {
  const fn = loadFunction();
  assert.equal(fn('SAGITARIO-ACC / RQP, CPL; EST'), 'SAGITARIO-ACC RQP CPL EST');
  assert.equal(fn('A.B:C_D'), 'A B C D');
  assert.equal(fn('ABC-123'), 'ABC-123');
});

test('normalizeKnowledgeText compacta espaços, trata vazios e é idempotente', () => {
  const fn = loadFunction();
  assert.equal(fn(null), '');
  assert.equal(fn(undefined), '');
  assert.equal(fn(''), '');
  assert.equal(fn('   AÇÃO   DE   CONTROLE   '), 'ACAO DE CONTROLE');
  const once = fn('RQP — Brasília / ZQZX');
  assert.equal(fn(once), once);
});
