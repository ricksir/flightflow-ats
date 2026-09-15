'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = path.resolve(__dirname, '..');
const HTML = path.join(ROOT, 'index.html');
const FUNCTION_NAME = 'stepTypography';
const EXPECTED_SOURCE = 'function stepTypography(delta) {\n    applyTypography((state.config.fontScale || 1) + delta, { persist: true, notify: false });\n  }';
const EXPECTED_BYTES = 130;
const EXPECTED_SHA256 = 'a9fdef5d62eea60e5f3ea207a99f78bc26f83897da68384d5ce5eedec0914afd';
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

function loadFunction(state, applyTypography) {
  const source = extractNamedFunction(kernelSource(), FUNCTION_NAME);
  return Function(
    'state',
    'applyTypography',
    source + '\nreturn stepTypography;'
  )(state, applyTypography);
}

test('stepTypography congela exatamente a fronteira selecionada no remap #207', () => {
  const source = extractNamedFunction(kernelSource(), FUNCTION_NAME);
  assert.equal(source, EXPECTED_SOURCE);
  assert.equal(Buffer.byteLength(source, 'utf8'), EXPECTED_BYTES);
  assert.equal(crypto.createHash('sha256').update(source, 'utf8').digest('hex'), EXPECTED_SHA256);
});

test('stepTypography não contém lógica temporal, espacial, cartográfica ou externa direta', () => {
  const source = extractNamedFunction(kernelSource(), FUNCTION_NAME);
  for (const token of [
    'currentEvent', 'goTo', 'renderCurrent', 'timeline', 'scrubber', 'autoplay',
    'route', 'planner', 'interpol', 'aircraft', 'map', 'realMap', 'googleMap',
    'leaflet', 'geometry', 'coordinate', 'fix', 'DEP', 'ground', 'runway',
    'airport', 'aerodrome', 'fetch(', 'document.', 'window.', 'localStorage',
    'sessionStorage', 'setTimeout(', 'setInterval(', 'requestAnimationFrame('
  ]) {
    assert.equal(source.includes(token), false, 'acoplamento inesperado: ' + token);
  }

  assert.equal((source.match(/\bapplyTypography\s*\(/g) || []).length, 1);
  assert.equal((source.match(/\bstate\.config\.fontScale\b/g) || []).length, 1);
});

test('stepTypography mantém exatamente os dois consumidores dos botões de escala', () => {
  const kernel = kernelSource();
  assert.equal(kernel.split('function stepTypography(').length - 1, 1);
  assert.equal(kernel.split('stepTypography').length - 1, EXPECTED_CONSUMERS + 1);
  assert.ok(kernel.includes("els.fontScaleDownBtn.addEventListener('click', () => stepTypography(-0.05));"));
  assert.ok(kernel.includes("els.fontScaleUpBtn.addEventListener('click', () => stepTypography(0.05));"));
});

test('stepTypography soma delta à escala corrente e delega com persistência sem notificação', () => {
  const state = { config: { fontScale: 1.2 }, untouched: 7 };
  const calls = [];
  const fn = loadFunction(state, (value, options) => calls.push({ value, options: { ...options } }));

  const result = fn(0.05);

  assert.equal(result, undefined);
  assert.equal(state.config.fontScale, 1.2);
  assert.equal(state.untouched, 7);
  assert.equal(calls.length, 1);
  assert.ok(Math.abs(calls[0].value - 1.25) < 1e-12);
  assert.deepEqual(calls[0].options, { persist: true, notify: false });
});

test('stepTypography usa 1 como fallback para fontScale falsy', () => {
  const state = { config: { fontScale: 0 } };
  const calls = [];
  const fn = loadFunction(state, (value, options) => calls.push([value, options]));

  fn(-0.05);

  assert.equal(calls.length, 1);
  assert.ok(Math.abs(calls[0][0] - 0.95) < 1e-12);
  assert.deepEqual(calls[0][1], { persist: true, notify: false });
  assert.equal(state.config.fontScale, 0);
});

test('stepTypography propaga erro de applyTypography sem mutação direta', () => {
  const state = { config: { fontScale: 1.1 }, untouched: 9 };
  const sentinel = new Error('applyTypography sentinel');
  const fn = loadFunction(state, () => { throw sentinel; });

  assert.throws(() => fn(0.05), error => error === sentinel);
  assert.equal(state.config.fontScale, 1.1);
  assert.equal(state.untouched, 9);
});
