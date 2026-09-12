'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');
const HTML = path.join(ROOT, 'index.html');
const MODULE = path.join(ROOT, 'src', 'timeline', 'communication-context-utils.js');
const FUNCTION_NAME = 'formatAddressDisplay';
const EXPECTED_KERNEL_CONSUMERS = 0;
const EXPECTED_MODULE_CONSUMERS = 1;
const EXPECTED_TOTAL_CONSUMERS = 1;
const EXPECTED_SOURCE = [
  '  function formatAddressDisplay(value) {',
  '    const raw = cleanDisplay(value);',
  '    const addresses = parseAddresses(raw);',
  '    if (!addresses.length) {',
  '      const normalized = normalizeLocalityCode(raw);',
  "      return normalized ? formatAddressCode(normalized) : (raw || '—');",
  '    }',
  "    return [...new Set(addresses)].map(formatAddressCode).join(' · ');",
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

function loadFunction(deps = {}) {
  const source = fs.readFileSync(MODULE, 'utf8');
  const context = { window: {} };
  vm.runInNewContext(source, context);
  return context.window.FlightFlowCommunicationContextUtils
    .createAddressDisplayFormatter({
      cleanDisplay: deps.cleanDisplay,
      parseAddresses: deps.parseAddresses,
      normalizeLocalityCode: deps.normalizeLocalityCode,
      formatAddressCode: deps.formatAddressCode,
    })
    .formatAddressDisplay;
}

test('formatAddressDisplay mantém identidade byte a byte após a extração', () => {
  const source = extractNamedFunction(fs.readFileSync(MODULE, 'utf8'), FUNCTION_NAME);
  assert.equal(source, EXPECTED_SOURCE);
  assert.equal(Buffer.byteLength(source, 'utf8'), Buffer.byteLength(EXPECTED_SOURCE, 'utf8'));
});

test('formatAddressDisplay permanece sem acoplamento direto de infraestrutura', () => {
  const source = extractNamedFunction(fs.readFileSync(MODULE, 'utf8'), FUNCTION_NAME);
  for (const token of [
    'state.', 'els.', 'document.', 'window.', 'localStorage', 'sessionStorage',
    'indexedDB', 'fetch(', 'goTo(', 'renderCurrent(', 'stopPlayback(', 'setTimeout(',
    'setInterval(', 'requestAnimationFrame(', 'navigator.', 'google.', 'L.', 'Parser',
    'realMapState', 'CustomEvent', 'dispatchEvent', 'addEventListener', 'querySelector',
    'getElementById'
  ]) assert.equal(source.includes(token), false, `acoplamento inesperado: ${token}`);
});

test('formatAddressDisplay mantém exatamente um consumidor no módulo e não volta inline ao núcleo', () => {
  const kernel = kernelSource();
  const moduleSource = fs.readFileSync(MODULE, 'utf8');
  const fieldSource = extractNamedFunction(moduleSource, 'formatFieldDisplay');
  const kernelOccurrences = [...kernel.matchAll(/\bformatAddressDisplay\s*\(/g)].length;
  const moduleOccurrences = [...moduleSource.matchAll(/\bformatAddressDisplay\s*\(/g)].length - 1;

  assert.equal(kernelOccurrences, EXPECTED_KERNEL_CONSUMERS);
  assert.equal(moduleOccurrences, EXPECTED_MODULE_CONSUMERS);
  assert.equal(kernelOccurrences + moduleOccurrences, EXPECTED_TOTAL_CONSUMERS);
  assert.ok(fieldSource.includes("if (key === 'originator' || key === 'recipients') return formatAddressDisplay(value);"));
  assert.equal(kernel.includes('function formatAddressDisplay('), false);
  assert.ok(kernel.includes('const { formatAddressDisplay } = CommunicationContextUtils.createAddressDisplayFormatter({ cleanDisplay, parseAddresses, normalizeLocalityCode, formatAddressCode });'));
});

test('formatAddressDisplay preserva fallback para valor vazio', () => {
  const calls = [];
  const fn = loadFunction({
    cleanDisplay: value => { calls.push(['clean', value]); return ''; },
    parseAddresses: value => { calls.push(['parse', value]); return []; },
    normalizeLocalityCode: value => { calls.push(['normalize', value]); return ''; },
    formatAddressCode: value => { calls.push(['format', value]); return String(value); },
  });

  assert.equal(fn(null), '—');
  assert.deepEqual(calls, [['clean', null], ['parse', ''], ['normalize', '']]);
});

test('formatAddressDisplay normaliza valor simples antes de formatar o código', () => {
  const calls = [];
  const fn = loadFunction({
    cleanDisplay: value => { calls.push(['clean', value]); return String(value || '').trim(); },
    parseAddresses: value => { calls.push(['parse', value]); return []; },
    normalizeLocalityCode: value => { calls.push(['normalize', value]); return String(value || '').toUpperCase(); },
    formatAddressCode: value => { calls.push(['format', value]); return `FMT:${value}`; },
  });

  assert.equal(fn(' sbbr '), 'FMT:SBBR');
  assert.deepEqual(calls, [
    ['clean', ' sbbr '],
    ['parse', 'sbbr'],
    ['normalize', 'sbbr'],
    ['format', 'SBBR'],
  ]);
});

test('formatAddressDisplay remove duplicatas e preserva ordem dos endereços', () => {
  const calls = [];
  const fn = loadFunction({
    cleanDisplay: value => { calls.push(['clean', value]); return 'RAW'; },
    parseAddresses: value => { calls.push(['parse', value]); return ['AAA', 'AAA', 'BBB']; },
    normalizeLocalityCode: value => { calls.push(['normalize', value]); return value; },
    formatAddressCode: value => { calls.push(['format', value]); return `[${value}]`; },
  });

  assert.equal(fn('qualquer'), '[AAA] · [BBB]');
  assert.deepEqual(calls, [
    ['clean', 'qualquer'],
    ['parse', 'RAW'],
    ['format', 'AAA'],
    ['format', 'BBB'],
  ]);
});
