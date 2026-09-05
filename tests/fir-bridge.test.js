const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const HTML = path.join(ROOT, 'index.html');
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

  const members = match[1]
    .split(',')
    .map(value => value.trim())
    .filter(Boolean);

  assert.deepEqual(members, EXPECTED_BRIDGE_MEMBERS);
});

test('camada FIR inline consome a ponte e preserva contratos externos', () => {
  const html = fs.readFileSync(HTML, 'utf8');
  const marker = '/* FlightFlow v7.3.5 — camadas FIR selecionáveis e persistentes */';
  const start = html.indexOf(marker);
  assert.ok(start >= 0, 'marcador da camada FIR deve existir antes da extração');
  const close = html.indexOf('</script>', start);
  assert.ok(close > start, 'bloco FIR inline deve possuir fechamento de script');
  const source = html.slice(start, close);

  assert.ok(source.includes('const bridge=window.__FlightFlowFirBridge;'));
  assert.ok(source.includes("const FIR_STORAGE_KEY='flightflow-manual-firs-v1';"));
  assert.ok(source.includes('window.renderManualFirLayers=renderManualFirLayers;'));
  assert.ok(source.includes("window.addEventListener('storage'"));
  assert.ok(source.includes("document.addEventListener('DOMContentLoaded'"));

  for (const member of EXPECTED_BRIDGE_MEMBERS) {
    assert.ok(source.includes(member), `FIR deve continuar referenciando ${member}`);
  }
});
