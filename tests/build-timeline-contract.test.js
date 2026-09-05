'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = path.resolve(__dirname, '..');
const HTML = path.join(ROOT, 'index.html');
const EXPECTED_BYTES = 1681;
const EXPECTED_LINES = 20;
const EXPECTED_SHA256 = '5c152a66eee7d3a5294f868340725275a705d1432a3351b90733a29fa535c85a';
const EXPECTED_STATE_REFS = Object.freeze(["parsed"]);
const EXPECTED_ELS_REFS = Object.freeze(["timelineHeading", "timelineList"]);
const EXPECTED_DOCUMENT_CALLS = Object.freeze([]);
const EXPECTED_WINDOW_REFS = Object.freeze([]);
const EXPECTED_BARE_CALLS = Object.freeze(["Number", "String", "activate", "escapeHtml", "getSourceClass", "goTo", "stopPlayback"]);
const EXPECTED_MUTATION_TOKENS = Object.freeze([".innerHTML =", ".textContent =", ".dataset.", ".addEventListener("]);
const EXPECTED_RISK_TOKENS = Object.freeze(["goTo(", "innerHTML", "addEventListener("]);

function kernelSource() {
  const html = fs.readFileSync(HTML, 'utf8');
  const anchor = 'window.__FlightFlowFirBridge = Object.freeze({';
  const anchorIndex = html.indexOf(anchor);
  assert.ok(anchorIndex >= 0, 'ponte FIR deve continuar no IIFE principal');
  const open = html.lastIndexOf('<script', anchorIndex);
  const bodyStart = html.indexOf('>', open) + 1;
  const close = html.indexOf('</script>', anchorIndex);
  assert.ok(open >= 0 && bodyStart > open && close > bodyStart);
  return html.slice(bodyStart, close);
}

function buildTimelineSource() {
  const kernel = kernelSource();
  const marker = '  function buildTimeline(';
  const start = kernel.indexOf(marker);
  assert.ok(start >= 0, 'buildTimeline deve permanecer inline neste contrato');
  const end = kernel.indexOf('\n  function ', start + marker.length);
  assert.ok(end > start, 'buildTimeline deve continuar delimitável por função de topo seguinte');
  return kernel.slice(start, end).replace(/\s+$/, '');
}

function uniqMatches(source, regex) {
  return [...new Set([...source.matchAll(regex)].map(match => match[1]))].sort();
}

function bareCalls(source) {
  const ignored = new Set(['if','for','while','switch','catch','function','with','typeof','return','new','delete','void','await','yield','class','super','buildTimeline']);
  return [...new Set([...source.matchAll(/(?<![\w$.])([A-Za-z_$][\w$]*)\s*\(/g)].map(match => match[1]).filter(name => !ignored.has(name)))].sort();
}

test('buildTimeline mantém identidade exata antes da refatoração', () => {
  const source = buildTimelineSource();
  assert.equal(Buffer.byteLength(source, 'utf8'), EXPECTED_BYTES);
  assert.equal(source.split(/\r?\n/).length, EXPECTED_LINES);
  assert.equal(crypto.createHash('sha256').update(source).digest('hex'), EXPECTED_SHA256);
});

test('buildTimeline mantém fronteira atual de state, els, document e window', () => {
  const source = buildTimelineSource();
  assert.deepEqual(uniqMatches(source, /\bstate\.([A-Za-z_$][\w$]*)/g), [...EXPECTED_STATE_REFS]);
  assert.deepEqual(uniqMatches(source, /\bels\.([A-Za-z_$][\w$]*)/g), [...EXPECTED_ELS_REFS]);
  assert.deepEqual(uniqMatches(source, /\bdocument\.([A-Za-z_$][\w$]*)\s*\(/g), [...EXPECTED_DOCUMENT_CALLS]);
  assert.deepEqual(uniqMatches(source, /\bwindow\.([A-Za-z_$][\w$]*)/g), [...EXPECTED_WINDOW_REFS]);
});

test('buildTimeline mantém conjunto atual de chamadas sem receptor explícito', () => {
  assert.deepEqual(bareCalls(buildTimelineSource()), [...EXPECTED_BARE_CALLS]);
});

test('buildTimeline mantém efeitos de UI e sinais de risco explicitamente congelados', () => {
  const source = buildTimelineSource();
  const mutations = EXPECTED_MUTATION_TOKENS.filter(token => source.includes(token));
  const risks = EXPECTED_RISK_TOKENS.filter(token => source.includes(token));
  assert.deepEqual(mutations, [...EXPECTED_MUTATION_TOKENS]);
  assert.deepEqual(risks, [...EXPECTED_RISK_TOKENS]);
});

test('buildTimeline continua separada das responsabilidades já extraídas', () => {
  const source = buildTimelineSource();
  for (const forbidden of [
    'function enableControls(',
    'function updateTimelineSelection(',
    'function restartTransport(',
    'function previousTransport(',
    'function nextTransport(',
    'function scrubTransport(',
    'function startPlayback(',
    'function stopPlayback(',
  ]) assert.equal(source.includes(forbidden), false, `responsabilidade reintroduzida: ${forbidden}`);
});
