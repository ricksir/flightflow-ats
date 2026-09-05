'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = path.resolve(__dirname, '..');
const HTML = path.join(ROOT, 'index.html');
const MODULE = path.join(ROOT, 'src', 'timeline', 'timeline-builder-controller.js');
const EXPECTED_BYTES = 289;
const EXPECTED_LINES = 8;
const EXPECTED_SHA256 = '218601658b8d5f0826ff053c155579ae404ffec1cb8612a9192fd9be504c5df9';

function functionSource(container, name) {
  const marker = `  function ${name}(`;
  const start = container.indexOf(marker);
  assert.ok(start >= 0, `${name} deve existir`);
  const brace = container.indexOf('{', start);
  let depth = 0;
  let quote = null;
  let escaped = false;
  for (let index = brace; index < container.length; index += 1) {
    const char = container[index];
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
      if (depth === 0) return container.slice(start, index + 1);
    }
  }
  throw new Error(`fim de ${name} não encontrado`);
}

function kernelSource() {
  const html = fs.readFileSync(HTML, 'utf8');
  const anchor = 'window.__FlightFlowFirBridge = Object.freeze({';
  const anchorIndex = html.indexOf(anchor);
  assert.ok(anchorIndex >= 0);
  const open = html.lastIndexOf('<script', anchorIndex);
  const bodyStart = html.indexOf('>', open) + 1;
  const close = html.indexOf('</script>', anchorIndex);
  return html.slice(bodyStart, close);
}

test('getSourceClass foi movida preservando exatamente a identidade congelada', () => {
  const module = fs.readFileSync(MODULE, 'utf8');
  const source = functionSource(module, 'getSourceClass');
  assert.equal(Buffer.byteLength(source, 'utf8'), EXPECTED_BYTES);
  assert.equal(source.split(/\r?\n/).length, EXPECTED_LINES);
  assert.equal(crypto.createHash('sha256').update(source).digest('hex'), EXPECTED_SHA256);
});

test('getSourceClass permanece pura dentro do timeline builder', () => {
  const module = fs.readFileSync(MODULE, 'utf8');
  const source = functionSource(module, 'getSourceClass');
  for (const forbidden of ['state.', 'els.', 'document.', 'window.', 'localStorage', 'indexedDB', 'goTo(', 'renderCurrent(', 'stopPlayback(']) {
    assert.equal(source.includes(forbidden), false, `acoplamento inesperado: ${forbidden}`);
  }
});

test('getSourceClass deixa de ser dependência do IIFE e permanece interna ao módulo', () => {
  const kernel = kernelSource();
  const module = fs.readFileSync(MODULE, 'utf8');
  assert.equal(kernel.includes('function getSourceClass('), false);
  assert.equal(kernel.includes('getSourceClass: (...args) => getSourceClass(...args),'), false);
  assert.ok(module.includes('function getSourceClass('));
  assert.equal(module.includes('const getSourceClass = options.getSourceClass;'), false);
  assert.equal(module.includes('requer getSourceClass()'), false);
  const Controller = require(MODULE);
  assert.deepEqual(Object.keys(Controller), ['create']);
});
