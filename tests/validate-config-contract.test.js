'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = path.resolve(__dirname, '..');
const HTML = path.join(ROOT, 'index.html');
const MODULE = path.join(ROOT, 'src', 'config', 'config-validation.js');
const REFERENCE = '<script id="flightflow-config-validation" src="src/config/config-validation.js"></script>';
const MODULE_BYTES = 1591;
const MODULE_SHA256 = 'ad311d41e0034fd82a8494298dac7b6353753c3e43879eb39fb8f665d644f235';
const EXPECTED_BYTES = 1276;
const EXPECTED_LINES = 10;
const EXPECTED_SHA256 = 'd17fd88941d78ca70b839858c6cee3dc280e3234626516c4f718c1a471e576e5';

function kernelSource() {
  const html = fs.readFileSync(HTML, 'utf8');
  const anchor = 'window.__FlightFlowFirBridge = Object.freeze({';
  const pos = html.indexOf(anchor);
  assert.ok(pos >= 0, 'ponte FIR deve continuar dentro do IIFE principal');
  const open = html.lastIndexOf('<script', pos);
  const bodyStart = html.indexOf('>', open) + 1;
  const close = html.indexOf('</script>', pos);
  assert.ok(open >= 0 && bodyStart > open && close > bodyStart, 'IIFE principal deve continuar delimitado');
  return html.slice(bodyStart, close);
}

function functionSource(container, name) {
  const marker = `  function ${name}(`;
  const start = container.indexOf(marker);
  assert.ok(start >= 0, `${name} deve permanecer inline antes da extração`);
  const paren = container.indexOf('(', start);
  let i = paren;
  let depth = 0;
  let quote = null;
  let escaped = false;
  while (i < container.length) {
    const c = container[i];
    if (quote) {
      if (escaped) escaped = false;
      else if (c === '\\') escaped = true;
      else if (c === quote) quote = null;
      i += 1;
      continue;
    }
    if (c === "'" || c === '"' || c === '`') { quote = c; i += 1; continue; }
    if (c === '(') depth += 1;
    else if (c === ')') { depth -= 1; if (depth === 0) break; }
    i += 1;
  }
  let brace = i + 1;
  while (/\s/.test(container[brace] || '')) brace += 1;
  assert.equal(container[brace], '{');
  depth = 0;
  quote = null;
  escaped = false;
  for (i = brace; i < container.length; i += 1) {
    const c = container[i];
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
      if (depth === 0) return container.slice(start, i + 1);
    }
  }
  throw new Error(`fim de ${name} não encontrado`);
}

function loadValidateConfig() {
  delete require.cache[require.resolve(MODULE)];
  return require(MODULE).validateConfig;
}

function throwsMessage(fn, pattern) {
  assert.throws(fn, error => error instanceof Error && pattern.test(error.message));
}

test('validateConfig mantém identidade exata antes da extração', () => {
  const source = functionSource(fs.readFileSync(MODULE, 'utf8'), 'validateConfig');
  assert.equal(Buffer.byteLength(source, 'utf8'), EXPECTED_BYTES);
  assert.equal(source.split(/\r?\n/).length, EXPECTED_LINES);
  assert.equal(crypto.createHash('sha256').update(source).digest('hex'), EXPECTED_SHA256);
  const moduleSource = fs.readFileSync(MODULE, 'utf8');
  assert.equal(Buffer.byteLength(moduleSource, 'utf8'), MODULE_BYTES);
  assert.equal(crypto.createHash('sha256').update(moduleSource).digest('hex'), MODULE_SHA256);
  const api = require(MODULE);
  assert.equal(Object.isFrozen(api), true);
  assert.deepEqual(Object.keys(api), ['validateConfig']);
});



