'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');
const HTML_PATH = path.join(ROOT, 'index.html');
const MODULE_PATH = path.join(ROOT, 'src', 'ui', 'field-layout-utils.js');
const HTML = fs.readFileSync(HTML_PATH, 'utf8');
const MODULE_SOURCE = fs.readFileSync(MODULE_PATH, 'utf8');
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
const MODULE_BYTES = 727;
const MODULE_SHA256 = '59e8560f2cc7407023daa9b416a57bcd6448e986628a1079c793dd079a878da8';

function extractNamedFunction(source, name) {
  const marker = new RegExp('\\bfunction\\s+' + name + '\\s*\\([^)]*\\)\\s*\\{', 'g');
  const match = marker.exec(source);
  assert.ok(match, name + ' deve existir no módulo');
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

function loadApi() {
  const context = { window: {} };
  vm.runInNewContext(MODULE_SOURCE, context);
  return context.window.FlightFlowFieldLayoutUtils;
}

function normalizeResult(value) {
  return JSON.parse(JSON.stringify(value));
}

test('módulo field-layout-utils mantém identidade estrutural congelada', () => {
  assert.equal(Buffer.byteLength(MODULE_SOURCE, 'utf8'), MODULE_BYTES);
  assert.equal(crypto.createHash('sha256').update(MODULE_SOURCE).digest('hex'), MODULE_SHA256);
  assert.match(MODULE_SOURCE, /^\(function \(\) \{\n  'use strict';/);
  assert.match(MODULE_SOURCE, /\}\)\(\);\n$/);
});

test('normalizeFieldLayout preserva exatamente o corpo congelado após a extração', () => {
  const source = extractNamedFunction(MODULE_SOURCE, FUNCTION_NAME);
  assert.equal(source, EXPECTED_SOURCE);
  assert.equal(Buffer.byteLength(source, 'utf8'), EXPECTED_BYTES);
  assert.equal(crypto.createHash('sha256').update(source, 'utf8').digest('hex'), EXPECTED_SHA256);
});

test('API pública exige fieldDefs e retorna fronteira congelada', () => {
  const api = loadApi();
  assert.ok(api);
  assert.equal(Object.isFrozen(api), true);
  assert.deepEqual(Object.keys(api), ['create']);
  assert.throws(() => api.create({}), /FlightFlowFieldLayoutUtils requer fieldDefs/);
  assert.throws(() => api.create({ fieldDefs: null }), /FlightFlowFieldLayoutUtils requer fieldDefs/);

  const scoped = api.create({ fieldDefs: { a: { wide: false } } });
  assert.equal(Object.isFrozen(scoped), true);
  assert.deepEqual(Object.keys(scoped), ['normalizeFieldLayout']);
});

test('normalizeFieldLayout permanece puro e depende somente de FIELD_DEFS', () => {
  const source = extractNamedFunction(MODULE_SOURCE, FUNCTION_NAME);
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
  const fn = loadApi().create({ fieldDefs }).normalizeFieldLayout;
  const result = normalizeResult(fn(input));

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
  const fn = loadApi().create({ fieldDefs }).normalizeFieldLayout;

  assert.deepEqual(normalizeResult(fn({
    a: { span: '2' },
    b: { span: 1 },
    c: { span: 0 },
    d: { span: 'invalid' },
  })), {
    a: { span: 2 },
    b: { span: 1 },
    c: { span: 2 },
    d: { span: 1 },
  });

  assert.deepEqual(normalizeResult(fn(null)), {
    a: { span: 1 },
    b: { span: 1 },
    c: { span: 2 },
    d: { span: 1 },
  });
});

test('normalizeFieldLayout retorna objeto novo em chamadas independentes', () => {
  const fn = loadApi().create({ fieldDefs: { a: { wide: false } } }).normalizeFieldLayout;
  const first = fn({ a: { span: 2 } });
  const second = fn({ a: { span: 2 } });
  assert.notEqual(first, second);
  assert.notEqual(first.a, second.a);
  assert.deepEqual(normalizeResult(first), normalizeResult(second));
});

test('index carrega módulo antes do IIFE e injeta FIELD_DEFS explicitamente', () => {
  const moduleScript = '<script id="flightflow-field-layout-utils" src="src/ui/field-layout-utils.js"></script>';
  const parserBinding = 'const Parser = window.FlightParser;';
  assert.ok(HTML.includes(moduleScript));
  assert.ok(HTML.indexOf(moduleScript) < HTML.indexOf(parserBinding));
  assert.ok(KERNEL.includes('const FieldLayoutUtils = window.FlightFlowFieldLayoutUtils;'));
  assert.ok(KERNEL.includes("if (!FieldLayoutUtils) throw new Error('FlightFlowFieldLayoutUtils não foi carregado.');"));
  assert.ok(KERNEL.includes('const { normalizeFieldLayout } = FieldLayoutUtils.create({ fieldDefs: FIELD_DEFS });'));
  assert.ok(KERNEL.includes('const FIELD_DEFS = Object.freeze({'));
});

test('núcleo mantém os dois consumidores e não redeclara normalizeFieldLayout', () => {
  assert.equal(KERNEL.split('merged.fieldLayout = normalizeFieldLayout(merged.fieldLayout);').length - 1, 1);
  assert.equal(KERNEL.split('state.config.fieldLayout = normalizeFieldLayout(state.config.fieldLayout);').length - 1, 1);
  assert.equal((KERNEL.match(/\bfunction\s+normalizeFieldLayout\s*\(/g) || []).length, 0);
  assert.equal((KERNEL.match(/\bnormalizeFieldLayout\s*\(/g) || []).length, 2);
});
