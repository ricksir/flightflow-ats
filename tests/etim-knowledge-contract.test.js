'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const HTML = fs.readFileSync(path.resolve(__dirname, '..', 'index.html'), 'utf8');

function etoEntrySource() {
  const start = HTML.indexOf('"key":"mca-abbreviation:155:ETO"');
  const end = HTML.indexOf('},{"key":"mca-abbreviation:156:EUROCONTROL"', start);
  assert.ok(start >= 0 && end > start, 'entrada normativa ETO deve existir no catálogo MCA');
  return HTML.slice(start, end);
}

test('ETIM é pesquisável como alias operacional da abreviatura normativa ETO', () => {
  const source = etoEntrySource();
  assert.ok(source.includes('"code":"ETO"'));
  assert.ok(source.includes('"aliases":["ETIM"]'));
  assert.ok(source.includes('Hora Estimada de Sobrevoo (Estimated Time Over Significant Point)'));
});

test('Base Normativa explica a relação ETIM → ETO sem atribuir ETIM ao MCA', () => {
  const source = etoEntrySource();
  assert.ok(source.includes('ETIM é o rótulo operacional usado para indicar a hora estimada associada ao sobrevoo de um ponto'));
  assert.ok(source.includes('a abreviatura padronizada para Hora Estimada de Sobrevoo é ETO'));
  assert.ok(source.includes('MCA 100-27/2025, Anexo II, item 155, p. 12/93.'));
  assert.equal(HTML.includes('"code":"ETIM","category":"mca_abbreviation"'), false);
});
