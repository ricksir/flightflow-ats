'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const crypto = require('node:crypto');

const HTML = fs.readFileSync('index.html', 'utf8');
const scriptMatches = [...HTML.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)];
const KERNEL = scriptMatches.map(match => match[1]).sort((a, b) => b.length - a.length)[0];

const FUNCTION_NAME = 'normalizeFieldLayout';
const EXPECTED_SOURCE = [
  'function normalizeFieldLayout(input = {}) {',
  '    const output = {};',
  '    Object.keys(FIELD_DEFS).forEach(key => {',
  '      const saved = input && input[key] ? input[key] : null;',
  '      output[key] = { span: Number(saved && saved.span) === 2 ? 2 : (FIELD_DEFS[key].wide ? 2 : 1) };',
  '    });',
  '    return output;',
  '  }'
].join('\n');
const EXPECTED_BYTES = 305;
const EXPECTED_SHA256 = '2c8020e2b246838efdd49aead1331b9167be70745f07799bb3b54623685a2eca';

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

function loadFunction(fieldDefs) {
  const source = extractNamedFunction(KERNEL, FUNCTION_NAME);
  return Function('FIELD_DEFS', source + '\nreturn normalizeFieldLayout;')(fieldDefs);
}

test('normalizeFieldLayout mantém identidade byte a byte antes da extração', () => {
  const source = extractNamedFunction(KERNEL, FUNCTION_NAME);
  assert.equal(source, EXPECTED_SOURCE);
  assert.equal(Buffer.byteLength(source, 'utf8'), EXPECTED_BYTES);
  assert.equal(crypto.createHash('sha256').update(source, 'utf8').digest('hex'), EXPECTED_SHA256);
});

test('normalizeFieldLayout permanece puro e depende somente de FIELD_DEFS', () => {
  const source = extractNamedFunction(KERNEL, FUNCTION_NAME);
  for (const token of [
    'state.', 'els.', 'document.', 'window.', 'localStorage', 'sessionStorage', 'indexedDB',
    'fetch(', 'setTimeout(', 'setInterval(', 'goTo(', 'renderCurrent(', 'currentEvent(',
    'route', 'planner', 'interpol', 'aircraft', 'timeline', 'scrubber', 'autoplay', 'DEP'
  ]) {
    assert.equal(source.includes(token), false, 'acoplamento inesperado: ' + token);
  }
  assert.equal((source.match(/\bFIELD_DEFS\b/g) || []).length, 2);
});

test('normalizeFieldLayout cria saída apenas para as chaves de FIELD_DEFS', () => {
  const fieldDefs = Object.freeze({
    normal: Object.freeze({ wide: false }),
    wide: Object.freeze({ wide: true }),
    other: Object.freeze({ wide: false }),
  });
  const input = Object.freeze({
    normal: Object.freeze({ span: 2 }),
    wide: Object.freeze({ span: 1 }),
    extra: Object.freeze({ span: 2 }),
  });
  const before = JSON.stringify(input);
  const fn = loadFunction(fieldDefs);
  const result = fn(input);

  assert.deepEqual(result, {
    normal: { span: 2 },
    wide: { span: 2 },
    other: { span: 1 },
  });
  assert.equal(Object.prototype.hasOwnProperty.call(result, 'extra'), false);
  assert.equal(JSON.stringify(input), before, 'entrada não deve ser alterada');
});

test('normalizeFieldLayout preserva regra exata de largura e coerção Number', () => {
  const fieldDefs = {
    a: { wide: false },
    b: { wide: false },
    c: { wide: true },
    d: { wide: false },
  };
  const fn = loadFunction(fieldDefs);

  assert.deepEqual(fn({
    a: { span: '2' },
    b: { span: 1 },
    c: { span: 0 },
    d: { span: 'invalid' },
  }), {
    a: { span: 2 },
    b: { span: 1 },
    c: { span: 2 },
    d: { span: 1 },
  });

  assert.deepEqual(fn(null), {
    a: { span: 1 },
    b: { span: 1 },
    c: { span: 2 },
    d: { span: 1 },
  });
});

test('normalizeFieldLayout retorna objeto novo em chamadas independentes', () => {
  const fn = loadFunction({ a: { wide: false } });
  const first = fn({ a: { span: 2 } });
  const second = fn({ a: { span: 2 } });
  assert.notEqual(first, second);
  assert.notEqual(first.a, second.a);
  assert.deepEqual(first, second);
});

test('normalizeFieldLayout mantém exatamente dois consumidores executáveis no núcleo', () => {
  assert.equal(KERNEL.split('merged.fieldLayout = normalizeFieldLayout(merged.fieldLayout);').length - 1, 1);
  assert.equal(KERNEL.split('state.config.fieldLayout = normalizeFieldLayout(state.config.fieldLayout);').length - 1, 1);
  assert.equal((KERNEL.match(/\bnormalizeFieldLayout\s*\(/g) || []).length, 3);
});
