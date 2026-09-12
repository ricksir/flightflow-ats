'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');
const HTML = path.join(ROOT, 'index.html');
const MODULE = path.join(ROOT, 'src', 'timeline', 'communication-context-utils.js');
const FUNCTION_NAME = 'formatAddressCode';
const EXPECTED_CONSUMERS = 2;
const EXPECTED_SOURCE = [
  '  function formatAddressCode(code) {',
  '    const normalized = normalizeLocalityCode(code);',
  "    if (!normalized) return '—';",
  '    const locality = lookupLocality(normalized);',
  '    return locality ? `${normalized} — ${locality}` : normalized;',
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

function loadFunction(normalizeLocalityCode, lookupLocality) {
  const source = fs.readFileSync(MODULE, 'utf8');
  const context = { window: {} };
  vm.runInNewContext(source, context);
  return context.window.FlightFlowCommunicationContextUtils
    .createAddressFormatter({ normalizeLocalityCode, lookupLocality })
    .formatAddressCode;
}

test('formatAddressCode mantém identidade byte a byte após a extração', () => {
  const source = extractNamedFunction(fs.readFileSync(MODULE, 'utf8'), FUNCTION_NAME);
  assert.equal(source, EXPECTED_SOURCE);
  assert.equal(Buffer.byteLength(source, 'utf8'), Buffer.byteLength(EXPECTED_SOURCE, 'utf8'));
});

test('formatAddressCode permanece sem acoplamento direto de infraestrutura', () => {
  const source = extractNamedFunction(fs.readFileSync(MODULE, 'utf8'), FUNCTION_NAME);
  for (const token of [
    'state.', 'els.', 'document.', 'window.', 'localStorage', 'sessionStorage',
    'indexedDB', 'fetch(', 'goTo(', 'renderCurrent(', 'stopPlayback(', 'setTimeout(',
    'setInterval(', 'requestAnimationFrame(', 'navigator.', 'google.', 'L.', 'Parser',
    'realMapState', 'CustomEvent', 'dispatchEvent', 'addEventListener', 'querySelector',
    'getElementById'
  ]) assert.equal(source.includes(token), false, `acoplamento inesperado: ${token}`);
});

test('formatAddressCode mantém exatamente dois consumidores no núcleo e não permanece inline', () => {
  const kernel = kernelSource();
  const occurrences = [...kernel.matchAll(/\bformatAddressCode\s*\(/g)].length;
  assert.equal(occurrences, EXPECTED_CONSUMERS);
  assert.ok(kernel.includes('return normalized ? formatAddressCode(normalized) : (raw || \'—\');'));
  assert.ok(kernel.includes("return code ? formatAddressCode(code) : '—';"));
  assert.equal(kernel.includes('function formatAddressCode('), false);
  assert.ok(kernel.includes('const { formatAddressCode } = CommunicationContextUtils.createAddressFormatter({ normalizeLocalityCode, lookupLocality });'));
});

test('formatAddressCode retorna travessão quando a normalização fica vazia', () => {
  const calls = [];
  const fn = loadFunction(
    value => { calls.push(['normalize', value]); return ''; },
    value => { calls.push(['lookup', value]); return 'não deve ser usado'; }
  );

  assert.equal(fn('   '), '—');
  assert.deepEqual(calls, [['normalize', '   ']]);
});

test('formatAddressCode retorna somente o código quando não há localidade conhecida', () => {
  const calls = [];
  const fn = loadFunction(
    value => { calls.push(['normalize', value]); return String(value || '').trim().toUpperCase(); },
    value => { calls.push(['lookup', value]); return ''; }
  );

  assert.equal(fn(' sbbr '), 'SBBR');
  assert.deepEqual(calls, [['normalize', ' sbbr '], ['lookup', 'SBBR']]);
});

test('formatAddressCode preserva o formato código — localidade quando há nome conhecido', () => {
  const calls = [];
  const fn = loadFunction(
    value => { calls.push(['normalize', value]); return String(value || '').trim().toUpperCase(); },
    value => { calls.push(['lookup', value]); return value === 'SBBR' ? 'Brasília' : ''; }
  );

  assert.equal(fn('sbbr'), 'SBBR — Brasília');
  assert.deepEqual(calls, [['normalize', 'sbbr'], ['lookup', 'SBBR']]);
});
