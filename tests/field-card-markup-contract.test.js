'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');
const HTML_PATH = path.join(ROOT, 'index.html');
const MODULE_PATH = path.join(ROOT, 'src', 'ui', 'field-card-renderer.js');
const HTML = fs.readFileSync(HTML_PATH, 'utf8');
const MODULE_SOURCE = fs.readFileSync(MODULE_PATH, 'utf8');
const scriptMatches = [...HTML.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)];
const KERNEL = scriptMatches.map(match => match[1]).sort((a, b) => b.length - a.length)[0];

const FUNCTION_NAME = 'fieldCardMarkup';
const EXPECTED_SOURCE = [
  'function fieldCardMarkup(key, def, valueHtml, labelHtml, before, changed) {',
  '    const layout = getFieldLayout(key);',
  '    return `<div class="field-card ${changed ? \'changed\' : \'\'}" data-field="${escapeHtml(key)}" data-span="${layout.span}">${fieldEditControlsMarkup(key)}',
  '      ${changed ? \'<span class="change-tag">ATUALIZADO</span>\' : \'\'}',
  '      <div class="field-label">${labelHtml}</div>',
  '      <div class="field-value">${valueHtml}</div>',
  '      <div class="field-previous">${escapeHtml(before && before !== \'—\' ? before : \'\')}</div>',
  '    </div>`;',
  '  }'
].join('\n');
const EXPECTED_BYTES = 552;
const EXPECTED_SHA256 = '4fc03165e4914b6b1f917826e7492019b6bee80efcbf834b8b260ad1cefcb39e';
const MODULE_BYTES = 1213;
const MODULE_SHA256 = 'e637279721a61c4b557740f1ae8edc6da30aa3f1ab71904c82d096849688da39';

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
  return context.window.FlightFlowFieldCardRenderer;
}

test('módulo field-card-renderer mantém identidade estrutural congelada', () => {
  assert.equal(Buffer.byteLength(MODULE_SOURCE, 'utf8'), MODULE_BYTES);
  assert.equal(crypto.createHash('sha256').update(MODULE_SOURCE).digest('hex'), MODULE_SHA256);
  assert.match(MODULE_SOURCE, /^\(function \(\) \{\n  'use strict';/);
  assert.match(MODULE_SOURCE, /\}\)\(\);\n$/);
});

test('fieldCardMarkup preserva exatamente o corpo congelado após a extração', () => {
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

  assert.throws(
    () => api.create({}),
    /FlightFlowFieldCardRenderer requer getFieldLayout, escapeHtml e fieldEditControlsMarkup/
  );
  assert.throws(
    () => api.create({
      getFieldLayout: () => ({ span: 1 }),
      escapeHtml: value => String(value),
    }),
    /FlightFlowFieldCardRenderer requer getFieldLayout, escapeHtml e fieldEditControlsMarkup/
  );

  const scoped = api.create({
    getFieldLayout: () => ({ span: 1 }),
    escapeHtml: value => String(value),
    fieldEditControlsMarkup: () => '',
  });
  assert.equal(Object.isFrozen(scoped), true);
  assert.deepEqual(Object.keys(scoped), ['fieldCardMarkup']);
});

