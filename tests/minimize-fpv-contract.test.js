'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = path.resolve(__dirname, '..');
const HTML = path.join(ROOT, 'index.html');
const FUNCTION_NAME = 'minimizeFpv';
const EXPECTED_SOURCE = 'function minimizeFpv(){state.fpvMinimized=true;setFpvVisible(false,{minimized:true});}';
const EXPECTED_BYTES = 86;
const EXPECTED_SHA256 = '37103f3e8cde8970f15adb8a89be34cf4aee6fd827f93c606872f3403138a482';
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

function loadFunction(state, setFpvVisible) {
  const source = extractNamedFunction(kernelSource(), FUNCTION_NAME);
  return Function(
    'state',
    'setFpvVisible',
    source + '\nreturn minimizeFpv;'
  )(state, setFpvVisible);
}

test('minimizeFpv congela exatamente a fronteira selecionada no remap #195', () => {
  const source = extractNamedFunction(kernelSource(), FUNCTION_NAME);
  assert.equal(source, EXPECTED_SOURCE);
  assert.equal(Buffer.byteLength(source, 'utf8'), EXPECTED_BYTES);
  assert.equal(crypto.createHash('sha256').update(source, 'utf8').digest('hex'), EXPECTED_SHA256);
});

test('minimizeFpv não contém lógica temporal, espacial, de mapa ou infraestrutura externa', () => {
  const source = extractNamedFunction(kernelSource(), FUNCTION_NAME);
  for (const token of [
    'currentEvent', 'goTo', 'renderCurrent', 'timeline', 'scrubber', 'autoplay',
    'route', 'planner', 'interpol', 'aircraft', 'map', 'realMap', 'googleMap',
    'leaflet', 'geometry', 'coordinate', 'fix', 'DEP', 'fetch(', 'document.',
    'window.', 'localStorage', 'sessionStorage', 'setTimeout(', 'setInterval(',
    'requestAnimationFrame('
  ]) {
    assert.equal(source.includes(token), false, 'acoplamento inesperado: ' + token);
  }

  assert.equal((source.match(/\bsetFpvVisible\s*\(/g) || []).length, 1);
  assert.equal((source.match(/\bstate\.fpvMinimized\b/g) || []).length, 1);
});

test('minimizeFpv mantém exatamente dois consumidores funcionais', () => {
  const kernel = kernelSource();
  assert.equal(kernel.split('function minimizeFpv(').length - 1, 1);
  assert.equal(kernel.split('minimizeFpv').length - 1, EXPECTED_CONSUMERS + 1);
  assert.ok(kernel.includes("els.fpvCloseBtn.addEventListener('click', minimizeFpv);"));

  const toggle = extractNamedFunction(kernel, 'toggleFpv');
  assert.ok(toggle.includes('state.fpvVisible?minimizeFpv():setFpvVisible(true);'));
  assert.equal((toggle.match(/\bminimizeFpv\s*\(/g) || []).length, 1);
});

test('minimizeFpv marca o estado como minimizado antes de fechar a FPV', () => {
  const state = { fpvMinimized: false, fpvVisible: true, untouched: 7 };
  const calls = [];
  const fn = loadFunction(state, (visible, options) => {
    calls.push({
      visible,
      options: { ...options },
      minimizedAtCall: state.fpvMinimized,
      visibleAtCall: state.fpvVisible,
    });
  });

  const result = fn();

  assert.equal(result, undefined);
  assert.equal(state.fpvMinimized, true);
  assert.equal(state.fpvVisible, true);
  assert.equal(state.untouched, 7);
  assert.deepEqual(calls, [{
    visible: false,
    options: { minimized: true },
    minimizedAtCall: true,
    visibleAtCall: true,
  }]);
});

test('minimizeFpv repete a operação mesmo quando já estava minimizado', () => {
  const state = { fpvMinimized: true };
  const calls = [];
  const fn = loadFunction(state, (visible, options) => calls.push([visible, options]));

  fn();

  assert.equal(state.fpvMinimized, true);
  assert.deepEqual(calls, [[false, { minimized: true }]]);
});

test('minimizeFpv propaga erro de setFpvVisible depois de registrar fpvMinimized=true', () => {
  const state = { fpvMinimized: false };
  const sentinel = new Error('setFpvVisible sentinel');
  const fn = loadFunction(state, () => { throw sentinel; });

  assert.throws(() => fn(), error => error === sentinel);
  assert.equal(state.fpvMinimized, true);
});
