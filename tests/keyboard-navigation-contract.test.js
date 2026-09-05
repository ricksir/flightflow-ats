'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = path.resolve(__dirname, '..');
const HTML = path.join(ROOT, 'index.html');
const EXPECTED_BYTES = 883;
const EXPECTED_SHA256 = 'f058462894b9f87a35c322eacf64c1047bea1579beac1821d789c25a6016b560';
const DOCUMENT_BINDING = "document.addEventListener('keydown', handleKeyboard);";

function htmlSource() {
  return fs.readFileSync(HTML, 'utf8');
}

function extractNamedFunction(source, name) {
  const marker = `function ${name}(`;
  const start = source.indexOf(marker);
  assert.notEqual(start, -1, `${name} deve existir no IIFE principal`);
  const brace = source.indexOf('{', start);
  assert.notEqual(brace, -1, `abertura de ${name} não encontrada`);

  let depth = 0;
  let mode = 'code';
  let quote = '';
  let escaped = false;
  for (let i = brace; i < source.length; i++) {
    const c = source[i];
    const n = source[i + 1] || '';
    if (mode === 'line') { if (c === '\n') mode = 'code'; continue; }
    if (mode === 'block') { if (c === '*' && n === '/') { mode = 'code'; i++; } continue; }
    if (mode === 'string') {
      if (escaped) escaped = false;
      else if (c === '\\') escaped = true;
      else if (c === quote) mode = 'code';
      continue;
    }
    if (mode === 'template') {
      if (escaped) escaped = false;
      else if (c === '\\') escaped = true;
      else if (c === '`') mode = 'code';
      continue;
    }
    if (c === '/' && n === '/') { mode = 'line'; i++; continue; }
    if (c === '/' && n === '*') { mode = 'block'; i++; continue; }
    if (c === '"' || c === "'") { mode = 'string'; quote = c; continue; }
    if (c === '`') { mode = 'template'; continue; }
    if (c === '{') depth++;
    if (c === '}') {
      depth--;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  assert.fail(`fim de ${name} não encontrado`);
}

function keyboardSource() {
  return extractNamedFunction(htmlSource(), 'handleKeyboard');
}

function assertOrdered(source, tokens) {
  let cursor = -1;
  for (const token of tokens) {
    const next = source.indexOf(token);
    assert.notEqual(next, -1, `trecho ausente: ${token}`);
    assert.ok(next > cursor, `ordem alterada perto de: ${token}`);
    cursor = next;
  }
}

test('handleKeyboard mantém identidade estrutural exata antes da extração', () => {
  const source = keyboardSource();
  assert.equal(Buffer.byteLength(source, 'utf8'), EXPECTED_BYTES);
  assert.equal(crypto.createHash('sha256').update(source).digest('hex'), EXPECTED_SHA256);
  assert.match(source, /^function handleKeyboard\(event\) \{/);
});

test('document mantém exatamente um binding global para handleKeyboard', () => {
  const html = htmlSource();
  assert.equal(html.split(DOCUMENT_BINDING).length - 1, 1);
});

test('teclado ignora campos editáveis e qualquer dialog aberto antes de consultar histórico', () => {
  const source = keyboardSource();
  assertOrdered(source, [
    `event.target.matches('input, textarea, select, [contenteditable="true"]')`,
    `document.querySelector('dialog[open]')`,
    'if (!state.parsed) return;',
  ]);
});

test('Space exige histórico, previne default e alterna playback', () => {
  const source = keyboardSource();
  assertOrdered(source, [
    'if (!state.parsed) return;',
    "if (event.code === 'Space')",
    'event.preventDefault();',
    'togglePlayback();',
  ]);
});

test('setas preservam stopPlayback antes da navegação relativa', () => {
  const source = keyboardSource();
  assert.ok(source.includes("else if (event.key === 'ArrowLeft') { event.preventDefault(); stopPlayback(); goTo(state.index - 1); }"));
  assert.ok(source.includes("else if (event.key === 'ArrowRight') { event.preventDefault(); stopPlayback(); goTo(state.index + 1); }"));
});

test('Home e End preservam limites exatos e interrompem playback', () => {
  const source = keyboardSource();
  assert.ok(source.includes("else if (event.key === 'Home') { event.preventDefault(); stopPlayback(); goTo(0); }"));
  assert.ok(source.includes("else if (event.key === 'End') { event.preventDefault(); stopPlayback(); goTo(state.parsed.events.length - 1); }"));
});

test('atalhos M, F e S preservam suas ações atuais', () => {
  const source = keyboardSource();
  assertOrdered(source, [
    "else if (event.key.toLowerCase() === 'm') showExactMessage();",
    "else if (event.key.toLowerCase() === 'f') toggleFpv();",
    "else if (event.key.toLowerCase() === 's') toggleStrip();",
  ]);
});

test('baseline atual não filtra Ctrl, Meta, Alt, defaultPrevented nem foco em button', () => {
  const source = keyboardSource();
  for (const absent of ['ctrlKey', 'metaKey', 'altKey', 'defaultPrevented', 'button']) {
    assert.equal(source.includes(absent), false, `baseline não deve ganhar filtro silencioso para ${absent}`);
  }
});

test('handleKeyboard permanece desacoplado de rota, mapa, aeronave, storage e parser', () => {
  const source = keyboardSource();
  for (const forbidden of [
    'FlightFlowRouteProcessedV7412', 'transitionPlanForEvents', 'transitionDurations',
    'realMapState', 'google.', 'L.', 'aircraft', 'plane', 'localStorage', 'sessionStorage', 'indexedDB',
    'FlightParser', 'Parser.'
  ]) assert.equal(source.includes(forbidden), false, `acoplamento proibido: ${forbidden}`);
});
