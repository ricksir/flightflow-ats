'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const crypto = require('node:crypto');

const HTML = fs.readFileSync('index.html', 'utf8');
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

function loadFunction(getFieldLayout, escapeHtml, fieldEditControlsMarkup) {
  const source = extractNamedFunction(KERNEL, FUNCTION_NAME);
  return Function(
    'getFieldLayout',
    'escapeHtml',
    'fieldEditControlsMarkup',
    source + '\nreturn fieldCardMarkup;'
  )(getFieldLayout, escapeHtml, fieldEditControlsMarkup);
}

test('fieldCardMarkup mantém identidade byte a byte antes da extração', () => {
  const source = extractNamedFunction(KERNEL, FUNCTION_NAME);
  assert.equal(source, EXPECTED_SOURCE);
  assert.equal(Buffer.byteLength(source, 'utf8'), EXPECTED_BYTES);
  assert.equal(crypto.createHash('sha256').update(source, 'utf8').digest('hex'), EXPECTED_SHA256);
});

test('fieldCardMarkup permanece sem acoplamento direto com estado, DOM ou núcleo temporal/espacial', () => {
  const source = extractNamedFunction(KERNEL, FUNCTION_NAME);
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
  const fn = loadFunction(
    key => { calls.push(['layout', key]); return { span: 2 }; },
    value => { calls.push(['escape', value]); return '[' + String(value) + ']'; },
    key => { calls.push(['controls', key]); return '<controls>'; }
  );

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
  const fn = loadFunction(
    () => ({ span: 1 }),
    value => String(value),
    () => ''
  );

  const html = fn('callsign', null, 'VALOR', 'RÓTULO', '', true);
  assert.match(html, /^<div class="field-card changed" data-field="callsign" data-span="1">/);
  assert.ok(html.includes('<span class="change-tag">ATUALIZADO</span>'));
  assert.ok(html.includes('<div class="field-label">RÓTULO</div>'));
  assert.ok(html.includes('<div class="field-value">VALOR</div>'));
});

test('fieldCardMarkup suprime o valor anterior quando vazio ou travessão', () => {
  const escaped = [];
  const fn = loadFunction(
    () => ({ span: 1 }),
    value => { escaped.push(value); return '[' + String(value) + ']'; },
    () => ''
  );

  const dash = fn('status', null, 'V', 'L', '—', false);
  const empty = fn('status', null, 'V', 'L', '', false);

  assert.ok(dash.includes('<div class="field-previous">[]</div>'));
  assert.ok(empty.includes('<div class="field-previous">[]</div>'));
  assert.deepEqual(escaped, ['status', '', 'status', '']);
});

test('fieldCardMarkup mantém valueHtml e labelHtml já preparados sem reescapar', () => {
  const fn = loadFunction(
    () => ({ span: 1 }),
    value => '[' + String(value) + ']',
    () => ''
  );

  const html = fn('status', {}, '<strong>VAL</strong>', '<button>LABEL</button>', '', false);
  assert.ok(html.includes('<div class="field-label"><button>LABEL</button></div>'));
  assert.ok(html.includes('<div class="field-value"><strong>VAL</strong></div>'));
});

test('erros das dependências continuam propagando sem interceptação', () => {
  const sentinel = new Error('sentinel');
  const fn = loadFunction(
    () => { throw sentinel; },
    value => String(value),
    () => ''
  );
  assert.throws(() => fn('status', {}, 'V', 'L', '', false), error => error === sentinel);
});

test('fieldCardMarkup mantém exatamente dois consumidores executáveis no núcleo', () => {
  assert.equal((KERNEL.match(/\bfieldCardMarkup\b/g) || []).length, 3);
  assert.equal((KERNEL.match(/\bfieldCardMarkup\s*\(/g) || []).length, 3);
  assert.equal(
    KERNEL.split("return fieldCardMarkup(key, def, '—', escapeHtml(def.label), '', false);").length - 1,
    1
  );
  assert.equal(
    KERNEL.split('cards.push(fieldCardMarkup(key, def, valueHtml, renderKnowledgeFieldLabel(key, def.label, snapshot[key], event), before, !!change));').length - 1,
    1
  );
});
