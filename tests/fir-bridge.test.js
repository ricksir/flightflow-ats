const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const HTML = path.join(ROOT, 'index.html');
const FIR_MODULE = path.join(ROOT, 'src', 'map', 'fir-layers.js');
const EXPECTED_BRIDGE_MEMBERS = [
  'state',
  'realMapState',
  'normalizeLocalityCode',
  'closeLeafletRing',
  'sanitizeLeafletAreaPoints',
  'projectGeo',
  'polygonCentroid',
  'escapeHtml',
  'toast',
];

test('IIFE principal publica exatamente o contrato esperado da ponte FIR', () => {
  const html = fs.readFileSync(HTML, 'utf8');
  const match = html.match(/window\.__FlightFlowFirBridge\s*=\s*Object\.freeze\(\{([\s\S]*?)\}\);/);
  assert.ok(match, 'window.__FlightFlowFirBridge deve continuar publicado');
  const members = match[1].split(',').map(value => value.trim()).filter(Boolean);
  assert.deepEqual(members, EXPECTED_BRIDGE_MEMBERS);
});

test('camada FIR externa consome a ponte e preserva contratos externos', () => {
  const source = fs.readFileSync(FIR_MODULE, 'utf8');
  assert.ok(source.includes('/* FlightFlow v7.3.5 — camadas FIR selecionáveis e persistentes */'));
  assert.ok(source.includes('const bridge=window.__FlightFlowFirBridge;'));
  assert.ok(source.includes("const FIR_STORAGE_KEY='flightflow-manual-firs-v1';"));
  assert.ok(source.includes('window.renderManualFirLayers=renderManualFirLayers;'));
  assert.ok(source.includes("window.addEventListener('storage'"));
  assert.ok(source.includes("document.addEventListener('DOMContentLoaded'"));
  for (const member of EXPECTED_BRIDGE_MEMBERS) {
    assert.ok(source.includes(member), `FIR deve continuar referenciando ${member}`);
  }
});

test('index carrega a camada FIR externa depois de publicar a ponte', () => {
  const html = fs.readFileSync(HTML, 'utf8');
  const tag = '<script id="flightflow-fir-layers" src="src/map/fir-layers.js"></script>';
  const bridgeIndex = html.indexOf('window.__FlightFlowFirBridge = Object.freeze({');
  const moduleIndex = html.indexOf(tag);
  assert.ok(bridgeIndex >= 0, 'ponte FIR deve permanecer no IIFE principal');
  assert.ok(moduleIndex > bridgeIndex, 'módulo FIR deve carregar depois da ponte');
  assert.equal(html.indexOf(tag, moduleIndex + 1), -1, 'referência externa FIR deve ser única');
  assert.equal(html.includes('/* FlightFlow v7.3.5 — camadas FIR selecionáveis e persistentes */'), false, 'implementação FIR não deve voltar a ficar inline');
});
