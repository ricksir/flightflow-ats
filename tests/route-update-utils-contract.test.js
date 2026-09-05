'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = path.resolve(__dirname, '..');
const HTML = path.join(ROOT, 'index.html');

const EXPECTED_KEYS_BYTES = 120;
const EXPECTED_KEYS_SHA256 = 'cffa5c6145b62b630d7775d75120f9f33ebcf9f1deefbee0cbe7210eba968281';
const EXPECTED_MEANINGFUL_BYTES = 460;
const EXPECTED_MEANINGFUL_LINES = 9;
const EXPECTED_MEANINGFUL_SHA256 = '107a888c42632b1198ee29b8c47285e8533ce648c861217b20c73ebc20022fbe';
const EXPECTED_EVENT_BYTES = 456;
const EXPECTED_EVENT_LINES = 7;
const EXPECTED_EVENT_SHA256 = 'bf51357fa087053af5a77946db8ca958c435efa95d198a36986f018cea5baee3';

function kernelSource() {
  const html = fs.readFileSync(HTML, 'utf8');
  const anchor = 'window.__FlightFlowFirBridge = Object.freeze({';
  const pos = html.indexOf(anchor);
  assert.ok(pos >= 0, 'ponte FIR deve continuar dentro do IIFE principal');
  const open = html.lastIndexOf('<script', pos);
  const bodyStart = html.indexOf('>', open) + 1;
  const close = html.indexOf('</script>', pos);
  assert.ok(open >= 0 && bodyStart > open && close > bodyStart, 'IIFE principal deve continuar delimitado');
  return html.slice(bodyStart, close);
}

function functionSource(container, name) {
  const marker = `  function ${name}(`;
  const start = container.indexOf(marker);
  assert.ok(start >= 0, `${name} deve permanecer inline antes da extração`);
  const paren = container.indexOf('(', start);
  let i = paren;
  let depth = 0;
  let quote = null;
  let escaped = false;
  while (i < container.length) {
    const c = container[i];
    if (quote) {
      if (escaped) escaped = false;
      else if (c === '\\') escaped = true;
      else if (c === quote) quote = null;
      i += 1;
      continue;
    }
    if (c === "'" || c === '"' || c === '`') { quote = c; i += 1; continue; }
    if (c === '(') depth += 1;
    else if (c === ')') { depth -= 1; if (depth === 0) break; }
    i += 1;
  }
  let brace = i + 1;
  while (/\s/.test(container[brace] || '')) brace += 1;
  assert.equal(container[brace], '{');
  depth = 0;
  quote = null;
  escaped = false;
  for (i = brace; i < container.length; i += 1) {
    const c = container[i];
    if (quote) {
      if (escaped) escaped = false;
      else if (c === '\\') escaped = true;
      else if (c === quote) quote = null;
      continue;
    }
    if (c === "'" || c === '"' || c === '`') { quote = c; continue; }
    if (c === '{') depth += 1;
    else if (c === '}') {
      depth -= 1;
      if (depth === 0) return container.slice(start, i + 1);
    }
  }
  throw new Error(`fim de ${name} não encontrado`);
}

function keysSource(container) {
  const source = "  const ROUTE_UPDATE_KEYS = new Set(['route','sid','star','adep','ades','runwayDeparture','runwayArrival','cfl','rfl']);";
  assert.equal(container.includes(source), true, 'ROUTE_UPDATE_KEYS deve manter declaração exata');
  return source;
}

function loadCluster() {
  const kernel = kernelSource();
  const keys = keysSource(kernel);
  const meaningful = functionSource(kernel, 'isMeaningfulRouteChange');
  const event = functionSource(kernel, 'isRouteUpdateEvent');
  return Function(`${keys}\n${meaningful}\n${event}\nreturn { ROUTE_UPDATE_KEYS, isMeaningfulRouteChange, isRouteUpdateEvent };`)();
}

test('cluster de atualização de rota mantém identidades exatas antes da extração', () => {
  const kernel = kernelSource();
  const keys = keysSource(kernel);
  const meaningful = functionSource(kernel, 'isMeaningfulRouteChange');
  const event = functionSource(kernel, 'isRouteUpdateEvent');

  assert.equal(Buffer.byteLength(keys, 'utf8'), EXPECTED_KEYS_BYTES);
  assert.equal(crypto.createHash('sha256').update(keys).digest('hex'), EXPECTED_KEYS_SHA256);

  assert.equal(Buffer.byteLength(meaningful, 'utf8'), EXPECTED_MEANINGFUL_BYTES);
  assert.equal(meaningful.split(/\r?\n/).length, EXPECTED_MEANINGFUL_LINES);
  assert.equal(crypto.createHash('sha256').update(meaningful).digest('hex'), EXPECTED_MEANINGFUL_SHA256);

  assert.equal(Buffer.byteLength(event, 'utf8'), EXPECTED_EVENT_BYTES);
  assert.equal(event.split(/\r?\n/).length, EXPECTED_EVENT_LINES);
  assert.equal(crypto.createHash('sha256').update(event).digest('hex'), EXPECTED_EVENT_SHA256);
});

