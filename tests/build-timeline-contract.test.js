'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = path.resolve(__dirname, '..');
const HTML = path.join(ROOT, 'index.html');
const MODULE = path.join(ROOT, 'src', 'timeline', 'timeline-builder-controller.js');
const REFERENCE = '<script id="flightflow-timeline-builder-controller" src="src/timeline/timeline-builder-controller.js"></script>';
const ORIGINAL_BYTES = 1681;
const ORIGINAL_LINES = 20;
const ORIGINAL_SHA256 = '5c152a66eee7d3a5294f868340725275a705d1432a3351b90733a29fa535c85a';
const MODULE_BYTES = 2965;
const MODULE_SHA256 = '5384673695105385d3ceeb29426c2d0a67436cbf121379b55e88586a35694624';
const EXPECTED_STATE_REFS = Object.freeze(["parsed"]);
const EXPECTED_ELS_REFS = Object.freeze(["timelineHeading", "timelineList"]);
const EXPECTED_BARE_CALLS = Object.freeze(["Number", "String", "activate", "escapeHtml", "getSourceClass", "goTo", "stopPlayback"]);

function moduleSource() {
  return fs.readFileSync(MODULE, 'utf8');
}

function originalFunctionFromModule() {
  const source = moduleSource();
  const marker = '  function buildTimeline(';
  const start = source.indexOf(marker);
  assert.ok(start >= 0, 'módulo deve preservar o bloco original de buildTimeline');
  const end = source.indexOf('\n\n    return Object.freeze({ buildTimeline });', start);
  assert.ok(end > start, 'bloco buildTimeline deve continuar delimitável no módulo');
  return source.slice(start, end).replace(/\s+$/, '');
}

function kernelSource() {
  const html = fs.readFileSync(HTML, 'utf8');
  const anchor = 'window.__FlightFlowFirBridge = Object.freeze({';
  const anchorIndex = html.indexOf(anchor);
  assert.ok(anchorIndex >= 0, 'ponte FIR deve continuar no IIFE principal');
  const open = html.lastIndexOf('<script', anchorIndex);
  const bodyStart = html.indexOf('>', open) + 1;
  const close = html.indexOf('</script>', anchorIndex);
  return html.slice(bodyStart, close);
}

function uniqMatches(source, regex) {
  return [...new Set([...source.matchAll(regex)].map(match => match[1]))].sort();
}

function bareCalls(source) {
  const ignored = new Set(['if','for','while','switch','catch','function','with','typeof','return','new','delete','void','await','yield','class','super','buildTimeline']);
  return [...new Set([...source.matchAll(/(?<![\w$.])([A-Za-z_$][\w$]*)\s*\(/g)].map(match => match[1]).filter(name => !ignored.has(name)))].sort();
}

test('módulo timeline-builder mantém identidade estrutural e API mínima', () => {
  const source = moduleSource();
  assert.equal(Buffer.byteLength(source, 'utf8'), MODULE_BYTES);
  assert.equal(crypto.createHash('sha256').update(source).digest('hex'), MODULE_SHA256);
  assert.ok(source.startsWith('(function (root, factory) {'));
  assert.ok(source.includes('root.FlightFlowTimelineBuilderController = api;'));
  const Controller = require(MODULE);
  assert.equal(Object.isFrozen(Controller), true);
  assert.deepEqual(Object.keys(Controller), ['create']);
});

test('buildTimeline foi movida preservando exatamente os 1.681 bytes congelados', () => {
  const source = originalFunctionFromModule();
  assert.equal(Buffer.byteLength(source, 'utf8'), ORIGINAL_BYTES);
  assert.equal(source.split(/\r?\n/).length, ORIGINAL_LINES);
  assert.equal(crypto.createHash('sha256').update(source).digest('hex'), ORIGINAL_SHA256);
});

test('buildTimeline preserva a fronteira congelada de state, els e chamadas', () => {
  const source = originalFunctionFromModule();
  assert.deepEqual(uniqMatches(source, /\bstate\.([A-Za-z_$][\w$]*)/g), [...EXPECTED_STATE_REFS]);
  assert.deepEqual(uniqMatches(source, /\bels\.([A-Za-z_$][\w$]*)/g), [...EXPECTED_ELS_REFS]);
  assert.deepEqual(bareCalls(source), [...EXPECTED_BARE_CALLS]);
  assert.equal(source.includes('document.'), false);
  assert.equal(source.includes('window.'), false);
});

test('fábrica exige explicitamente todas as dependências externas', () => {
  const Controller = require(MODULE);
  const noop = () => {};
  const base = { state: {}, els: {}, escapeHtml: noop, getSourceClass: noop, goTo: noop, stopPlayback: noop };
  assert.throws(() => Controller.create(), /requer state/);
  assert.throws(() => Controller.create({ state: {} }), /requer els/);
  assert.throws(() => Controller.create({ ...base, escapeHtml: null }), /requer escapeHtml/);
  assert.throws(() => Controller.create({ ...base, getSourceClass: null }), /requer getSourceClass/);
  assert.throws(() => Controller.create({ ...base, goTo: null }), /requer goTo/);
  assert.throws(() => Controller.create({ ...base, stopPlayback: null }), /requer stopPlayback/);
  const api = Controller.create(base);
  assert.equal(Object.isFrozen(api), true);
  assert.deepEqual(Object.keys(api), ['buildTimeline']);
});

test('index carrega timeline-builder antes do IIFE e delega buildTimeline ao módulo', () => {
  const html = fs.readFileSync(HTML, 'utf8');
  assert.equal(html.split(REFERENCE).length - 1, 1);
  const referenceIndex = html.indexOf(REFERENCE);
  const anchorIndex = html.indexOf('window.__FlightFlowFirBridge = Object.freeze({');
  const mainScriptStart = html.lastIndexOf('<script', anchorIndex);
  assert.ok(referenceIndex >= 0 && referenceIndex < mainScriptStart);
  for (const token of [
    'const TimelineBuilderController = window.FlightFlowTimelineBuilderController;',
    "if (!TimelineBuilderController) throw new Error('FlightFlowTimelineBuilderController não foi carregado.');",
    'const { buildTimeline } = TimelineBuilderController.create({',
    'escapeHtml: (...args) => escapeHtml(...args),',
    'getSourceClass: (...args) => getSourceClass(...args),',
    'goTo: (...args) => goTo(...args),',
    'stopPlayback: (...args) => stopPlayback(...args),',
  ]) assert.ok(html.includes(token), `integração ausente: ${token}`);
  assert.equal(kernelSource().includes('function buildTimeline('), false);
});
