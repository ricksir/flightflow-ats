'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');
const HTML = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const MODULE_PATH = path.join(ROOT, 'src', 'ui', 'strip-cell-renderer.js');
const MODULE_SOURCE = fs.readFileSync(MODULE_PATH, 'utf8');
const scriptMatches = [...HTML.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)];
const KERNEL = scriptMatches.map(match => match[1]).sort((a, b) => b.length - a.length)[0];

const FUNCTION_NAME = 'stripCell';
const EXPECTED_SOURCE = Buffer.from(
  'ZnVuY3Rpb24gc3RyaXBDZWxsKGNvZGUsdmFsdWUsY2xzPScnLGNoYW5nZWQ9ZmFsc2Upe2NvbnN0IGRlZj1TVFJJUF9GSUVMRF9ERUZTW2NvZGVdO3JldHVybiBgPGJ1dHRvbiB0eXBlPSJidXR0b24iIGNsYXNzPSJzdHJpcC1jZWxsICR7Y2xzfSAke2NoYW5nZWQ/J3VwZGF0ZWQnOicnfSIgZGF0YS1zdHJpcC1maWVsZD0iJHtjb2RlfSIgZGF0YS1zdHJpcC12YWx1ZT0iJHtlc2NhcGVIdG1sKGRpc3BsYXlWYWx1ZSh2YWx1ZSwnJykpfSIgZGF0YS1zdHJpcC11cGRhdGVkPSIke2NoYW5nZWQ/J3RydWUnOidmYWxzZSd9IiB0aXRsZT0iQ29uc3VsdGFyICR7ZXNjYXBlSHRtbChkZWY/ZGVmLmxhYmVsOmNvZGUpfSBlIG8gc2lnbmlmaWNhZG8gZGEgY29yIj48c3BhbiBjbGFzcz0ic3RyaXAtY29kZSI+JHtjb2RlfTwvc3Bhbj48c3BhbiBjbGFzcz0ic3RyaXAtdmFsdWUiPiR7ZXNjYXBlSHRtbChkaXNwbGF5VmFsdWUodmFsdWUsJycpKX08L3NwYW4+PC9idXR0b24+YDt9',
  'base64'
).toString('utf8');
const EXPECTED_BYTES = 492;
const EXPECTED_SHA256 = '955b9c7f2e44a4d125a446c31816357fc082ac2209c691bfe5c126cd81729dd4';
const MODULE_BYTES = 1086;
const MODULE_SHA256 = 'a7c35321091617905045854b32c93b2623a7f548e7a302a4fb1d9c467e41c5d4';

