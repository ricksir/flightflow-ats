'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const crypto = require('node:crypto');

const HTML = fs.readFileSync('index.html', 'utf8');
const scriptMatches = [...HTML.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)];
const KERNEL = scriptMatches.map(match => match[1]).sort((a, b) => b.length - a.length)[0];

const FUNCTION_NAME = 'initSourceManager';
const EXPECTED_SOURCE = [
  'function initSourceManager() {',
  '    renderSourceManager();',
  '  }'
].join('\n');
const EXPECTED_BYTES = 61;
const EXPECTED_SHA256 = '0b4e495f5f6fb8f779c9cd0e056ed3f7f6e0bbcaf5b82500186ad34b40461a94';

function extractNamedFunction(source, name) {
  const marker = new RegExp('\\bfunction\\s+' + name + '\\s*\\([^)]*\\)\\s*\\{', 'g');
  const match = marker.exec(source);
  assert.ok(match, name + ' deve existir no núcleo');
  const start = match.index;
  const braceStart = start + match[0].length - 1;
  let depth = 0;
  let mode = 'code';

  for (let i = braceStart; i < source.length; i += 1) {
    const c = source[i];
    const n = source[i + 1];
    if (mode === 'code') {
      if (c === "'") mode = 'sq';
      else if (c === '"') mode = 'dq';
      else if (c === '`') mode = 'tpl';
      else if (c === '/' && n === '/') { mode = 'line'; i += 1; }
      else if (c === '/' && n === '*') { mode = 'block'; i += 1; }
      else if (c === '{') depth += 1;
      else if (c === '}') {
        depth -= 1;
        if (depth === 0) return source.slice(start, i + 1);
      }
    } else if (mode === 'sq') {
      if (c === '\\') i += 1;
      else if (c === "'") mode = 'code';
    } else if (mode === 'dq') {
      if (c === '\\') i += 1;
      else if (c === '"') mode = 'code';
    } else if (mode === 'tpl') {
      if (c === '\\') i += 1;
      else if (c === '`') mode = 'code';
    } else if (mode === 'line') {
      if (c === '\n') mode = 'code';
    } else if (mode === 'block') {
      if (c === '*' && n === '/') { mode = 'code'; i += 1; }
    }
  }

  throw new Error('fim de ' + name + ' não encontrado');
}

function loadFunction(renderSourceManager) {
  const source = extractNamedFunction(KERNEL, FUNCTION_NAME);
  return Function('renderSourceManager', source + '\nreturn initSourceManager;')(renderSourceManager);
}

test('initSourceManager mantém identidade byte a byte antes da extração', () => {
  const source = extractNamedFunction(KERNEL, FUNCTION_NAME);
  assert.equal(source, EXPECTED_SOURCE);
  assert.equal(Buffer.byteLength(source, 'utf8'), EXPECTED_BYTES);
  assert.equal(crypto.createHash('sha256').update(source, 'utf8').digest('hex'), EXPECTED_SHA256);
});

test('initSourceManager permanece uma fronteira mínima sem acoplamento sensível', () => {
  const source = extractNamedFunction(KERNEL, FUNCTION_NAME);
  assert.equal((source.match(/\brenderSourceManager\s*\(/g) || []).length, 1);
  for (const token of [
    'goTo(', 'renderCurrent(', 'currentEvent(', 'state.', 'els.', 'document.', 'window.',
    'localStorage', 'sessionStorage', 'indexedDB', 'fetch(', 'setTimeout(', 'setInterval(',
    'google.', 'L.', 'realMapState', 'route', 'planner', 'interpol', 'aircraft', 'timeline',
    'scrubber', 'autoplay', 'DEP'
  ]) {
    assert.equal(source.includes(token), false, 'acoplamento inesperado: ' + token);
  }
});

test('initSourceManager mantém o único consumidor executável via safeInit', () => {
  const exactConsumer = "safeInit('gerenciador de fontes', initSourceManager);";
  assert.equal(KERNEL.split(exactConsumer).length - 1, 1);
  assert.equal((KERNEL.match(/\binitSourceManager\s*\(/g) || []).length, 1, 'não deve existir chamada direta além da declaração');
});

test('initSourceManager chama renderSourceManager exatamente uma vez e preserva retorno undefined', () => {
  let calls = 0;
  const fn = loadFunction(() => { calls += 1; });
  const result = fn();
  assert.equal(calls, 1);
  assert.equal(result, undefined);
});

test('initSourceManager não intercepta erro de renderSourceManager', () => {
  const sentinel = new Error('sentinel');
  const fn = loadFunction(() => { throw sentinel; });
  assert.throws(() => fn(), error => error === sentinel);
});
