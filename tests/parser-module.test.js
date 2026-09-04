const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const HTML = path.join(ROOT, 'index.html');
const PARSER = path.join(ROOT, 'src', 'parser', 'flight-parser.js');
const api = require(PARSER);

const PUBLIC_FUNCTIONS = [
  'decodeHistoryBuffer',
  'parseHistoryText',
  'normalizeJson',
  'exportNormalized',
  'formatDof',
  'stageForProgress',
  'applyDepartureCorrelationGate',
  'isDepartureCorrelationEvent',
];

test('FlightParser externo preserva o contrato público conhecido', () => {
  assert.ok(api && typeof api === 'object');
  for (const name of PUBLIC_FUNCTIONS) {
    assert.equal(typeof api[name], 'function', `${name} deve continuar público`);
  }
  assert.ok(api.STATUS_MAP && typeof api.STATUS_MAP === 'object');
  assert.ok(Array.isArray(api.TRACKED_FIELDS));
  assert.ok(api.TRACKED_FIELDS.includes('idPlano'));
  assert.ok(api.TRACKED_FIELDS.includes('route'));
});

test('FlightParser continua decodificando histórico UTF-8', () => {
  const source = 'Plano SAGITÁRIO — Brasília';
  const bytes = new TextEncoder().encode(source);
  assert.equal(api.decodeHistoryBuffer(bytes), source);
});

test('index carrega o módulo antes do consumidor window.FlightParser', () => {
  const html = fs.readFileSync(HTML, 'utf8');
  const scriptTag = '<script src="src/parser/flight-parser.js"></script>';
  const moduleIndex = html.indexOf(scriptTag);
  const consumerIndex = html.indexOf('const Parser = window.FlightParser;');

  assert.ok(moduleIndex >= 0, 'index.html deve referenciar o FlightParser externo');
  assert.equal(html.indexOf(scriptTag, moduleIndex + 1), -1, 'a referência externa deve ser única');
  assert.ok(consumerIndex > moduleIndex, 'FlightParser deve ser carregado antes do IIFE principal');
  assert.equal(
    html.includes('if (root) root.FlightParser = api;'),
    false,
    'implementação do parser não deve voltar a ficar inline no index.html'
  );
});
