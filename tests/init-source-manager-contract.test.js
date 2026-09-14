'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');
const HTML = path.join(ROOT, 'index.html');
const MODULE = path.join(ROOT, 'src', 'ui', 'source-manager-controller.js');

const FUNCTION_NAME = 'initSourceManager';
const EXPECTED_SOURCE = [
  'function initSourceManager() {',
  '    renderSourceManager();',
  '  }'
].join('\n');
const EXPECTED_BYTES = 61;
const EXPECTED_SHA256 = '0b4e495f5f6fb8f779c9cd0e056ed3f7f6e0bbcaf5b82500186ad34b40461a94';
const MODULE_BYTES = 533;
const MODULE_SHA256 = '0118b418018537dbbbdb6e8279e10858598fa4207e74ffe25b07b4033c8ff551';

function kernelSource() {
  const html = fs.readFileSync(HTML, 'utf8');
  const matches = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)];
  return matches.map(match => match[1]).sort((a, b) => b.length - a.length)[0];
}

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
  const source = fs.readFileSync(MODULE, 'utf8');
  const context = { window: {} };
  vm.runInNewContext(source, context);
  return context.window.FlightFlowSourceManagerController;
}

test('módulo source-manager-controller mantém identidade estrutural congelada', () => {
  const source = fs.readFileSync(MODULE, 'utf8');
  assert.equal(Buffer.byteLength(source, 'utf8'), MODULE_BYTES);
  assert.equal(crypto.createHash('sha256').update(source).digest('hex'), MODULE_SHA256);
  assert.match(source, /^\(function \(\) \{\n  'use strict';/);
  assert.match(source, /\}\)\(\);\n$/);
});

test('initSourceManager preserva exatamente o corpo congelado após a extração', () => {
  const source = extractNamedFunction(fs.readFileSync(MODULE, 'utf8'), FUNCTION_NAME);
  assert.equal(source, EXPECTED_SOURCE);
  assert.equal(Buffer.byteLength(source, 'utf8'), EXPECTED_BYTES);
  assert.equal(crypto.createHash('sha256').update(source, 'utf8').digest('hex'), EXPECTED_SHA256);
});

test('API pública exige renderSourceManager e retorna fronteira congelada', () => {
  const api = loadApi();
  assert.ok(api);
  assert.equal(Object.isFrozen(api), true);
  assert.deepEqual(Object.keys(api), ['create']);
  assert.throws(
    () => api.create({}),
    /FlightFlowSourceManagerController requer renderSourceManager/
  );

  let calls = 0;
  const scoped = api.create({ renderSourceManager: () => { calls += 1; } });
  assert.equal(Object.isFrozen(scoped), true);
  assert.deepEqual(Object.keys(scoped), ['initSourceManager']);
  assert.equal(scoped.initSourceManager(), undefined);
  assert.equal(calls, 1);
});

test('initSourceManager não intercepta erro de renderSourceManager', () => {
  const sentinel = new Error('sentinel');
  const scoped = loadApi().create({ renderSourceManager: () => { throw sentinel; } });
  assert.throws(() => scoped.initSourceManager(), error => error === sentinel);
});

test('initSourceManager permanece uma fronteira mínima sem acoplamento sensível', () => {
  const source = extractNamedFunction(fs.readFileSync(MODULE, 'utf8'), FUNCTION_NAME);
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

test('index carrega módulo antes do IIFE e usa wiring explícito', () => {
  const html = fs.readFileSync(HTML, 'utf8');
  const moduleScript = '<script id="flightflow-source-manager-controller" src="src/ui/source-manager-controller.js"></script>';
  const parserBinding = 'const Parser = window.FlightParser;';
  assert.ok(html.includes(moduleScript));
  assert.ok(html.indexOf(moduleScript) < html.indexOf(parserBinding));

  const kernel = kernelSource();
  assert.ok(kernel.includes('const SourceManagerController = window.FlightFlowSourceManagerController;'));
  assert.ok(kernel.includes("if (!SourceManagerController) throw new Error('FlightFlowSourceManagerController não foi carregado.');"));
  assert.ok(kernel.includes('const { initSourceManager } = SourceManagerController.create({ renderSourceManager });'));
});

test('núcleo mantém o único consumidor executável e não redeclara initSourceManager', () => {
  const kernel = kernelSource();
  const exactConsumer = "safeInit('gerenciador de fontes', initSourceManager);";
  assert.equal(kernel.split(exactConsumer).length - 1, 1);
  assert.equal((kernel.match(/\bfunction\s+initSourceManager\s*\(/g) || []).length, 0);
  assert.equal((kernel.match(/\binitSourceManager\s*\(/g) || []).length, 0, 'não deve existir chamada direta no núcleo');
});