test('fieldCardMarkup permanece sem acoplamento direto com estado, DOM ou núcleo temporal/espacial', () => {
  const source = extractNamedFunction(MODULE_SOURCE, FUNCTION_NAME);
  for (const token of [
    'state.', 'els.', 'document.', 'window.', 'localStorage', 'sessionStorage', 'indexedDB',
    'fetch(', 'setTimeout(', 'setInterval(', 'goTo(', 'renderCurrent(', 'currentEvent(',
    'route', 'planner', 'interpol', 'aircraft', 'timeline', 'scrubber', 'autoplay', 'DEP'
  ]) {
    assert.equal(source.includes(token), false, 'acoplamento inesperado: ' + token);
  }
  assert.equal((source.match(/\bgetFieldLayout\s*\(/g) || []).length, 1);
  assert.equal((source.match(/\bfieldEditControlsMarkup\s*\(/g) || []).length, 1);
});

test('fieldCardMarkup usa layout, controles e escaping nos pontos exatos', () => {
  const calls = [];
  const fn = loadApi().create({
    getFieldLayout: key => { calls.push(['layout', key]); return { span: 2 }; },
    escapeHtml: value => { calls.push(['escape', value]); return '[' + String(value) + ']'; },
    fieldEditControlsMarkup: key => { calls.push(['controls', key]); return '<controls>'; },
  }).fieldCardMarkup;

  const html = fn('status', { label: 'unused' }, '<VALUE>', '<LABEL>', 'ANTES', false);

  assert.equal(
    html,
    '<div class="field-card " data-field="[status]" data-span="2"><controls>\n' +
      '      \n' +
      '      <div class="field-label"><LABEL></div>\n' +
      '      <div class="field-value"><VALUE></div>\n' +
      '      <div class="field-previous">[ANTES]</div>\n' +
      '    </div>'
  );
  assert.deepEqual(calls, [
    ['layout', 'status'],
    ['escape', 'status'],
    ['controls', 'status'],
    ['escape', 'ANTES']
  ]);
});

test('fieldCardMarkup preserva classe e tag ATUALIZADO quando changed é verdadeiro', () => {
  const fn = loadApi().create({
    getFieldLayout: () => ({ span: 1 }),
    escapeHtml: value => String(value),
    fieldEditControlsMarkup: () => '',
  }).fieldCardMarkup;

  const html = fn('callsign', null, 'VALOR', 'RÓTULO', '', true);
  assert.match(html, /^<div class="field-card changed" data-field="callsign" data-span="1">/);
  assert.ok(html.includes('<span class="change-tag">ATUALIZADO</span>'));
  assert.ok(html.includes('<div class="field-label">RÓTULO</div>'));
  assert.ok(html.includes('<div class="field-value">VALOR</div>'));
});

test('fieldCardMarkup suprime o valor anterior quando vazio ou travessão', () => {
  const escaped = [];
  const fn = loadApi().create({
    getFieldLayout: () => ({ span: 1 }),
    escapeHtml: value => { escaped.push(value); return '[' + String(value) + ']'; },
    fieldEditControlsMarkup: () => '',
  }).fieldCardMarkup;

  const dash = fn('status', null, 'V', 'L', '—', false);
  const empty = fn('status', null, 'V', 'L', '', false);

  assert.ok(dash.includes('<div class="field-previous">[]</div>'));
  assert.ok(empty.includes('<div class="field-previous">[]</div>'));
  assert.deepEqual(escaped, ['status', '', 'status', '']);
});

test('fieldCardMarkup mantém valueHtml e labelHtml já preparados sem reescapar', () => {
  const fn = loadApi().create({
    getFieldLayout: () => ({ span: 1 }),
    escapeHtml: value => '[' + String(value) + ']',
    fieldEditControlsMarkup: () => '',
  }).fieldCardMarkup;

  const html = fn('status', {}, '<strong>VAL</strong>', '<button>LABEL</button>', '', false);
  assert.ok(html.includes('<div class="field-label"><button>LABEL</button></div>'));
  assert.ok(html.includes('<div class="field-value"><strong>VAL</strong></div>'));
});

test('erros das dependências continuam propagando sem interceptação', () => {
  const sentinel = new Error('sentinel');
  const fn = loadApi().create({
    getFieldLayout: () => { throw sentinel; },
    escapeHtml: value => String(value),
    fieldEditControlsMarkup: () => '',
  }).fieldCardMarkup;
  assert.throws(() => fn('status', {}, 'V', 'L', '', false), error => error === sentinel);
});

test('index carrega módulo antes do IIFE e injeta dependências explicitamente', () => {
  const moduleScript = '<script id="flightflow-field-card-renderer" src="src/ui/field-card-renderer.js"></script>';
  const parserBinding = 'const Parser = window.FlightParser;';
  assert.ok(HTML.includes(moduleScript));
  assert.ok(HTML.indexOf(moduleScript) < HTML.indexOf(parserBinding));

  assert.ok(KERNEL.includes('const FieldCardRenderer = window.FlightFlowFieldCardRenderer;'));
  assert.ok(KERNEL.includes("if (!FieldCardRenderer) throw new Error('FlightFlowFieldCardRenderer não foi carregado.');"));
  assert.ok(KERNEL.includes('const { fieldCardMarkup } = FieldCardRenderer.create({'));
  assert.ok(KERNEL.includes('getFieldLayout,'));
  assert.ok(KERNEL.includes('escapeHtml,'));
  assert.ok(KERNEL.includes('fieldEditControlsMarkup,'));
});

test('núcleo mantém os dois consumidores e não redeclara fieldCardMarkup', () => {
  assert.equal((KERNEL.match(/\bfunction\s+fieldCardMarkup\s*\(/g) || []).length, 0);
  assert.equal((KERNEL.match(/\bfieldCardMarkup\b/g) || []).length, 3);
  assert.equal((KERNEL.match(/\bfieldCardMarkup\s*\(/g) || []).length, 2);
  assert.equal(
    KERNEL.split("return fieldCardMarkup(key, def, '—', escapeHtml(def.label), '', false);").length - 1,
    1
  );
  assert.equal(
    KERNEL.split('cards.push(fieldCardMarkup(key, def, valueHtml, renderKnowledgeFieldLabel(key, def.label, snapshot[key], event), before, !!change));').length - 1,
    1
  );
});