function extractNamedFunction(source, name) {
  const marker = new RegExp('\\bfunction\\s+' + name + '\\s*\\([^)]*\\)\\s*\\{', 'g');
  const match = marker.exec(source);
  assert.ok(match, name + ' deve existir');
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

function loadFunction(stripFieldDefs, escapeHtml, displayValue) {
  const source = extractNamedFunction(MODULE_SOURCE, FUNCTION_NAME);
  return Function(
    'STRIP_FIELD_DEFS',
    'escapeHtml',
    'displayValue',
    source + '\nreturn stripCell;'
  )(stripFieldDefs, escapeHtml, displayValue);
}

function loadApi() {
  const context = { window: {} };
  vm.runInNewContext(MODULE_SOURCE, context);
  return context.window.FlightFlowStripCellRenderer;
}

test('módulo strip-cell-renderer mantém identidade estrutural congelada', () => {
  assert.equal(Buffer.byteLength(MODULE_SOURCE, 'utf8'), MODULE_BYTES);
  assert.equal(crypto.createHash('sha256').update(MODULE_SOURCE).digest('hex'), MODULE_SHA256);
  assert.match(MODULE_SOURCE, /^\(function \(\) \{\n  'use strict';/);
  assert.match(MODULE_SOURCE, /\}\)\(\);\n$/);
});

test('stripCell preserva exatamente o corpo congelado após a extração', () => {
  const source = extractNamedFunction(MODULE_SOURCE, FUNCTION_NAME);
  assert.equal(source, EXPECTED_SOURCE);
  assert.equal(Buffer.byteLength(source, 'utf8'), EXPECTED_BYTES);
  assert.equal(crypto.createHash('sha256').update(source, 'utf8').digest('hex'), EXPECTED_SHA256);
});

test('API pública exige as três dependências e retorna fronteira congelada', () => {
  const api = loadApi();
  assert.ok(api);
  assert.equal(Object.isFrozen(api), true);
  assert.deepEqual(Object.keys(api), ['create']);
  assert.throws(() => api.create({}), /FlightFlowStripCellRenderer requer stripFieldDefs, escapeHtml e displayValue/);
  assert.throws(() => api.create({ stripFieldDefs: {}, escapeHtml: value => String(value) }), /FlightFlowStripCellRenderer requer stripFieldDefs, escapeHtml e displayValue/);
  const scoped = api.create({
    stripFieldDefs: {},
    escapeHtml: value => String(value),
    displayValue: value => String(value ?? ''),
  });
  assert.equal(Object.isFrozen(scoped), true);
  assert.deepEqual(Object.keys(scoped), ['stripCell']);
});

test('stripCell permanece sem acoplamento direto com estado, DOM, infraestrutura ou núcleo temporal/espacial', () => {
  const source = extractNamedFunction(MODULE_SOURCE, FUNCTION_NAME);
  for (const token of [
    'state.', 'els.', 'document.', 'window.', 'localStorage', 'sessionStorage', 'indexedDB',
    'fetch(', 'setTimeout(', 'setInterval(', 'goTo(', 'renderCurrent(', 'currentEvent(',
    'route', 'planner', 'interpol', 'aircraft', 'timeline', 'scrubber', 'autoplay', 'DEP',
    'map', 'motion', 'coordinate', 'runway', 'geometry'
  ]) {
    assert.equal(source.includes(token), false, 'acoplamento inesperado: ' + token);
  }
  assert.equal((source.match(/\bSTRIP_FIELD_DEFS\s*\[/g) || []).length, 1);
  assert.equal((source.match(/\bescapeHtml\s*\(/g) || []).length, 3);
  assert.equal((source.match(/\bdisplayValue\s*\(/g) || []).length, 2);
});

test('stripCell compõe markup exato e chama dependências na ordem congelada', () => {
  const calls = [];
  const defs = { Q1: { label: 'Primeiro <ponto>' } };
  const fn = loadFunction(
    defs,
    value => { calls.push(['escape', value]); return '[' + String(value) + ']'; },
    (value, empty) => { calls.push(['display', value, empty]); return 'D(' + String(value) + '|' + String(empty) + ')'; }
  );

  const html = fn('Q1', 'PADIL<&', 'strip-q1', false);

  assert.equal(
    html,
    '<button type="button" class="strip-cell strip-q1 " data-strip-field="Q1" data-strip-value="[D(PADIL<&|)]" data-strip-updated="false" title="Consultar [Primeiro <ponto>] e o significado da cor"><span class="strip-code">Q1</span><span class="strip-value">[D(PADIL<&|)]</span></button>'
  );
  assert.deepEqual(calls, [
    ['display', 'PADIL<&', ''],
    ['escape', 'D(PADIL<&|)'],
    ['escape', 'Primeiro <ponto>'],
    ['display', 'PADIL<&', ''],
    ['escape', 'D(PADIL<&|)']
  ]);
});

test('stripCell preserva marcadores de atualização e classe adicional', () => {
  const fn = loadFunction(
    { P1: { label: 'Nível' } },
    value => String(value),
    value => String(value ?? '')
  );

  const html = fn('P1', 'FL350', 'strip-p1 warning', true);

  assert.ok(html.startsWith('<button type="button" class="strip-cell strip-p1 warning updated"'));
  assert.ok(html.includes('data-strip-updated="true"'));
  assert.ok(html.includes('data-strip-field="P1"'));
  assert.ok(html.includes('<span class="strip-value">FL350</span>'));
});

test('stripCell preserva fallback do título para código desconhecido sem alterar os pontos de escaping', () => {
  const escaped = [];
  const fn = loadFunction(
    {},
    value => { escaped.push(value); return '[' + String(value) + ']'; },
    (value, empty) => value === '' ? empty : String(value)
  );

  const html = fn('X<Y', '', '', false);

  assert.equal(
    html,
    '<button type="button" class="strip-cell  " data-strip-field="X<Y" data-strip-value="[]" data-strip-updated="false" title="Consultar [X<Y] e o significado da cor"><span class="strip-code">X<Y</span><span class="strip-value">[]</span></button>'
  );
  assert.deepEqual(escaped, ['', 'X<Y', '']);
});

test('stripCell não modifica definições nem argumentos de entrada', () => {
  const defs = { E: { label: 'Indicativo' } };
  const value = { a: 1 };
  const beforeDefs = JSON.parse(JSON.stringify(defs));
  const beforeValue = JSON.parse(JSON.stringify(value));
  const fn = loadFunction(
    defs,
    valueToEscape => String(valueToEscape),
    valueToDisplay => JSON.stringify(valueToDisplay)
  );

  fn('E', value, 'strip-e', true);

  assert.deepEqual(defs, beforeDefs);
  assert.deepEqual(value, beforeValue);
});

test('erros das dependências continuam propagando sem interceptação', () => {
  const sentinelDisplay = new Error('display sentinel');
  const displayFail = loadFunction(
    { E: { label: 'Indicativo' } },
    value => String(value),
    () => { throw sentinelDisplay; }
  );
  assert.throws(() => displayFail('E', 'PTABC'), error => error === sentinelDisplay);

  const sentinelEscape = new Error('escape sentinel');
  const escapeFail = loadFunction(
    { E: { label: 'Indicativo' } },
    () => { throw sentinelEscape; },
    value => String(value)
  );
  assert.throws(() => escapeFail('E', 'PTABC'), error => error === sentinelEscape);
});

test('index carrega módulo antes do IIFE e injeta dependências explicitamente', () => {
  const moduleScript = '<script id="flightflow-strip-cell-renderer" src="src/ui/strip-cell-renderer.js"></script>';
  const parserBinding = 'const Parser = window.FlightParser;';
  assert.ok(HTML.includes(moduleScript));
  assert.ok(HTML.indexOf(moduleScript) < HTML.indexOf(parserBinding));

  const defsIndex = HTML.indexOf('const STRIP_FIELD_DEFS = Object.freeze({');
  const wiringIndex = HTML.indexOf('const StripCellRenderer = window.FlightFlowStripCellRenderer;');
  assert.ok(defsIndex >= 0 && wiringIndex > defsIndex);

  assert.ok(KERNEL.includes('const StripCellRenderer = window.FlightFlowStripCellRenderer;'));
  assert.ok(KERNEL.includes("if (!StripCellRenderer) throw new Error('FlightFlowStripCellRenderer não foi carregado.');"));
  assert.ok(KERNEL.includes('const { stripCell } = StripCellRenderer.create({'));
  assert.ok(KERNEL.includes('stripFieldDefs: STRIP_FIELD_DEFS,'));
  assert.ok(KERNEL.includes('escapeHtml,'));
  assert.ok(KERNEL.includes('displayValue,'));
});

test('núcleo mantém as 24 chamadas em renderStrip e não redeclara stripCell', () => {
  const renderStrip = extractNamedFunction(KERNEL, 'renderStrip');

  assert.equal((KERNEL.match(/\bfunction\s+stripCell\s*\(/g) || []).length, 0);
  assert.equal((KERNEL.match(/\bstripCell\b/g) || []).length, 25);
  assert.equal((KERNEL.match(/\bstripCell\s*\(/g) || []).length, 24);
  assert.equal((renderStrip.match(/\bstripCell\s*\(/g) || []).length, 24);

  const outside = KERNEL.replace(renderStrip, '');
  assert.equal((outside.match(/\bstripCell\b/g) || []).length, 1);
  assert.ok(outside.includes('const { stripCell } = StripCellRenderer.create({'));
});
