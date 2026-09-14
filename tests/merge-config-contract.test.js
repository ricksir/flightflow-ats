'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const crypto = require('node:crypto');

const HTML = fs.readFileSync('index.html', 'utf8');
const scriptMatches = [...HTML.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)];
const KERNEL = scriptMatches.map(match => match[1]).sort((a, b) => b.length - a.length)[0];

const FUNCTION_NAME = 'mergeConfig';
const EXPECTED_SOURCE = [
  'function mergeConfig(input) {',
  '    const merged = Object.assign({}, clone(DEFAULT_CONFIG), input || {});',
  "    merged.theme = merged.theme === 'light' ? 'light' : 'dark';",
  '    merged.fontScale = normalizeFontScale(merged.fontScale);',
  '    merged.visibleFields = (merged.visibleFields || []).filter(key => FIELD_DEFS[key]);',
  "    if (!merged.visibleFields.includes('idPlano')) {",
  "      const callsignIndex = merged.visibleFields.indexOf('callsign');",
  "      merged.visibleFields.splice(callsignIndex >= 0 ? callsignIndex + 1 : 0, 0, 'idPlano');",
  '    }',
  "    if (!merged.visibleFields.includes('etn')) {",
  "      const eobtIndex = merged.visibleFields.indexOf('eobt');",
  "      merged.visibleFields.splice(eobtIndex >= 0 ? eobtIndex + 1 : merged.visibleFields.length, 0, 'etn');",
  '    }',
  '    merged.customFields = Array.isArray(merged.customFields) ? merged.customFields : [];',
  '    merged.fieldLayout = normalizeFieldLayout(merged.fieldLayout);',
  '    merged.addressPatterns = Array.isArray(merged.addressPatterns) ? merged.addressPatterns : clone(DEFAULT_CONFIG.addressPatterns);',
  '    return merged;',
  '  }'
].join('\n');
const EXPECTED_BYTES = 1074;
const EXPECTED_SHA256 = 'ab55d30859ab0b89d96fb17c23703600ee4f34192e597729b0909e7556aaaefd';

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

function loadFunction(defaultConfig, fieldDefs, clone, normalizeFontScale, normalizeFieldLayout) {
  const source = extractNamedFunction(KERNEL, FUNCTION_NAME);
  return Function(
    'DEFAULT_CONFIG',
    'FIELD_DEFS',
    'clone',
    'normalizeFontScale',
    'normalizeFieldLayout',
    source + '\nreturn mergeConfig;'
  )(defaultConfig, fieldDefs, clone, normalizeFontScale, normalizeFieldLayout);
}

test('mergeConfig mantém identidade byte a byte antes da extração', () => {
  const source = extractNamedFunction(KERNEL, FUNCTION_NAME);
  assert.equal(source, EXPECTED_SOURCE);
  assert.equal(Buffer.byteLength(source, 'utf8'), EXPECTED_BYTES);
  assert.equal(crypto.createHash('sha256').update(source, 'utf8').digest('hex'), EXPECTED_SHA256);
});

