const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = path.resolve(__dirname, '..');
const HTML = path.join(ROOT, 'index.html');
const EXPECTED_BYTES = 1148151;
const EXPECTED_SHA256 = '09a49e38f076badb3f1e6a72f368de3a5fc330e76b9adc93a1768eb769c7ea9e';
const EXPECTED_LINES = 5540;
const EXPECTED_DUPLICATES = [];

function kernelSource() {
  const html = fs.readFileSync(HTML, 'utf8');
  const anchor = 'window.__FlightFlowFirBridge = Object.freeze({';
  const index = html.indexOf(anchor);
  assert.ok(index >= 0, 'ponte FIR deve continuar dentro do IIFE principal');
  const open = html.lastIndexOf('<script', index);
  const bodyStart = html.indexOf('>', open) + 1;
  const close = html.indexOf('</script>', index);
  assert.ok(open >= 0 && bodyStart > open && close > bodyStart, 'IIFE principal deve continuar delimitado');
  return html.slice(bodyStart, close).replace(/^\n+|\n+$/g, '') + '\n';
}

test('núcleo principal mantém identidade estrutural de baseline', () => {
  const source = kernelSource();
  assert.equal(Buffer.byteLength(source, 'utf8'), EXPECTED_BYTES);
  assert.equal(source.split(/\r?\n/).length - 1, EXPECTED_LINES);
  assert.equal(crypto.createHash('sha256').update(source).digest('hex'), EXPECTED_SHA256);
  assert.match(source, /^\(function \(\) \{\n\s*'use strict';/);
  assert.match(source, /\}\)\(\);\n$/);
});

test('núcleo continua dependente explicitamente do FlightParser e mantém identidade da aplicação', () => {
  const source = kernelSource();
  for (const token of [
    'const Parser = window.FlightParser;',
    "if (!Parser) throw new Error('FlightParser não foi carregado.');",
    "name: 'FlightFlow ATS - TIOP Cindacta1'",
    "subtitle: 'Histórico animado de Plano de Voo'",
    "version: '7.3.2'"
  ]) assert.ok(source.includes(token), `contrato ausente: ${token}`);
});

test('storage central mantém as quatro chaves conhecidas', () => {
  const source = kernelSource();
  for (const token of [
    "const LOCALITY_STORAGE_KEY = 'flightflow-localities-v1';",
    "const AERODROME_STORAGE_KEY = 'flightflow-custom-aerodromes-v1';",
    "const CONFIG_STORAGE_KEY = 'flightflow-config-v2';",
    "const GEO_STORAGE_KEY = 'flightflow-geo-coordinate-v4';"
  ]) assert.ok(source.includes(token), `chave ausente: ${token}`);
});

test('núcleo publica contratos externos de conhecimento, geografia e FIR', () => {
  const source = kernelSource();
  assert.ok(source.includes('window.__flightflowKnowledgeEntries = function()'));
  assert.ok(source.includes('window.__flightflowGeoResolver=Object.freeze({'));
  assert.ok(source.includes("version:'1.0.0'"));
  for (const name of ['register','get','has','request','list','currentRouteEndpoints']) {
    assert.match(source, new RegExp(`\\b${name}\\s*:`), `${name} deve continuar no GeoResolver`);
  }

  const fir = source.match(/window\.__FlightFlowFirBridge\s*=\s*Object\.freeze\(\{([\s\S]*?)\}\);/);
  assert.ok(fir, 'ponte FIR deve continuar publicada');
  const members = fir[1].split(',').map(x => x.trim()).filter(Boolean);
  assert.deepEqual(members, [
    'state','realMapState','normalizeLocalityCode','closeLeafletRing',
    'sanitizeLeafletAreaPoints','projectGeo','polygonCentroid','escapeHtml','toast'
  ]);
});

test('eventos de integração do núcleo permanecem publicados', () => {
  const source = kernelSource();
  assert.ok(source.includes("new CustomEvent('flightflow:history-session-reset'"));
  assert.ok(source.includes("new CustomEvent('flightflow:route-fix-crossed'"));
  assert.ok(source.includes('window.gm_authFailure='));
});

test('inventário interno do núcleo exige nomes de função únicos antes da decomposição', () => {
  const source = kernelSource();
  const names = [...source.matchAll(/function\s+([A-Za-z_$][\w$]*)\s*\(/g)].map(m => m[1]);
  const counts = new Map();
  for (const name of names) counts.set(name, (counts.get(name) || 0) + 1);
  const duplicates = [...counts.entries()].filter(([, count]) => count > 1).map(([name]) => name).sort();

  assert.equal(names.length, 376);
  assert.equal(counts.size, 376);
  assert.deepEqual(duplicates, EXPECTED_DUPLICATES);
  assert.equal(counts.get('buildTimeline'), 1);
  assert.equal(counts.get('getSourceClass'), 1);
});