'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = path.resolve(__dirname, '..');
const HTML = path.join(ROOT, 'index.html');
const MODULE = path.join(ROOT, 'src', 'ui', 'strip-window-controller.js');
const FUNCTION_NAME = 'minimizeStrip';
const EXPECTED_SOURCE = 'function minimizeStrip(){state.stripMinimized=true;setStripVisible(false,{minimized:true});}';
const EXPECTED_BYTES = 92;
const EXPECTED_SHA256 = 'b773e96b5cc2f540ecb2133459cfacb176b2ff3ee1a88be1f3c9a6f0f8fac048';
const EXPECTED_CONSUMERS = 2;

function kernelSource() {
  const html = fs.readFileSync(HTML, 'utf8');
  const anchor = 'window.__FlightFlowFirBridge = Object.freeze({';
  const anchorIndex = html.indexOf(anchor);
  assert.ok(anchorIndex >= 0, 'ponte FIR deve continuar dentro do IIFE principal');
  const scriptStart = html.lastIndexOf('<script', anchorIndex);
  const bodyStart = html.indexOf('>', scriptStart) + 1;
  const bodyEnd = html.indexOf('</script>', anchorIndex);
  assert.ok(scriptStart >= 0 && bodyStart > scriptStart && bodyEnd > bodyStart);
  return html.slice(bodyStart, bodyEnd);
}

function extractNamedFunction(source, name) {
  const marker = new RegExp('\\bfunction\\s+' + name + '\\s*\\([^)]*\\)\\s*\\{', 'g');
  const match = marker.exec(source);
  assert.ok(match, name + ' deve existir no núcleo protegido');
  const start = match.index;
  const braceStart = start + match[0].length - 1;
  let depth = 0;
  let mode = 'code';

  for (let i = braceStart; i < source.length; i += 1) {
    const c = source[i];
    const n = source[i + 1];
    if (mode === 'code') {
      if (c === "'") mode = 'sq';
      else if (c === '"') mode = 'dq';
      else if (c === '`') mode = 'tpl';
      else if (c === '/' && n === '/') { mode = 'line'; i += 1; }
      else if (c === '/' && n === '*') { mode = 'block'; i += 1; }
      else if (c === '{') depth += 1;
      else if (c === '}') {
        depth -= 1;
        if (depth === 0) return source.slice(start, i + 1);
      }
    } else if (mode === 'sq') {
      if (c === '\\') i += 1;
      else if (c === "'") mode = 'code';
    } else if (mode === 'dq') {
      if (c === '\\') i += 1;
      else if (c === '"') mode = 'code';
    } else if (mode === 'tpl') {
      if (c === '\\') i += 1;
      else if (c === '`') mode = 'code';
    } else if (mode === 'line') {
      if (c === '\n') mode = 'code';
    } else if (mode === 'block') {
      if (c === '*' && n === '/') { mode = 'code'; i += 1; }
    }
  }

  throw new Error('fim de ' + name + ' não encontrado');
}

function moduleSource() {
  return fs.readFileSync(MODULE, 'utf8');
}

function loadFunction(state, setStripVisible) {
  const source = moduleSource();
  const context = { window: {} };
  Function('window', source)(context.window);
  return context.window.FlightFlowStripWindowController
    .create({ state, setStripVisible })
    .minimizeStrip;
}

test('minimizeStrip congela exatamente a fronteira selecionada no remap #199', () => {
  const source = extractNamedFunction(moduleSource(), FUNCTION_NAME);
  assert.equal(source, EXPECTED_SOURCE);
  assert.equal(Buffer.byteLength(source, 'utf8'), EXPECTED_BYTES);
  assert.equal(crypto.createHash('sha256').update(source, 'utf8').digest('hex'), EXPECTED_SHA256);
});

test('minimizeStrip não contém lógica temporal, espacial, de mapa ou infraestrutura externa', () => {
  const source = extractNamedFunction(moduleSource(), FUNCTION_NAME);
  for (const token of [
    'currentEvent', 'goTo', 'renderCurrent', 'timeline', 'scrubber', 'autoplay',
    'route', 'planner', 'interpol', 'aircraft', 'map', 'realMap', 'googleMap',
    'leaflet', 'geometry', 'coordinate', 'fix', 'DEP', 'ground', 'runway',
    'airport', 'aerodrome', 'fetch(', 'document.', 'window.', 'localStorage',
    'sessionStorage', 'setTimeout(', 'setInterval(', 'requestAnimationFrame('
  ]) {
    assert.equal(source.includes(token), false, 'acoplamento inesperado: ' + token);
  }

  assert.equal((source.match(/\bsetStripVisible\s*\(/g) || []).length, 1);
  assert.equal((source.match(/\bstate\.stripMinimized\b/g) || []).length, 1);
});

test('minimizeStrip sai do kernel, preserva wiring e mantém exatamente dois consumidores funcionais', () => {
  const kernel = kernelSource();
  const module = moduleSource();
  assert.equal(kernel.split('function minimizeStrip(').length - 1, 0);
  assert.equal(module.split('function minimizeStrip(').length - 1, 1);
  assert.equal(kernel.split('minimizeStrip').length - 1, EXPECTED_CONSUMERS + 1);
  assert.ok(kernel.includes('const StripWindowController = window.FlightFlowStripWindowController;'));
  assert.ok(kernel.includes("if (!StripWindowController) throw new Error('FlightFlowStripWindowController não foi carregado.');"));
  assert.ok(kernel.includes('const { minimizeStrip } = StripWindowController.create({ state, setStripVisible });'));
  assert.ok(kernel.includes("els.stripCloseBtn.addEventListener('click', minimizeStrip);"));

  const toggle = extractNamedFunction(kernel, 'toggleStrip');
  assert.ok(toggle.includes('state.stripVisible?minimizeStrip():setStripVisible(true);'));
  assert.equal((toggle.match(/\bminimizeStrip\s*\(/g) || []).length, 1);
});

test('minimizeStrip marca o estado como minimizado antes de fechar a Strip', () => {
  const state = { stripMinimized: false, stripVisible: true, untouched: 7 };
  const calls = [];
  const fn = loadFunction(state, (visible, options) => {
    calls.push({
      visible,
      options: { ...options },
      minimizedAtCall: state.stripMinimized,
      visibleAtCall: state.stripVisible,
    });
  });

  const result = fn();

  assert.equal(result, undefined);
  assert.equal(state.stripMinimized, true);
  assert.equal(state.stripVisible, true);
  assert.equal(state.untouched, 7);
  assert.deepEqual(calls, [{
    visible: false,
    options: { minimized: true },
    minimizedAtCall: true,
    visibleAtCall: true,
  }]);
});

test('minimizeStrip repete a operação mesmo quando já estava minimizada', () => {
  const state = { stripMinimized: true };
  const calls = [];
  const fn = loadFunction(state, (visible, options) => calls.push([visible, options]));

  fn();

  assert.equal(state.stripMinimized, true);
  assert.deepEqual(calls, [[false, { minimized: true }]]);
});

test('minimizeStrip propaga erro de setStripVisible depois de registrar stripMinimized=true', () => {
  const state = { stripMinimized: false };
  const sentinel = new Error('setStripVisible sentinel');
  const fn = loadFunction(state, () => { throw sentinel; });

  assert.throws(() => fn(), error => error === sentinel);
  assert.equal(state.stripMinimized, true);
});
