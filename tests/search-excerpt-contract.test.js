'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const HTML = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const MODULE_PATH = path.join(ROOT, 'src', 'ui', 'search-excerpt.js');
const SOURCE = fs.readFileSync(MODULE_PATH, 'utf8');

function loadModule() {
  delete require.cache[require.resolve(MODULE_PATH)];
  return require(MODULE_PATH);
}

function normalizeSearchText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR');
}

test('módulo publica fábrica mínima e congelada', () => {
  const Module = loadModule();
  assert.equal(Object.isFrozen(Module), true);
  assert.deepEqual(Object.keys(Module), ['create']);

  const api = Module.create({ normalizeSearchText });
  assert.equal(Object.isFrozen(api), true);
  assert.deepEqual(Object.keys(api), ['makeSearchExcerpt']);
  assert.equal(typeof api.makeSearchExcerpt, 'function');
});

test('fábrica exige normalizeSearchText', () => {
  const Module = loadModule();
  assert.throws(() => Module.create(), /requer normalizeSearchText/);
  assert.throws(() => Module.create({ normalizeSearchText: 'x' }), /requer normalizeSearchText/);
});

test('makeSearchExcerpt preserva compactação de espaços e raio padrão', () => {
  const { makeSearchExcerpt } = loadModule().create({ normalizeSearchText });
  const raw = `  AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA   ALVO   BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB  `;
  const excerpt = makeSearchExcerpt(raw, 'ALVO');

  assert.equal(excerpt.startsWith('…'), true);
  assert.equal(excerpt.endsWith('…'), true);
  assert.equal(excerpt.includes('ALVO'), true);
  assert.equal(excerpt.includes('   '), false);
  assert.equal(excerpt.length, 1 + 105 + 4 + 105 + 1);
});

test('makeSearchExcerpt encontra consulta ignorando acentos e caixa', () => {
  const { makeSearchExcerpt } = loadModule().create({ normalizeSearchText });
  const text = `prefixo xxxxxxxxxxxxxxxxxxxxxxxxx AERÓDROMO Brasília yyyyyyyyyyyyyyyyyyyyyyyyy sufixo`;
  const excerpt = makeSearchExcerpt(text, 'aerodromo', 12);

  assert.equal(excerpt.startsWith('…'), true);
  assert.equal(excerpt.endsWith('…'), true);
  assert.equal(excerpt.includes('AERÓDROMO'), true);
});

test('sem ocorrência retorna somente os dois raios iniciais sem elipses', () => {
  const { makeSearchExcerpt } = loadModule().create({ normalizeSearchText });
  const text = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

  assert.equal(makeSearchExcerpt(text, 'inexistente', 5), '0123456789');
});

test('ocorrência perto das bordas adiciona elipse somente onde necessário', () => {
  const { makeSearchExcerpt } = loadModule().create({ normalizeSearchText });

  assert.equal(makeSearchExcerpt('ALVO abcdefghijklmnop', 'ALVO', 4), 'ALVO abc…');
  assert.equal(makeSearchExcerpt('abcdefghijklmnop ALVO', 'ALVO', 4), '…mnop ALVO');
});

test('preserva dependência injetada e não modifica argumentos', () => {
  const calls = [];
  const normalizer = value => {
    calls.push(value);
    return normalizeSearchText(value);
  };
  const { makeSearchExcerpt } = loadModule().create({ normalizeSearchText: normalizer });
  const text = 'Texto Original';
  const query = 'original';

  const result = makeSearchExcerpt(text, query, 20);

  assert.equal(result, text);
  assert.deepEqual(calls, [text, query]);
  assert.equal(text, 'Texto Original');
  assert.equal(query, 'original');
});

test('módulo permanece desacoplado de estado, DOM, storage, rota e movimento', () => {
  for (const forbidden of [
    'state.', 'els.', 'document.', 'localStorage', 'sessionStorage', 'indexedDB',
    'fetch(', 'goTo(', 'renderCurrent(', 'planMotionTransition', 'snapMotionTo(',
    'startMotionLoop(', 'google.', 'L.', 'realMapState', 'requestAnimationFrame(',
    'addEventListener', 'querySelector', 'getElementById', 'FlightFlowRouteProcessedV7412',
  ]) assert.equal(SOURCE.includes(forbidden), false, `acoplamento inesperado: ${forbidden}`);
});

test('index carrega módulo antes do kernel e instancia após normalizeSearchText', () => {
  const tag = '<script id="flightflow-search-excerpt" src="src/ui/search-excerpt.js"></script>';
  const tagIndex = HTML.indexOf(tag);
  const kernelIndex = HTML.indexOf('const Parser = window.FlightParser;');
  const normalizerIndex = HTML.indexOf('function normalizeSearchText(value)');
  const wiringIndex = HTML.indexOf('const SearchExcerpt = window.FlightFlowSearchExcerpt;');
  const consumerIndex = HTML.indexOf('excerpt: makeSearchExcerpt(event.rawBlock || searchable, query)');

  assert.notEqual(tagIndex, -1, 'módulo deve estar referenciado');
  assert.ok(tagIndex < kernelIndex, 'módulo deve carregar antes do IIFE principal');
  assert.ok(normalizerIndex >= 0 && wiringIndex > normalizerIndex, 'wiring deve ocorrer após normalizeSearchText existir');
  assert.ok(consumerIndex > wiringIndex, 'módulo deve estar inicializado antes do consumidor');

  for (const token of [
    'const SearchExcerpt = window.FlightFlowSearchExcerpt;',
    "if (!SearchExcerpt) throw new Error('FlightFlowSearchExcerpt não foi carregado.');",
    'const { makeSearchExcerpt } = SearchExcerpt.create({ normalizeSearchText });',
  ]) assert.ok(HTML.includes(token), `wiring ausente: ${token}`);

  assert.equal(HTML.includes('function makeSearchExcerpt('), false, 'implementação inline não pode voltar');
  assert.equal(HTML.split('makeSearchExcerpt(').length - 1, 1, 'deve restar somente o consumidor existente');
});