test('index carrega validação externa antes do núcleo e remove declaração inline', () => {
  const html = fs.readFileSync(HTML, 'utf8');
  assert.equal(html.split(REFERENCE).length - 1, 1);
  const anchor = html.indexOf('window.__FlightFlowFirBridge = Object.freeze({');
  const mainScript = html.lastIndexOf('<script', anchor);
  assert.ok(html.indexOf(REFERENCE) < mainScript);
  const kernel = kernelSource();
  assert.ok(kernel.includes('const ConfigValidation = window.FlightFlowConfigValidation;'));
  assert.ok(kernel.includes("if (!ConfigValidation) throw new Error('FlightFlowConfigValidation não foi carregado.');"));
  assert.ok(kernel.includes('const { validateConfig } = ConfigValidation;'));
  assert.doesNotMatch(kernel, /function\s+validateConfig\s*\(/);
});

test('validateConfig mantém fronteira pura e exatamente um consumidor', () => {
  const kernel = kernelSource();
  const source = functionSource(fs.readFileSync(MODULE, 'utf8'), 'validateConfig');
  assert.equal([...kernel.matchAll(/(?<![\w$.])validateConfig\s*\(/g)].length, 1);
  assert.match(kernel, /validateConfig\(input\);\s*state\.config = mergeConfig\(input\);/);
  for (const token of [
    'state.', 'els.', 'document.', 'window.', 'localStorage', 'sessionStorage',
    'indexedDB', 'fetch(', 'goTo(', 'renderCurrent(', 'setTimeout(', 'setInterval(',
    'requestAnimationFrame(', 'navigator.', 'google.', 'L.', 'Parser', 'realMapState',
    'CustomEvent', 'dispatchEvent', 'addEventListener', 'querySelector', 'getElementById'
  ]) assert.equal(source.includes(token), false, `acoplamento inesperado: ${token}`);
});

test('validateConfig aceita objeto vazio, arrays e configuração válida sem retorno', () => {
  const validateConfig = loadValidateConfig();
  assert.equal(validateConfig({}), undefined);
  assert.equal(validateConfig([]), undefined);
  assert.equal(validateConfig({
    theme: 'light',
    fontScale: 1.25,
    visibleFields: ['callsign'],
    addressPatterns: ['ZBZX'],
    baseIntervalMs: 300,
    fpvShowFromProgress: 0,
    stripShowFromProgress: 1,
  }), undefined);
});

test('validateConfig rejeita conteúdo ausente ou não objeto', () => {
  const validateConfig = loadValidateConfig();
  for (const value of [null, undefined, false, 0, '', 'texto', 42, () => {}]) {
    throwsMessage(() => validateConfig(value), /objeto JSON/);
  }
});

test('validateConfig preserva enumeração estrita do tema', () => {
  const validateConfig = loadValidateConfig();
  assert.equal(validateConfig({ theme: 'dark' }), undefined);
  assert.equal(validateConfig({ theme: 'light' }), undefined);
  assert.equal(validateConfig({ theme: 'velox' }), undefined);
  assert.equal(validateConfig({ theme: undefined }), undefined);
  for (const value of ['LIGHT', 'auto', '', null, 1]) {
    throwsMessage(() => validateConfig({ theme: value }), /theme deve ser/);
  }
});

test('validateConfig preserva limites e coerção numérica de fontScale', () => {
  const validateConfig = loadValidateConfig();
  for (const value of [.9, 1.6, '0.9', '1.6', 1.25]) assert.equal(validateConfig({ fontScale: value }), undefined);
  for (const value of [.899, 1.601, '0.5', '2']) throwsMessage(() => validateConfig({ fontScale: value }), /fontScale/);
  assert.equal(validateConfig({ fontScale: 'abc' }), undefined, 'NaN continua passando pelas comparações atuais');
});

test('validateConfig preserva validação condicional das listas', () => {
  const validateConfig = loadValidateConfig();
  assert.equal(validateConfig({ visibleFields: [] }), undefined);
  assert.equal(validateConfig({ addressPatterns: [] }), undefined);
  assert.equal(validateConfig({ visibleFields: null, addressPatterns: '' }), undefined);
  throwsMessage(() => validateConfig({ visibleFields: {} }), /visibleFields/);
  throwsMessage(() => validateConfig({ addressPatterns: 'ZBZX' }), /addressPatterns/);
});

test('validateConfig preserva piso de baseIntervalMs e comportamento NaN atual', () => {
  const validateConfig = loadValidateConfig();
  for (const value of [300, '300', 1000]) assert.equal(validateConfig({ baseIntervalMs: value }), undefined);
  for (const value of [299, '299', -1]) throwsMessage(() => validateConfig({ baseIntervalMs: value }), /baseIntervalMs/);
  assert.equal(validateConfig({ baseIntervalMs: 'abc' }), undefined);
});

test('validateConfig preserva intervalo inclusivo de progresso para FPV e strip', () => {
  const validateConfig = loadValidateConfig();
  for (const key of ['fpvShowFromProgress', 'stripShowFromProgress']) {
    for (const value of [0, 1, '0', '1', .5]) assert.equal(validateConfig({ [key]: value }), undefined);
    for (const value of [-.01, 1.01, '-1', '2']) throwsMessage(() => validateConfig({ [key]: value }), /deve ficar entre 0 e 1/);
    assert.equal(validateConfig({ [key]: 'abc' }), undefined, 'NaN continua passando pelas comparações atuais');
  }
});
