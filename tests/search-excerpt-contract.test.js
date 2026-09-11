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

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function createApi() {
  return loadModule().create({ normalizeSearchText, escapeHtml });
}

test('módulo publica fábrica mínima e congelada', () => {
  const Module = loadModule();
  assert.equal(Object.isFrozen(Module), true);
  assert.deepEqual(Object.keys(Module), ['create']);

  const api = createApi();
  assert.equal(Object.isFrozen(api), true);
  assert.deepEqual(Object.keys(api), ['makeSearchExcerpt', 'highlightSearchExcerpt']);
  assert.equal(typeof api.makeSearchExcerpt, 'function');
  assert.equal(typeof api.highlightSearchExcerpt, 'function');
});

test('fábrica exige normalizeSearchText e escapeHtml', () => {
  const Module = loadModule();
  assert.throws(() => Module.create(), /requer normalizeSearchText/);
  assert.throws(() => Module.create({ normalizeSearchText: 'x', escapeHtml }), /requer normalizeSearchText/);
  assert.throws(() => Module.create({ normalizeSearchText }), /requer escapeHtml/);
  assert.throws(() => Module.create({ normalizeSearchText, escapeHtml: 'x' }), /requer escapeHtml/);
});

test('makeSearchExcerpt preserva compactação de espaços e raio padrão', () => {
  const { makeSearchExcerpt } = createApi();
  const raw = `  ${'A'.repeat(120)}   ALVO   ${'B'.repeat(120)}  `;
  const excerpt = makeSearchExcerpt(raw, 'ALVO');

  assert.equal(excerpt.startsWith('…'), true);
  assert.equal(excerpt.endsWith('…'), true);
  assert.equal(excerpt.includes('ALVO'), true);
  assert.equal(excerpt.includes('   '), false);
  assert.equal(excerpt.length, 1 + 105 + 4 + 105 + 1);
});

test('makeSearchExcerpt encontra consulta ignorando acentos e caixa', () => {
  const { makeSearchExcerpt } = createApi();
  const text = `prefixo ${'x'.repeat(25)} AERÓDROMO Brasília ${'y'.repeat(25)} sufixo`;
  const excerpt = makeSearchExcerpt(text, 'aerodromo', 12);

  assert.equal(excerpt.startsWith('…'), true);
  assert.equal(excerpt.endsWith('…'), true);
  assert.equal(excerpt.includes('AERÓDROMO'), true);
});

test('makeSearchExcerpt sem ocorrência retorna somente os dois raios iniciais sem elipses', () => {
  const { makeSearchExcerpt } = createApi();
  const text = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

  assert.equal(makeSearchExcerpt(text, 'inexistente', 5), '0123456789');
});

test('makeSearchExcerpt perto das bordas adiciona elipse somente onde necessário', () => {
  const { makeSearchExcerpt } = createApi();

  assert.equal(makeSearchExcerpt('ALVO abcdefghijklmnop', 'ALVO', 4), 'ALVO abc…');
  assert.equal(makeSearchExcerpt('abcdefghijklmnop ALVO', 'ALVO', 4), '…nop ALVO');
});

test('makeSearchExcerpt preserva dependência injetada e não modifica argumentos', () => {
  const calls = [];
  const normalizer = value => {
    calls.push(value);
    return normalizeSearchText(value);
  };
  const { makeSearchExcerpt } = loadModule().create({ normalizeSearchText: normalizer, escapeHtml });
  const text = 'Texto Original';
  const query = 'original';

  const result = makeSearchExcerpt(text, query, 20);

  assert.equal(result, text);
  assert.deepEqual(calls, [text, query]);
  assert.equal(text, 'Texto Original');
  assert.equal(query, 'original');
});