test('mergeConfig permanece sem acoplamento direto com estado, DOM, infraestrutura ou núcleo temporal/espacial', () => {
  const source = extractNamedFunction(KERNEL, FUNCTION_NAME);
  for (const token of [
    'state.', 'els.', 'document.', 'window.', 'localStorage', 'sessionStorage', 'indexedDB',
    'fetch(', 'setTimeout(', 'setInterval(', 'goTo(', 'renderCurrent(', 'currentEvent(',
    'route', 'planner', 'interpol', 'aircraft', 'timeline', 'scrubber', 'autoplay', 'DEP',
    'map', 'motion', 'coordinate', 'runway', 'geometry'
  ]) {
    assert.equal(source.includes(token), false, 'acoplamento inesperado: ' + token);
  }

  assert.equal((source.match(/\bclone\s*\(/g) || []).length, 2);
  assert.equal((source.match(/\bnormalizeFontScale\s*\(/g) || []).length, 1);
  assert.equal((source.match(/\bnormalizeFieldLayout\s*\(/g) || []).length, 1);
  assert.equal((source.match(/\bFIELD_DEFS\s*\[/g) || []).length, 1);
  assert.equal((source.match(/\bDEFAULT_CONFIG\b/g) || []).length, 2);
});

test('mergeConfig mantém exatamente dois consumidores executáveis no núcleo', () => {
  assert.equal((KERNEL.match(/\bmergeConfig\b/g) || []).length, 3);
  assert.equal((KERNEL.match(/\bmergeConfig\s*\(/g) || []).length, 3);
});

test('mergeConfig funde entrada e normaliza os campos na ordem funcional congelada', () => {
  const cloneCalls = [];
  const defaultConfig = {
    theme: 'dark',
    fontScale: 1,
    visibleFields: ['callsign', 'eobt'],
    customFields: [{ key: 'default' }],
    fieldLayout: { default: true },
    addressPatterns: ['DEF']
  };
  const fieldDefs = {
    callsign: {}, idPlano: {}, status: {}, eobt: {}, etn: {}
  };
  const clone = value => {
    cloneCalls.push(value);
    return JSON.parse(JSON.stringify(value));
  };
  const fontCalls = [];
  const layoutCalls = [];
  const fn = loadFunction(
    defaultConfig,
    fieldDefs,
    clone,
    value => { fontCalls.push(value); return 'FS:' + value; },
    value => { layoutCalls.push(value); return { normalized: value }; }
  );

  const input = {
    theme: 'light',
    fontScale: 1.25,
    visibleFields: ['unknown', 'callsign', 'status', 'eobt'],
    customFields: 'invalid',
    fieldLayout: { x: 1 },
    addressPatterns: 'invalid',
    extra: 'kept'
  };
  const beforeInput = JSON.parse(JSON.stringify(input));
  const result = fn(input);

  assert.equal(result.theme, 'light');
  assert.equal(result.fontScale, 'FS:1.25');
  assert.deepEqual(result.visibleFields, ['callsign', 'idPlano', 'status', 'eobt', 'etn']);
  assert.deepEqual(result.customFields, []);
  assert.deepEqual(result.fieldLayout, { normalized: { x: 1 } });
  assert.deepEqual(result.addressPatterns, ['DEF']);
  assert.equal(result.extra, 'kept');
  assert.deepEqual(fontCalls, [1.25]);
  assert.deepEqual(layoutCalls, [{ x: 1 }]);
  assert.equal(cloneCalls.length, 2);
  assert.equal(cloneCalls[0], defaultConfig);
  assert.equal(cloneCalls[1], defaultConfig.addressPatterns);
  assert.deepEqual(input, beforeInput);
});

test('mergeConfig preserva listas válidas, evita duplicatas e normaliza tema inválido para dark', () => {
  const defaultConfig = {
    theme: 'dark',
    fontScale: 1,
    visibleFields: [],
    customFields: [],
    fieldLayout: {},
    addressPatterns: []
  };
  const fieldDefs = { idPlano: {}, etn: {}, callsign: {}, status: {} };
  const customFields = [{ key: 'custom' }];
  const addressPatterns = ['ADDR'];
  const clone = value => JSON.parse(JSON.stringify(value));
  const fn = loadFunction(defaultConfig, fieldDefs, clone, value => value, value => value);

  const result = fn({
    theme: 'sepia',
    visibleFields: ['idPlano', 'callsign', 'etn', 'status'],
    customFields,
    addressPatterns
  });

  assert.equal(result.theme, 'dark');
  assert.deepEqual(result.visibleFields, ['idPlano', 'callsign', 'etn', 'status']);
  assert.equal(result.visibleFields.filter(key => key === 'idPlano').length, 1);
  assert.equal(result.visibleFields.filter(key => key === 'etn').length, 1);
  assert.equal(result.customFields, customFields);
  assert.equal(result.addressPatterns, addressPatterns);
});

test('mergeConfig mantém as posições de fallback de idPlano e etn', () => {
  const defaultConfig = {
    theme: 'dark',
    fontScale: 1,
    visibleFields: [],
    customFields: [],
    fieldLayout: {},
    addressPatterns: []
  };
  const fieldDefs = { idPlano: {}, etn: {}, status: {} };
  const clone = value => JSON.parse(JSON.stringify(value));
  const fn = loadFunction(defaultConfig, fieldDefs, clone, value => value, value => value);

  const result = fn({ visibleFields: ['status'] });

  assert.deepEqual(result.visibleFields, ['idPlano', 'status', 'etn']);
});

test('mergeConfig propaga erros das dependências sem interceptação', () => {
  const defaults = {
    theme: 'dark', fontScale: 1, visibleFields: [], customFields: [], fieldLayout: {}, addressPatterns: []
  };
  const defs = { idPlano: {}, etn: {} };
  const cloneError = new Error('clone sentinel');
  const cloneFail = loadFunction(defaults, defs, () => { throw cloneError; }, value => value, value => value);
  assert.throws(() => cloneFail({}), error => error === cloneError);

  const fontError = new Error('font sentinel');
  const fontFail = loadFunction(
    defaults,
    defs,
    value => JSON.parse(JSON.stringify(value)),
    () => { throw fontError; },
    value => value
  );
  assert.throws(() => fontFail({}), error => error === fontError);

  const layoutError = new Error('layout sentinel');
  const layoutFail = loadFunction(
    defaults,
    defs,
    value => JSON.parse(JSON.stringify(value)),
    value => value,
    () => { throw layoutError; }
  );
  assert.throws(() => layoutFail({}), error => error === layoutError);
});
