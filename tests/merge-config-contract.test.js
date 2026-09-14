'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');
const HTML = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const MODULE_PATH = path.join(ROOT, 'src', 'config', 'config-merger.js');
const MODULE_SOURCE = fs.readFileSync(MODULE_PATH, 'utf8');
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
const MODULE_BYTES = 2078;
const MODULE_SHA256 = 'a8e5658ad3b3e77534cf71035f3985a96b5ae4f42d1e19fb81ec673d3ac26ec6';

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

function loadApi() {
  const context = { window: {} };
  vm.runInNewContext(MODULE_SOURCE, context);
  return context.window.FlightFlowConfigMerger;
}

function createMerger(defaultConfig, fieldDefs, clone, normalizeFontScale, normalizeFieldLayout) {
  return loadApi().create({
    defaultConfig,
    fieldDefs,
    clone,
    normalizeFontScale,
    normalizeFieldLayout,
  }).mergeConfig;
}

test('módulo config-merger mantém identidade estrutural congelada', () => {
  assert.equal(Buffer.byteLength(MODULE_SOURCE, 'utf8'), MODULE_BYTES);
  assert.equal(crypto.createHash('sha256').update(MODULE_SOURCE).digest('hex'), MODULE_SHA256);
  assert.match(MODULE_SOURCE, /^\(function \(root, factory\) \{/);
  assert.match(MODULE_SOURCE, /\}\);\n$/);
});

test('mergeConfig preserva exatamente o corpo congelado após a extração', () => {
  const source = extractNamedFunction(MODULE_SOURCE, FUNCTION_NAME);
  assert.equal(source, EXPECTED_SOURCE);
  assert.equal(Buffer.byteLength(source, 'utf8'), EXPECTED_BYTES);
  assert.equal(crypto.createHash('sha256').update(source, 'utf8').digest('hex'), EXPECTED_SHA256);
});

test('API pública exige as cinco dependências e retorna fronteira congelada', () => {
  const api = loadApi();
  assert.ok(api);
  assert.equal(Object.isFrozen(api), true);
  assert.deepEqual(Object.keys(api), ['create']);

  const valid = {
    defaultConfig: { addressPatterns: [] },
    fieldDefs: {},
    clone: value => value,
    normalizeFontScale: value => value,
    normalizeFieldLayout: value => value,
  };
  const keys = Object.keys(valid);
  for (const missing of keys) {
    const options = Object.assign({}, valid);
    delete options[missing];
    assert.throws(
      () => api.create(options),
      /FlightFlowConfigMerger requer defaultConfig, fieldDefs, clone, normalizeFontScale e normalizeFieldLayout/
    );
  }

  const scoped = api.create(valid);
  assert.equal(Object.isFrozen(scoped), true);
  assert.deepEqual(Object.keys(scoped), ['mergeConfig']);
});

test('mergeConfig permanece sem acoplamento direto com estado, DOM, infraestrutura ou núcleo temporal/espacial', () => {
  const source = extractNamedFunction(MODULE_SOURCE, FUNCTION_NAME);
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
  const fn = createMerger(
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
  const fn = createMerger(defaultConfig, fieldDefs, clone, value => value, value => value);

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
  const fn = createMerger(defaultConfig, fieldDefs, clone, value => value, value => value);

  const result = fn({ visibleFields: ['status'] });

  assert.deepEqual(result.visibleFields, ['idPlano', 'status', 'etn']);
});

test('mergeConfig propaga erros das dependências sem interceptação', () => {
  const defaults = {
    theme: 'dark', fontScale: 1, visibleFields: [], customFields: [], fieldLayout: {}, addressPatterns: []
  };
  const defs = { idPlano: {}, etn: {} };
  const cloneError = new Error('clone sentinel');
  const cloneFail = createMerger(defaults, defs, () => { throw cloneError; }, value => value, value => value);
  assert.throws(() => cloneFail({}), error => error === cloneError);

  const fontError = new Error('font sentinel');
  const fontFail = createMerger(
    defaults,
    defs,
    value => JSON.parse(JSON.stringify(value)),
    () => { throw fontError; },
    value => value
  );
  assert.throws(() => fontFail({}), error => error === fontError);

  const layoutError = new Error('layout sentinel');
  const layoutFail = createMerger(
    defaults,
    defs,
    value => JSON.parse(JSON.stringify(value)),
    value => value,
    () => { throw layoutError; }
  );
  assert.throws(() => layoutFail({}), error => error === layoutError);
});

test('index carrega módulo antes do IIFE e injeta dependências depois de DEFAULT_CONFIG', () => {
  const moduleScript = '<script id="flightflow-config-merger" src="src/config/config-merger.js"></script>';
  const parserBinding = 'const Parser = window.FlightParser;';
  assert.ok(HTML.includes(moduleScript));
  assert.ok(HTML.indexOf(moduleScript) < HTML.indexOf(parserBinding));

  const defaultConfigIndex = HTML.indexOf('const DEFAULT_CONFIG = Object.freeze({');
  const wiringIndex = HTML.indexOf('const ConfigMerger = window.FlightFlowConfigMerger;');
  const stateIndex = HTML.indexOf('const state = {');
  assert.ok(defaultConfigIndex >= 0 && wiringIndex > defaultConfigIndex);
  assert.ok(stateIndex > wiringIndex);

  assert.ok(KERNEL.includes('const ConfigMerger = window.FlightFlowConfigMerger;'));
  assert.ok(KERNEL.includes("if (!ConfigMerger) throw new Error('FlightFlowConfigMerger não foi carregado.');"));
  assert.ok(KERNEL.includes('const { mergeConfig } = ConfigMerger.create({'));
  assert.ok(KERNEL.includes('defaultConfig: DEFAULT_CONFIG,'));
  assert.ok(KERNEL.includes('fieldDefs: FIELD_DEFS,'));
  assert.ok(KERNEL.includes('clone,'));
  assert.ok(KERNEL.includes('normalizeFontScale,'));
  assert.ok(KERNEL.includes('normalizeFieldLayout,'));
});

test('núcleo mantém os dois consumidores e não redeclara mergeConfig', () => {
  assert.equal((KERNEL.match(/\bfunction\s+mergeConfig\s*\(/g) || []).length, 0);
  assert.equal((KERNEL.match(/\bmergeConfig\b/g) || []).length, 3);
  assert.equal((KERNEL.match(/\bmergeConfig\s*\(/g) || []).length, 2);
  assert.equal(
    KERNEL.split('state.config = mergeConfig(input);').length - 1,
    1
  );
  assert.equal(
    KERNEL.split('const loaded = saved ? mergeConfig(saved) : clone(DEFAULT_CONFIG);').length - 1,
    1
  );
});
