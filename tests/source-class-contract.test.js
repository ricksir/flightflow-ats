'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = path.resolve(__dirname, '..');
const HTML = path.join(ROOT, 'index.html');
const EXPECTED_BYTES = 289;
const EXPECTED_LINES = 8;
const EXPECTED_SHA256 = '218601658b8d5f0826ff053c155579ae404ffec1cb8612a9192fd9be504c5df9';

function kernelSource() {
  const html = fs.readFileSync(HTML, 'utf8');
  const anchor = 'window.__FlightFlowFirBridge = Object.freeze({';
  const anchorIndex = html.indexOf(anchor);
  assert.ok(anchorIndex >= 0, 'ponte FIR deve continuar no IIFE principal');
  const open = html.lastIndexOf('<script', anchorIndex);
  const bodyStart = html.indexOf('>', open) + 1;
  const close = html.indexOf('</script>', anchorIndex);
  return html.slice(bodyStart, close);
}

function sourceClassSource() {
  const kernel = kernelSource();
  const marker = '  function getSourceClass(';
  const start = kernel.indexOf(marker);
  assert.ok(start >= 0, 'getSourceClass deve permanecer inline antes da extração');
  const brace = kernel.indexOf('{', start);
  let depth = 0;
  let quote = null;
  let escaped = false;
  for (let index = brace; index < kernel.length; index += 1) {
    const char = kernel[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === quote) quote = null;
      continue;
    }
    if (char === "'" || char === '"' || char === '`') { quote = char; continue; }
    if (char === '{') depth += 1;
    else if (char === '}') {
      depth -= 1;
      if (depth === 0) return kernel.slice(start, index + 1);
    }
  }
  throw new Error('fim de getSourceClass não encontrado');
}

test('getSourceClass mantém identidade exata antes da extração', () => {
  const source = sourceClassSource();
  assert.equal(Buffer.byteLength(source, 'utf8'), EXPECTED_BYTES);
  assert.equal(source.split(/\r?\n/).length, EXPECTED_LINES);
  assert.equal(crypto.createHash('sha256').update(source).digest('hex'), EXPECTED_SHA256);
});

test('getSourceClass permanece pura e sem dependência do estado ou DOM', () => {
  const source = sourceClassSource();
  for (const forbidden of ['state.', 'els.', 'document.', 'window.', 'localStorage', 'indexedDB', 'goTo(', 'renderCurrent(', 'stopPlayback(']) {
    assert.equal(source.includes(forbidden), false, `acoplamento inesperado: ${forbidden}`);
  }
});

test('getSourceClass mantém somente um consumidor no IIFE, o wiring da timeline', () => {
  const kernel = kernelSource();
  const calls = [...kernel.matchAll(/(?<![\w$.])getSourceClass\s*\(/g)].length - 1;
  assert.equal(calls, 1);
  assert.ok(kernel.includes('getSourceClass: (...args) => getSourceClass(...args),'));
});
