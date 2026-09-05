'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = path.resolve(__dirname, '..');
const HTML = path.join(ROOT, 'index.html');
const MODULE = path.join(ROOT, 'src', 'timeline', 'communication-context-utils.js');
const EXPECTED_BYTES = 628;
const EXPECTED_LINES = 10;
const EXPECTED_SHA256 = 'f844273330a6cec8df2f8137c209159434d7e76a1076b39e256f79cd5f4fc71a';
const EXPECTED_CONSUMERS = 1;

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
  assert.ok(start >= 0, `${name} deve existir no módulo após a extração`);
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

function loadFunction() {
  const source = functionSource(fs.readFileSync(MODULE, 'utf8'), 'internalTransitionDetails');
  return Function(`${source}; return internalTransitionDetails;`)();
}

test('internalTransitionDetails mantém identidade exata antes da extração', () => {
  const source = functionSource(fs.readFileSync(MODULE, 'utf8'), 'internalTransitionDetails');
  assert.equal(Buffer.byteLength(source, 'utf8'), EXPECTED_BYTES);
  assert.equal(source.split(/\r?\n/).length, EXPECTED_LINES);
  assert.equal(crypto.createHash('sha256').update(source).digest('hex'), EXPECTED_SHA256);
});

test('internalTransitionDetails permanece folha local e desacoplada de infraestrutura', () => {
  const source = functionSource(fs.readFileSync(MODULE, 'utf8'), 'internalTransitionDetails');
  for (const token of [
    'state.', 'els.', 'document.', 'window.', 'localStorage', 'sessionStorage',
    'indexedDB', 'fetch(', 'goTo(', 'renderCurrent(', 'stopPlayback(', 'setTimeout(',
    'setInterval(', 'requestAnimationFrame(', 'navigator.', 'google.', 'L.', 'Parser',
    'realMapState', 'CustomEvent', 'dispatchEvent', 'addEventListener', 'querySelector',
    'getElementById'
  ]) assert.equal(source.includes(token), false, `acoplamento inesperado: ${token}`);
  assert.ok(source.includes("const normalize = value => String(value == null ? '' : value).trim();"));
});

test('internalTransitionDetails mantém exatamente um consumidor real', () => {
  const kernel = kernelSource();
  assert.equal(kernel.includes('function internalTransitionDetails('), false, 'internalTransitionDetails não deve permanecer inline');
  const consumers = [...kernel.matchAll(/(?<![\w$.])internalTransitionDetails\s*\(/g)].length;
  assert.equal(consumers, EXPECTED_CONSUMERS);
  assert.ok(kernel.includes('const { internalTransitionDetails } = CommunicationContextUtils;'));
});

test('rawBlock prevalece sobre snapshot e preserva trim e regex case-insensitive', () => {
  const fn = loadFunction();
  const result = fn({
    snapshot: {
      previousControlState: ' SNAP PREV ',
      groundState: ' SNAP CURRENT ',
      authorizationState: ' SNAP AUTH ',
    },
    rawBlock: 'estado anterior:   RAW PREV  \nESTADO ATUAL:   RAW CURRENT  ',
  });
  assert.deepEqual(result, { previous: 'RAW PREV', current: 'RAW CURRENT' });
});

test('snapshot fornece fallback anterior, groundState e authorizationState', () => {
  const fn = loadFunction();
  assert.deepEqual(fn({
    snapshot: { previousControlState: ' PREV ', groundState: ' GROUND ', authorizationState: ' AUTH ' },
  }), { previous: 'PREV', current: 'GROUND' });
  assert.deepEqual(fn({
    snapshot: { previousControlState: ' PREV ', authorizationState: ' AUTH ' },
  }), { previous: 'PREV', current: 'AUTH' });
});

test('evento ausente e valores nulos preservam retorno vazio conhecido', () => {
  const fn = loadFunction();
  assert.deepEqual(fn(null), { previous: '', current: '' });
  assert.deepEqual(fn({ snapshot: { previousControlState: null, groundState: null, authorizationState: null } }), {
    previous: '', current: ''
  });
});