test('highlightSearchExcerpt preserva busca normalizada e marca o trecho original', () => {
  const { highlightSearchExcerpt } = createApi();

  assert.equal(
    highlightSearchExcerpt('Plano AERÓDROMO Brasília', 'aerodromo'),
    'Plano <mark>AERÓDROMO</mark> Brasília'
  );
  assert.equal(
    highlightSearchExcerpt('Evento DEP confirmado', 'dep'),
    'Evento <mark>DEP</mark> confirmado'
  );
});

test('highlightSearchExcerpt escapa HTML no antes, acerto e depois', () => {
  const { highlightSearchExcerpt } = createApi();

  assert.equal(
    highlightSearchExcerpt('<b>ALVO & teste</b>', 'alvo'),
    '&lt;b&gt;<mark>ALVO</mark> &amp; teste&lt;/b&gt;'
  );
});

test('highlightSearchExcerpt sem consulta ou sem ocorrência retorna a fonte escapada', () => {
  const { highlightSearchExcerpt } = createApi();

  assert.equal(highlightSearchExcerpt('<script>x</script>', ''), '&lt;script&gt;x&lt;/script&gt;');
  assert.equal(highlightSearchExcerpt('<b>texto</b>', 'ausente'), '&lt;b&gt;texto&lt;/b&gt;');
});

test('highlightSearchExcerpt chama dependências injetadas sem modificar argumentos', () => {
  const normalizedCalls = [];
  const escapedCalls = [];
  const normalizer = value => {
    normalizedCalls.push(value);
    return normalizeSearchText(value);
  };
  const escaper = value => {
    escapedCalls.push(value);
    return escapeHtml(value);
  };
  const { highlightSearchExcerpt } = loadModule().create({
    normalizeSearchText: normalizer,
    escapeHtml: escaper,
  });
  const text = 'Antes ALVO Depois';
  const query = 'alvo';

  const result = highlightSearchExcerpt(text, query);

  assert.equal(result, 'Antes <mark>ALVO</mark> Depois');
  assert.deepEqual(normalizedCalls, [text, query]);
  assert.deepEqual(escapedCalls, ['Antes ', 'ALVO', ' Depois']);
  assert.equal(text, 'Antes ALVO Depois');
  assert.equal(query, 'alvo');
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
  const excerptConsumerIndex = HTML.indexOf('excerpt: makeSearchExcerpt(event.rawBlock || searchable, query)');
  const highlightConsumerIndex = HTML.indexOf('highlightSearchExcerpt(excerpt, query)');

  assert.notEqual(tagIndex, -1, 'módulo deve estar referenciado');
  assert.ok(tagIndex < kernelIndex, 'módulo deve carregar antes do IIFE principal');
  assert.ok(normalizerIndex >= 0 && wiringIndex > normalizerIndex, 'wiring deve ocorrer após normalizeSearchText existir');
  assert.ok(excerptConsumerIndex > wiringIndex, 'makeSearchExcerpt deve estar inicializado antes do consumidor');
  assert.ok(highlightConsumerIndex > wiringIndex, 'highlightSearchExcerpt deve estar inicializado antes do consumidor');

  for (const token of [
    'const SearchExcerpt = window.FlightFlowSearchExcerpt;',
    "if (!SearchExcerpt) throw new Error('FlightFlowSearchExcerpt não foi carregado.');",
    'const { makeSearchExcerpt, highlightSearchExcerpt } = SearchExcerpt.create({ normalizeSearchText, escapeHtml });',
  ]) assert.ok(HTML.includes(token), `wiring ausente: ${token}`);

  assert.equal(HTML.includes('function makeSearchExcerpt('), false, 'makeSearchExcerpt inline não pode voltar');
  assert.equal(HTML.includes('function highlightSearchExcerpt('), false, 'highlightSearchExcerpt inline não pode voltar');
  assert.equal(HTML.split('makeSearchExcerpt(').length - 1, 1, 'deve restar somente o consumidor de makeSearchExcerpt');
  assert.equal(HTML.split('highlightSearchExcerpt(').length - 1, 1, 'deve restar somente o consumidor de highlightSearchExcerpt');
});
