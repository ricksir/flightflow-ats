'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = path.resolve(__dirname, '..');
const HTML = path.join(ROOT, 'index.html');
const MODULE = path.join(ROOT, 'src', 'geo', 'stand-hint-utils.js');
const REFERENCE = '<script id="flightflow-stand-hint-utils" src="src/geo/stand-hint-utils.js"></script>';
const MODULE_BYTES = 580;
const MODULE_SHA256 = '19b7189a6c3d003b11b2148227d2bcd943c7f0f54d5cd86217d7dcff1b1fbe0b';
const FUNCTION_NAME = 'extractStandHint';
const EXPECTED_BYTES = 460;
const EXPECTED_LINES = 10;
const EXPECTED_SHA256 = 'ac618c664a3976449e6f459e05da0d4ad1e845864ea485c0a7ea8dbb08d467dd';
const EXPECTED_CONSUMERS = 1;

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
  assert.equal(source[brace], '{', `${name}: abertura não encontrada`);

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
  return Function(`${source}; return ${FUNCTION_NAME};`)();
}

test('extractStandHint mantém identidade exata após a extração', () => {
  const source = extractNamedFunction(fs.readFileSync(MODULE, 'utf8'), FUNCTION_NAME);
  assert.equal(Buffer.byteLength(source, 'utf8'), EXPECTED_BYTES);
  assert.equal(source.split(/\r?\n/).length, EXPECTED_LINES);
  assert.equal(crypto.createHash('sha256').update(source).digest('hex'), EXPECTED_SHA256);
});

test('extractStandHint permanece puro e desacoplado de infraestrutura', () => {
  const source = extractNamedFunction(fs.readFileSync(MODULE, 'utf8'), FUNCTION_NAME);
  for (const token of [
    'state.', 'els.', 'document.', 'window.', 'localStorage', 'sessionStorage',
    'indexedDB', 'fetch(', 'goTo(', 'renderCurrent(', 'stopPlayback(', 'setTimeout(',
    'setInterval(', 'requestAnimationFrame(', 'navigator.', 'google.', 'L.', 'Parser',
    'realMapState', 'CustomEvent', 'dispatchEvent', 'addEventListener', 'querySelector',
    'getElementById'
  ]) assert.equal(source.includes(token), false, `acoplamento inesperado: ${token}`);
});

test('extractStandHint mantém exatamente um consumidor no núcleo', () => {
  const kernel = kernelSource();
  const occurrences = [...kernel.matchAll(/\bextractStandHint\s*\(/g)].length;
  assert.equal(occurrences, EXPECTED_CONSUMERS);
  assert.ok(kernel.includes("extractStandHint(parsed,mode==='arrival')"));
});

test('stand-hint-utils carrega antes do núcleo e expõe API congelada', () => {
  const html = fs.readFileSync(HTML, 'utf8');
  const module = fs.readFileSync(MODULE, 'utf8');
  assert.equal(Buffer.byteLength(module, 'utf8'), MODULE_BYTES);
  assert.equal(crypto.createHash('sha256').update(module).digest('hex'), MODULE_SHA256);
  assert.ok(module.startsWith("(function () {\n  'use strict';"));
  assert.ok(module.includes('window.FlightFlowStandHintUtils = Object.freeze({'));
  assert.ok(module.includes('    extractStandHint,'));
  assert.ok(module.endsWith('})();\n'));

  assert.equal(html.split(REFERENCE).length - 1, 1, 'referência stand-hint-utils deve ser única');
  const referenceIndex = html.indexOf(REFERENCE);
  const anchorIndex = html.indexOf('window.__FlightFlowFirBridge = Object.freeze({');
  const mainScriptStart = html.lastIndexOf('<script', anchorIndex);
  assert.ok(referenceIndex >= 0 && referenceIndex < mainScriptStart, 'módulo deve carregar antes do IIFE principal');

  const kernel = kernelSource();
  assert.ok(kernel.includes('const StandHintUtils = window.FlightFlowStandHintUtils;'));
  assert.ok(kernel.includes("if (!StandHintUtils) throw new Error('FlightFlowStandHintUtils não foi carregado.');"));
  assert.ok(kernel.includes('const { extractStandHint } = StandHintUtils;'));
  assert.equal(kernel.includes('function extractStandHint('), false);
});

test('extractStandHint usa ordem normal na saída e reversa na chegada', () => {
  const fn = loadFunction();
  const parsed = {
    events: [
      { content: 'STAND A1' },
      { content: 'GATE B2' },
      { content: 'BOX C3' },
    ],
  };
  assert.equal(fn(parsed), 'A1');
  assert.equal(fn(parsed, false), 'A1');
  assert.equal(fn(parsed, true), 'C3');
});

test('extractStandHint preserva vocabulário operacional e normaliza para maiúsculas', () => {
  const fn = loadFunction();
  const cases = [
    ['POSIÇÃO Nº: a-12', 'A-12'],
    ['POSICAO N° b7', 'B7'],
    ['STAND: c03', 'C03'],
    ['BOX- d4', 'D4'],
    ['GATE e5', 'E5'],
    ['PATIO f6', 'F6'],
    ['PÁTIO g7', 'G7'],
  ];
  for (const [content, expected] of cases) {
    assert.equal(fn({ events: [{ content }] }), expected, content);
  }
});

test('extractStandHint preserva precedência de rawBlock sobre content', () => {
  const fn = loadFunction();
  assert.equal(fn({ events: [{ rawBlock: 'STAND R1', content: 'STAND C1' }] }), 'R1');
  assert.equal(fn({ events: [{ rawBlock: 'SEM POSICAO', content: 'STAND C1' }] }), '');
  assert.equal(fn({ events: [{ rawBlock: '', content: 'STAND C1' }] }), 'C1');
});

test('extractStandHint mantém fallback vazio para histórico ausente ou sem posição', () => {
  const fn = loadFunction();
  assert.equal(fn(null), '');
  assert.equal(fn({}), '');
  assert.equal(fn({ events: [] }), '');
  assert.equal(fn({ events: [{ content: 'SEM INDICAÇÃO DE PÁTIO' }] }), '');
});
