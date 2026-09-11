'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const HTML = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const MODULE_PATH = path.join(ROOT, 'src', 'ui', 'strip-color-meaning.js');
const SOURCE = fs.readFileSync(MODULE_PATH, 'utf8');

function loadModule() {
  delete require.cache[require.resolve(MODULE_PATH)];
  return require(MODULE_PATH);
}

function fakeTarget(classes = []) {
  const set = new Set(classes);
  return {
    classList: {
      contains(name) {
        return set.has(name);
      },
    },
  };
}

test('módulo publica fábrica mínima e congelada', () => {
  const Module = loadModule();
  assert.equal(Object.isFrozen(Module), true);
  assert.deepEqual(Object.keys(Module), ['create']);

  const api = Module.create({ colorMeanings: {} });
  assert.equal(Object.isFrozen(api), true);
  assert.deepEqual(Object.keys(api), ['stripColorMeaning']);
  assert.equal(typeof api.stripColorMeaning, 'function');
});

test('fábrica exige colorMeanings', () => {
  const Module = loadModule();
  assert.throws(() => Module.create(), /requer colorMeanings/);
  assert.throws(() => Module.create({ colorMeanings: null }), /requer colorMeanings/);
});

test('stripColorMeaning preserva significado base do tema', () => {
  const colorMeanings = {
    'theme-controlled': 'Plano controlado: preto.',
    'theme-donor': 'Transferência na posição doadora: laranja.',
  };
  const { stripColorMeaning } = loadModule().create({ colorMeanings });

  assert.equal(stripColorMeaning(fakeTarget(), 'theme-controlled'), 'Plano controlado: preto.');
  assert.equal(stripColorMeaning(fakeTarget(), 'theme-donor'), 'Transferência na posição doadora: laranja.');
  assert.equal(stripColorMeaning(fakeTarget(), 'unknown-theme'), 'Cor operacional do estado atual do plano.');
});

test('stripColorMeaning preserva ordem e textos dos marcadores visuais', () => {
  const { stripColorMeaning } = loadModule().create({
    colorMeanings: { base: 'BASE' },
  });
  const result = stripColorMeaning(
    fakeTarget(['warning', 'pending', 'updated', 'white-border', 'new-field']),
    'base'
  );

  assert.equal(
    result,
    'BASE Azul-claro: o conteúdo deste campo foi alterado no evento atual e ainda não foi reconhecido pelo operador. Ciano: informação nova ou recém-recebida. Lilás: requisição ou coordenação pendente. Borda branca: confirmação ou reconhecimento do recebimento ainda pendente. Borda amarela: condição que exige atenção operacional.'
  );
});

test('stripColorMeaning consulta exatamente as cinco classes conhecidas', () => {
  const calls = [];
  const target = {
    classList: {
      contains(name) {
        calls.push(name);
        return false;
      },
    },
  };
  const { stripColorMeaning } = loadModule().create({ colorMeanings: {} });

  stripColorMeaning(target, 'missing');

  assert.deepEqual(calls, ['updated', 'new-field', 'pending', 'white-border', 'warning']);
});

test('stripColorMeaning não modifica target nem colorMeanings', () => {
  const classes = new Set(['updated']);
  const target = {
    classList: {
      contains(name) {
        return classes.has(name);
      },
    },
  };
  const colorMeanings = { x: 'X' };
  const before = { ...colorMeanings };
  const { stripColorMeaning } = loadModule().create({ colorMeanings });

  stripColorMeaning(target, 'x');

  assert.deepEqual(colorMeanings, before);
  assert.deepEqual([...classes], ['updated']);
});

test('módulo permanece desacoplado de estado, DOM global, storage, mapa e movimento', () => {
  for (const forbidden of [
    'state.', 'els.', 'document.', 'window.', 'localStorage', 'sessionStorage',
    'indexedDB', 'fetch(', 'goTo(', 'renderCurrent(', 'planMotionTransition',
    'snapMotionTo(', 'startMotionLoop(', 'google.', 'L.', 'realMapState',
    'requestAnimationFrame(', 'addEventListener', 'querySelector', 'getElementById',
  ]) assert.equal(SOURCE.includes(forbidden), false, `acoplamento inesperado: ${forbidden}`);
});

test('index carrega módulo antes do kernel e instancia somente após STRIP_COLOR_MEANINGS', () => {
  const tag = '<script id="flightflow-strip-color-meaning" src="src/ui/strip-color-meaning.js"></script>';
  const tagIndex = HTML.indexOf(tag);
  const kernelIndex = HTML.indexOf('const Parser = window.FlightParser;');
  const meaningsIndex = HTML.indexOf('const STRIP_COLOR_MEANINGS = Object.freeze({');
  const wiringIndex = HTML.indexOf('const StripColorMeaning = window.FlightFlowStripColorMeaning;');
  const consumerIndex = HTML.indexOf('els.stripFieldColorMeaning.textContent=stripColorMeaning(target,theme);');

  assert.notEqual(tagIndex, -1, 'módulo deve estar referenciado');
  assert.ok(tagIndex < kernelIndex, 'módulo deve carregar antes do IIFE principal');
  assert.ok(meaningsIndex >= 0 && wiringIndex > meaningsIndex, 'wiring deve ocorrer após STRIP_COLOR_MEANINGS existir');
  assert.ok(consumerIndex > wiringIndex, 'módulo deve estar inicializado antes do consumidor');

  for (const token of [
    'const StripColorMeaning = window.FlightFlowStripColorMeaning;',
    "if (!StripColorMeaning) throw new Error('FlightFlowStripColorMeaning não foi carregado.');",
    'const { stripColorMeaning } = StripColorMeaning.create({ colorMeanings: STRIP_COLOR_MEANINGS });',
  ]) assert.ok(HTML.includes(token), `wiring ausente: ${token}`);

  assert.equal(HTML.includes('function stripColorMeaning('), false, 'implementação inline não pode voltar');
  assert.equal(HTML.split('stripColorMeaning(').length - 1, 1, 'deve restar somente o consumidor existente');
  assert.ok(HTML.includes("STRIP_COLOR_MEANINGS[theme]||'Estado operacional'"), 'legenda existente deve continuar usando a constante inline');
});
