'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');

const ROOT = path.resolve(__dirname, '..');
const HTML = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

function extractNamedFunction(source, name) {
  const match = new RegExp(`^\\s*function\\s+${name}\\s*\\(`, 'm').exec(source);
  assert.ok(match, `${name} deve continuar inline enquanto o contrato é congelado`);
  const start = match.index;
  const brace = source.indexOf('{', match.index + match[0].length);
  let depth = 0;
  let quote = null;
  let escaped = false;
  for (let i = brace; i < source.length; i += 1) {
    const ch = source[i];
    if (quote) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === quote) quote = null;
      continue;
    }
    if (ch === '\'' || ch === '"' || ch === '`') quote = ch;
    else if (ch === '{') depth += 1;
    else if (ch === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(start, i + 1).trim();
    }
  }
  throw new Error(`${name} não terminou corretamente`);
}

const SOURCE = extractNamedFunction(HTML, 'maybeFollowAircraft');

function createHarness(overrides = {}) {
  const calls = [];
  const state = {
    parsed: {},
    config: { followAircraft: true },
    geo: {
      dragging: false,
      viewBox: { x: 100, y: 50, width: 800, height: 450 },
    },
    ...overrides.state,
  };
  if (overrides.geo) state.geo = { ...state.geo, ...overrides.geo };
  if (overrides.config) state.config = { ...state.config, ...overrides.config };
  const sandbox = {
    state,
    setMapViewBox: value => calls.push(value),
  };
  vm.createContext(sandbox);
  vm.runInContext(`${SOURCE}; this.maybeFollowAircraft = maybeFollowAircraft;`, sandbox);
  return { state, calls, follow: sandbox.maybeFollowAircraft };
}

test('maybeFollowAircraft mantém a implementação congelada antes da extração', () => {
  assert.equal(Buffer.byteLength(SOURCE), 431);
  assert.equal(
    crypto.createHash('sha256').update(SOURCE).digest('hex'),
    '2d0e631e72c90ffcfb2be50dc19c49847f7ff38400faf39429007dd4d446ccb6',
  );
});

test('follow não move a câmera sem plano, com follow desligado, durante arraste ou em visão ampla', () => {
  const blockers = [
    { state: { parsed: null } },
    { config: { followAircraft: false } },
    { geo: { dragging: true } },
    { geo: { viewBox: { x: 100, y: 50, width: 901, height: 450 } } },
  ];
  for (const overrides of blockers) {
    const harness = createHarness(overrides);
    harness.follow({ x: 0, y: 0 });
    assert.equal(harness.calls.length, 0);
  }
});

test('follow preserva a câmera dentro da zona segura de 22%, inclusive exatamente nas bordas', () => {
  const points = [
    { x: 500, y: 275 },
    { x: 276, y: 275 },
    { x: 724, y: 275 },
    { x: 500, y: 149 },
    { x: 500, y: 401 },
  ];
  for (const point of points) {
    const harness = createHarness();
    harness.follow(point);
    assert.equal(harness.calls.length, 0, `não deve recentralizar em ${JSON.stringify(point)}`);
  }
});

test('follow recentraliza ao ultrapassar qualquer borda e preserva largura/altura atuais', () => {
  const cases = [
    [{ x: 275, y: 275 }, { x: -125, y: 50, width: 800, height: 450 }],
    [{ x: 725, y: 275 }, { x: 325, y: 50, width: 800, height: 450 }],
    [{ x: 500, y: 148 }, { x: 100, y: -77, width: 800, height: 450 }],
    [{ x: 500, y: 402 }, { x: 100, y: 177, width: 800, height: 450 }],
  ];
  for (const [point, expected] of cases) {
    const harness = createHarness();
    harness.follow(point);
    assert.equal(harness.calls.length, 1);
    assert.deepEqual(JSON.parse(JSON.stringify(harness.calls[0])), expected);
  }
});

test('limite de largura 900 ainda permite follow; acima de 900 bloqueia', () => {
  const atLimit = createHarness({ geo: { viewBox: { x: 0, y: 0, width: 900, height: 500 } } });
  atLimit.follow({ x: -1, y: 250 });
  assert.equal(atLimit.calls.length, 1);

  const aboveLimit = createHarness({ geo: { viewBox: { x: 0, y: 0, width: 900.0001, height: 500 } } });
  aboveLimit.follow({ x: -1, y: 250 });
  assert.equal(aboveLimit.calls.length, 0);
});
