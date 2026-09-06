'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const HTML = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

function extractNamedFunction(source, name) {
  const match = new RegExp(`^[ \\t]*function[ \\t]+${name}[ \\t]*\\(`, 'm').exec(source);
  assert.ok(match, `${name} deve continuar inline neste corte`);
  const start = match.index;
  const openParen = source.indexOf('(', match.index);
  const closeParen = source.indexOf(')', openParen + 1);
  assert.ok(openParen >= 0 && closeParen > openParen, `${name} deve manter assinatura válida`);
  const brace = source.indexOf('{', closeParen + 1);
  assert.ok(brace > closeParen, `${name} deve manter corpo delimitado`);

  let depth = 0;
  let quote = null;
  let escaped = false;
  let lineComment = false;
  let blockComment = false;
  for (let i = brace; i < source.length; i += 1) {
    const ch = source[i];
    const next = source[i + 1] || '';
    if (lineComment) {
      if (ch === '\n') lineComment = false;
      continue;
    }
    if (blockComment) {
      if (ch === '*' && next === '/') { blockComment = false; i += 1; }
      continue;
    }
    if (quote) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === quote) quote = null;
      continue;
    }
    if (ch === '/' && next === '/') { lineComment = true; i += 1; continue; }
    if (ch === '/' && next === '*') { blockComment = true; i += 1; continue; }
    if (ch === '\'' || ch === '"' || ch === '`') quote = ch;
    else if (ch === '{') depth += 1;
    else if (ch === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(start, i + 1).trim();
    }
  }
  throw new Error(`${name} não terminou corretamente`);
}

const GO_TO_SOURCE = extractNamedFunction(HTML, 'goTo');

function createHarness(options = {}) {
  const state = {
    parsed: options.parsed === false ? null : { events: [{ index: 0 }, { index: 1 }, { index: 2 }] },
    index: options.index ?? 0,
    motion: options.motion === false ? null : {},
  };
  const plannerCalls = [];
  const renderCalls = [];
  const planMotionTransition = nextIndex => {
    plannerCalls.push({ nextIndex, indexAtPlan: state.index });
  };
  const renderCurrent = renderOptions => {
    renderCalls.push({ options: renderOptions, indexAtRender: state.index });
  };
  const factory = new Function(
    'state', 'planMotionTransition', 'renderCurrent',
    `${GO_TO_SOURCE}; return goTo;`,
  );
  const goTo = factory(state, planMotionTransition, renderCurrent);
  return { goTo, state, plannerCalls, renderCalls };
}

test('goTo delega planejamento ao MotionTransitionPlanner e permanece orquestrador fino', () => {
  for (const token of [
    'if (state.motion) planMotionTransition(nextIndex);',
    'state.index = nextIndex;',
    'renderCurrent(options);',
  ]) assert.ok(GO_TO_SOURCE.includes(token), `contrato ausente em goTo: ${token}`);

  for (const forbidden of [
    'transitionPlanForEvents',
    'transitionDurations',
    'ffrpTransition',
    'FlightFlowRouteProcessedV7412',
    'performance.now()',
    'console.warn',
  ]) assert.equal(GO_TO_SOURCE.includes(forbidden), false, `planejamento ainda inline em goTo: ${forbidden}`);
});

test('goTo sem plano carregado continua no-op', () => {
  const harness = createHarness({ parsed: false });
  harness.goTo(2, { source: 'test' });
  assert.equal(harness.state.index, 0);
  assert.deepEqual(harness.plannerCalls, []);
  assert.deepEqual(harness.renderCalls, []);
});

test('goTo limita o índice antes de delegar e planner observa o índice anterior', () => {
  const harness = createHarness({ index: 0 });
  harness.goTo(99);
  assert.deepEqual(harness.plannerCalls, [{ nextIndex: 2, indexAtPlan: 0 }]);
  assert.equal(harness.state.index, 2);
});

test('goTo compromete state.index antes de renderCurrent e preserva options', () => {
  const harness = createHarness({ index: 1 });
  const options = { source: 'timeline', silent: true };
  harness.goTo(2, options);
  assert.equal(harness.renderCalls.length, 1);
  assert.equal(harness.renderCalls[0].indexAtRender, 2);
  assert.equal(harness.renderCalls[0].options, options);
});

test('goTo sem motion não chama planner, mas continua navegando e renderizando', () => {
  const harness = createHarness({ index: 0, motion: false });
  harness.goTo(1, { source: 'no-motion' });
  assert.deepEqual(harness.plannerCalls, []);
  assert.equal(harness.state.index, 1);
  assert.equal(harness.renderCalls[0].indexAtRender, 1);
});
