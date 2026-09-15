'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = path.resolve(__dirname, '..');
const HTML = path.join(ROOT, 'index.html');
const MODULE = path.join(ROOT, 'src', 'knowledge', 'knowledge-popover-controller.js');
const FUNCTION_NAME = 'hideKnowledgePopover';
const EXPECTED_SOURCE = 'function hideKnowledgePopover() {\n    if (!els.knowledgePopover) return;\n    els.knowledgePopover.hidden = true;\n    state.activeKnowledgeAnchor = null;\n  }';
const EXPECTED_BYTES = 156;
const EXPECTED_SHA256 = '57adc4878279173c3b09aefef808da7eb213d614219e579479970315061003cc';
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

function loadFunction(els, state) {
  const source = moduleSource();
  const context = { window: {} };
  Function('window', source)(context.window);
  return context.window.FlightFlowKnowledgePopoverController
    .create({ els, state })
    .hideKnowledgePopover;
}

test('hideKnowledgePopover congela exatamente a fronteira selecionada no remap #203', () => {
  const source = extractNamedFunction(moduleSource(), FUNCTION_NAME);
  assert.equal(source, EXPECTED_SOURCE);
  assert.equal(Buffer.byteLength(source, 'utf8'), EXPECTED_BYTES);
  assert.equal(crypto.createHash('sha256').update(source, 'utf8').digest('hex'), EXPECTED_SHA256);
});

test('hideKnowledgePopover não contém lógica temporal, espacial, cartográfica ou externa', () => {
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

  assert.equal((source.match(/\bels\.knowledgePopover\b/g) || []).length, 2);
  assert.equal((source.match(/\bstate\.activeKnowledgeAnchor\b/g) || []).length, 1);
});

test('hideKnowledgePopover sai do kernel, preserva wiring e mantém exatamente dois consumidores funcionais', () => {
  const kernel = kernelSource();
  const module = moduleSource();
  assert.equal(kernel.split('function hideKnowledgePopover(').length - 1, 0);
  assert.equal(module.split('function hideKnowledgePopover(').length - 1, 1);
  assert.equal(kernel.split('hideKnowledgePopover').length - 1, EXPECTED_CONSUMERS + 1);

  assert.ok(kernel.includes('const KnowledgePopoverController = window.FlightFlowKnowledgePopoverController;'));
  assert.ok(kernel.includes("if (!KnowledgePopoverController) throw new Error('FlightFlowKnowledgePopoverController não foi carregado.');"));
  assert.ok(kernel.includes('const { hideKnowledgePopover } = KnowledgePopoverController.create({ els, state });'));
  assert.ok(kernel.includes('hideKnowledgePopover();\n    });'));

  const openActiveKnowledgeDetail = extractNamedFunction(kernel, 'openActiveKnowledgeDetail');
  assert.equal((openActiveKnowledgeDetail.match(/\bhideKnowledgePopover\s*\(/g) || []).length, 1);
  assert.ok(openActiveKnowledgeDetail.includes('hideKnowledgePopover();'));
});

test('hideKnowledgePopover não altera estado quando o popover não existe', () => {
  const els = {};
  const state = { activeKnowledgeAnchor: 'anchor', untouched: 7 };
  const fn = loadFunction(els, state);

  const result = fn();

  assert.equal(result, undefined);
  assert.equal(state.activeKnowledgeAnchor, 'anchor');
  assert.equal(state.untouched, 7);
});

test('hideKnowledgePopover oculta o popover antes de limpar o anchor ativo', () => {
  const state = { activeKnowledgeAnchor: 'anchor', untouched: 7 };
  const seen = [];
  let hidden = false;
  const popover = {};
  Object.defineProperty(popover, 'hidden', {
    get() { return hidden; },
    set(value) {
      seen.push({ value, anchorAtHiddenWrite: state.activeKnowledgeAnchor });
      hidden = value;
    },
    configurable: true,
  });
  const fn = loadFunction({ knowledgePopover: popover }, state);

  fn();

  assert.equal(hidden, true);
  assert.equal(state.activeKnowledgeAnchor, null);
  assert.equal(state.untouched, 7);
  assert.deepEqual(seen, [{ value: true, anchorAtHiddenWrite: 'anchor' }]);
});

test('hideKnowledgePopover preserva o anchor se a escrita hidden falhar', () => {
  const state = { activeKnowledgeAnchor: 'anchor' };
  const sentinel = new Error('hidden setter sentinel');
  const popover = {};
  Object.defineProperty(popover, 'hidden', {
    set() { throw sentinel; },
    configurable: true,
  });
  const fn = loadFunction({ knowledgePopover: popover }, state);

  assert.throws(() => fn(), error => error === sentinel);
  assert.equal(state.activeKnowledgeAnchor, 'anchor');
});

test('hideKnowledgePopover propaga erro ao limpar o anchor depois de ocultar o popover', () => {
  let hidden = false;
  const popover = {};
  Object.defineProperty(popover, 'hidden', {
    set(value) { hidden = value; },
    configurable: true,
  });
  const sentinel = new Error('anchor setter sentinel');
  const state = {};
  Object.defineProperty(state, 'activeKnowledgeAnchor', {
    get() { return 'anchor'; },
    set() { throw sentinel; },
    configurable: true,
  });
  const fn = loadFunction({ knowledgePopover: popover }, state);

  assert.throws(() => fn(), error => error === sentinel);
  assert.equal(hidden, true);
});