test('cluster mantém fronteira fechada e exatamente um consumidor externo', () => {
  const kernel = kernelSource();
  assert.equal((kernel.match(/ROUTE_UPDATE_KEYS/g) || []).length, 2);
  assert.equal([...kernel.matchAll(/(?<![\w$.])isMeaningfulRouteChange\s*\(/g)].length - 1, 1);
  assert.equal([...kernel.matchAll(/(?<![\w$.])isRouteUpdateEvent\s*\(/g)].length - 1, 1);

  const source = `${functionSource(kernel, 'isMeaningfulRouteChange')}\n${functionSource(kernel, 'isRouteUpdateEvent')}`;
  for (const token of [
    'state.', 'els.', 'document.', 'window.', 'localStorage', 'sessionStorage',
    'indexedDB', 'fetch(', 'goTo(', 'renderCurrent(', 'setTimeout(', 'setInterval(',
    'requestAnimationFrame(', 'navigator.', 'google.', 'L.', 'Parser', 'realMapState',
    'CustomEvent', 'dispatchEvent', 'addEventListener', 'querySelector', 'getElementById'
  ]) assert.equal(source.includes(token), false, `acoplamento inesperado: ${token}`);
});

test('ROUTE_UPDATE_KEYS preserva exatamente as nove chaves conhecidas', () => {
  const { ROUTE_UPDATE_KEYS } = loadCluster();
  assert.deepEqual([...ROUTE_UPDATE_KEYS], [
    'route', 'sid', 'star', 'adep', 'ades', 'runwayDeparture', 'runwayArrival', 'cfl', 'rfl'
  ]);
});

test('isMeaningfulRouteChange preserva normalização e rejeições atuais', () => {
  const { isMeaningfulRouteChange } = loadCluster();
  assert.equal(isMeaningfulRouteChange(null), false);
  assert.equal(isMeaningfulRouteChange({ key: 'unknown', before: 'A', after: 'B' }), false);
  assert.equal(isMeaningfulRouteChange({ key: 'route', before: ' UL304   NAXOP ', after: 'ul304 naxop' }), false);
  assert.equal(isMeaningfulRouteChange({ key: 'route', before: 'DCT', after: '   ' }), false);
  assert.equal(isMeaningfulRouteChange({ key: 'route', before: 'DCT', after: '—' }), false);
  assert.equal(isMeaningfulRouteChange({ key: 'route', before: 'DCT', after: 'n/a' }), false);
});

test('isMeaningfulRouteChange preserva diferença entre rota e campos operacionais imediatos', () => {
  const { isMeaningfulRouteChange } = loadCluster();
  assert.equal(isMeaningfulRouteChange({ key: 'route', before: '', after: 'DCT' }), false);
  assert.equal(isMeaningfulRouteChange({ key: 'route', before: 'DCT', after: 'UL304' }), true);
  assert.equal(isMeaningfulRouteChange({ key: 'cfl', before: 'F100', after: 'F120' }), true);
  assert.equal(isMeaningfulRouteChange({ key: 'sid', before: '', after: 'ANPU1A' }), true);
  assert.equal(isMeaningfulRouteChange({ key: 'star', before: '', after: 'KOGRA1A' }), true);
  assert.equal(isMeaningfulRouteChange({ key: 'runwayDeparture', before: '', after: '11R' }), true);
  assert.equal(isMeaningfulRouteChange({ key: 'runwayArrival', before: '', after: '29L' }), true);
});

test('isRouteUpdateEvent exige contexto de atualização e ao menos uma mudança significativa', () => {
  const { isRouteUpdateEvent } = loadCluster();
  const change = { key: 'route', before: 'DCT', after: 'UL304' };
  assert.equal(isRouteUpdateEvent({ messageType: 'FPL', changes: [change] }), false);
  assert.equal(isRouteUpdateEvent({ messageType: 'CHG', changes: [] }), false);
  assert.equal(isRouteUpdateEvent({ messageType: 'CHG', changes: [change] }), true);
  assert.equal(isRouteUpdateEvent({ messageType: 'crq', changes: [change] }), true);
  assert.equal(isRouteUpdateEvent({ messageType: 'DLA', changes: [change] }), true);
  assert.equal(isRouteUpdateEvent({ messageType: 'INFARC', changes: [change] }), true);
});

test('isRouteUpdateEvent preserva reconhecimento atual por operação textual', () => {
  const { isRouteUpdateEvent } = loadCluster();
  const change = { key: 'sid', before: '', after: 'ANPU1A' };
  for (const operation of [
    'Modificação de plano',
    'Atualização de rota',
    'Recepção de Mensagem CHG',
    'Recepção de Mensagem DLA',
    'Envio de Mensagem CRP',
    'Processamento INFARC'
  ]) {
    assert.equal(isRouteUpdateEvent({ operation, changes: [change] }), true, operation);
  }
});
