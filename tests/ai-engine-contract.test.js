const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = path.resolve(__dirname, '..');
const HTML = path.join(ROOT, 'index.html');
const EXPECTED_SHA256 = '304326300500423f81e250208a5c4eca839b76fb07e5c16c9fa0b30d6689bcd9';
const EXPECTED_BYTES = 165965;
const EXPECTED_VERSION = '1.3.2';
const PUBLIC_FUNCTIONS = [
  'analyzeRaw', 'parseHistory', 'runSelfTests', 'getModel', 'getCurrentAnalysis',
  'expectedNextMessages', 'inferCycleState', 'answerQuestion', 'buildReport',
  'getManualBrain', 'searchManuals', 'normativeSupport', 'findMessageAnywhereAfter',
  'applyFalsePositiveMask', 'getConfirmedErrors', 'getFalsePositives',
  'resetCurrentSession', 'refreshReviewUI'
];

function aiSource() {
  const html = fs.readFileSync(HTML, 'utf8');
  const tokenIndex = html.indexOf('AI_ENGINE_VERSION');
  assert.ok(tokenIndex >= 0, 'AI_ENGINE_VERSION deve permanecer no bloco de IA');
  const open = html.lastIndexOf('<script', tokenIndex);
  const bodyStart = html.indexOf('>', open) + 1;
  const close = html.indexOf('</script>', tokenIndex);
  assert.ok(open >= 0 && bodyStart > open && close > bodyStart, 'bloco de IA deve continuar delimitado');
  return html.slice(bodyStart, close).replace(/^\n+|\n+$/g, '') + '\n';
}

test('motor IA inline mantém identidade estrutural antes da extração', () => {
  const source = aiSource();
  assert.equal(Buffer.byteLength(source, 'utf8'), EXPECTED_BYTES);
  assert.equal(crypto.createHash('sha256').update(source).digest('hex'), EXPECTED_SHA256);
  assert.match(source, /^\(function \(\) \{\n\s*'use strict';/);
  assert.match(source, /\}\)\(\);\n$/);
});

test('motor IA preserva versão, persistência e listeners conhecidos', () => {
  const source = aiSource();
  for (const token of [
    `const AI_ENGINE_VERSION = '${EXPECTED_VERSION}';`,
    'const MODEL_SCHEMA_VERSION = 1;',
    "const MODEL_KEY = 'flightflow-ai-governance-v1';",
    "const AUDIT_KEY = 'flightflow-ai-audit-v1';",
    "const SETTINGS_KEY = 'flightflow-ai-settings-v1';",
    "const MANUAL_DB_NAME = 'FlightFlowAIBrain';",
    'const MANUAL_DB_VERSION = 1;',
    "const MANUAL_STORE = 'manuals';",
    "document.addEventListener('flightflow:history-session-reset'",
    "document.addEventListener('DOMContentLoaded', bindDom, { once: true })",
    'window.__flightflowKnowledgeEntries =',
    'window.__flightflowAI = Object.freeze({'
  ]) assert.ok(source.includes(token), `contrato ausente: ${token}`);
});

test('API pública congelada mantém os 18 métodos necessários', () => {
  const source = aiSource();
  const apiStart = source.indexOf('window.__flightflowAI = Object.freeze({');
  assert.ok(apiStart >= 0);
  const tail = source.slice(apiStart);
  assert.ok(tail.includes('version: AI_ENGINE_VERSION'));
  for (const name of PUBLIC_FUNCTIONS) {
    const patterns = [new RegExp(`\\b${name}\\s*,`), new RegExp(`\\b${name}\\s*:`)];
    assert.ok(patterns.some(re => re.test(tail)), `${name} deve continuar exposto na API pública`);
  }
  assert.ok(tail.includes('});'));
});

test('auto-teste interno continua disponível por ffai-test', () => {
  const source = aiSource();
  for (const token of [
    "query.get('ffai-test') === '1'",
    "document.documentElement.setAttribute('data-ffai-test-result'",
    "marker.id = 'ffai-test-marker'",
    'marker.dataset.total',
    'marker.dataset.passed',
    'marker.dataset.failed'
  ]) assert.ok(source.includes(token), `gancho de self-test ausente: ${token}`);
});
