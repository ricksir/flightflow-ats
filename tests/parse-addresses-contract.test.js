'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = path.resolve(__dirname, '..');
const HTML = path.join(ROOT, 'index.html');
const MODULE = path.join(ROOT, 'src', 'timeline', 'communication-context-utils.js');
const FUNCTION_NAME = 'parseAddresses';
const EXPECTED_CONSUMERS = 4;
const EXPECTED_SOURCE = [
  '  function parseAddresses(value) {',
  "    const text = String(value || '').toUpperCase();",
  '    const matches = text.match(/\\b[A-Z]{4}[A-Z0-9]{4}\\b/g) || [];',
  '    if (matches.length) return [...new Set(matches)];',
  "    return [...new Set(text.split(/[\\s,;|/]+/).map(v => v.replace(/[^A-Z0-9-]/g,'')).filter(v => v.length >= 4))];",
  '  }',
].join('\n');
const EXPECTED_BYTES = 325;
const EXPECTED_SHA256 = '6f1b8ab72ae94cae39a38be245f1014cb96e79449353d47ba76abb74eab4a103';

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
  return Function(`${source}\nreturn parseAddresses;`)();
}

test('parseAddresses mantém identidade byte a byte após a extração', () => {
  const source = extractNamedFunction(fs.readFileSync(MODULE, 'utf8'), FUNCTION_NAME);
  assert.equal(source, EXPECTED_SOURCE);
  assert.equal(Buffer.byteLength(source, 'utf8'), EXPECTED_BYTES);
  assert.equal(crypto.createHash('sha256').update(source, 'utf8').digest('hex'), EXPECTED_SHA256);
});

test('parseAddresses permanece puro e sem acoplamento de infraestrutura', () => {
  const source = extractNamedFunction(fs.readFileSync(MODULE, 'utf8'), FUNCTION_NAME);
  for (const token of [
    'state.', 'els.', 'document.', 'window.', 'localStorage', 'sessionStorage',
    'indexedDB', 'fetch(', 'goTo(', 'renderCurrent(', 'stopPlayback(', 'setTimeout(',
    'setInterval(', 'requestAnimationFrame(', 'navigator.', 'google.', 'L.', 'Parser',
    'realMapState', 'CustomEvent', 'dispatchEvent', 'addEventListener', 'querySelector',
    'getElementById'
  ]) assert.equal(source.includes(token), false, `acoplamento inesperado: ${token}`);
});

test('parseAddresses mantém exatamente quatro consumidores no núcleo e não permanece inline', () => {
  const kernel = kernelSource();
  const occurrences = [...kernel.matchAll(/\bparseAddresses\s*\(/g)].length;
  assert.equal(occurrences, EXPECTED_CONSUMERS);
  assert.ok(kernel.includes('const originators = parseAddresses(originatorRaw);'));
  assert.ok(kernel.includes('const recipients = parseAddresses(recipientsRaw);'));
  assert.ok(kernel.includes("const originators = parseAddresses(s.originator || event.originator || '');"));
  assert.ok(kernel.includes("const recipients = parseAddresses(s.recipients || event.recipients || '');"));
  assert.equal(kernel.includes('function parseAddresses('), false);
  assert.ok(kernel.includes('const { parseAddresses } = CommunicationContextUtils;'));
});

test('parseAddresses normaliza AFTN para maiúsculas, preserva ordem e remove duplicatas', () => {
  const fn = loadFunction();
  assert.deepEqual(
    fn('sbbrztzx, sbbszqzx SBBRZTZX'),
    ['SBBRZTZX', 'SBBSZQZX']
  );
});

test('parseAddresses prioriza endereços AFTN quando há ao menos uma correspondência', () => {
  const fn = loadFunction();
  assert.deepEqual(
    fn('texto SBBSZQZX EXTRA-LOCAL'),
    ['SBBSZQZX']
  );
});

test('parseAddresses preserva fallback tokenizado quando não há endereço AFTN', () => {
  const fn = loadFunction();
  assert.deepEqual(
    fn('alpha,beta / GAMMA; alpha | ab'),
    ['ALPHA', 'BETA', 'GAMMA']
  );
});

test('parseAddresses preserva hífen no fallback e descarta tokens menores que quatro caracteres', () => {
  const fn = loadFunction();
  assert.deepEqual(
    fn('(AB-CD), xy; TEST'),
    ['AB-CD', 'TEST']
  );
});

test('parseAddresses trata valor ausente como lista vazia', () => {
  const fn = loadFunction();
  assert.deepEqual(fn(null), []);
  assert.deepEqual(fn(undefined), []);
  assert.deepEqual(fn(''), []);
});
