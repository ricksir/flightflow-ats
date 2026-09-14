const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = path.resolve(__dirname, '..');
const HTML = path.join(ROOT, 'index.html');
const MODULE = path.join(ROOT, 'src', 'core', 'core-utils.js');
const ANCHOR = 'window.__FlightFlowFirBridge = Object.freeze({';

const EXPECTED = Object.freeze({
  getPath: {
    bytes: 138,
    sha256: '247f4a3dd072d9a76e62f80d3b247d7891c65d0b4a3c2082bb4f932dd67963ea',
  },
  setPath: {
    bytes: 345,
    sha256: 'b8e0c78106388a4ced70f669fff1012e9583f6fc1ecfff51e5b2da3a90db1c91',
  },
});

const FORBIDDEN_COUPLING = [
  'state.', 'els.', 'document.', 'window.', 'localStorage', 'sessionStorage',
  'indexedDB', 'fetch(', 'realMapState', 'google.', 'L.', 'Parser',
  'setTimeout', 'setInterval', 'requestAnimationFrame', 'navigator.',
  'CustomEvent', 'dispatchEvent', 'addEventListener', 'querySelector', 'getElementById'
];

function moduleSource() {
  return fs.readFileSync(MODULE, 'utf8');
}

function kernelSource() {
  const html = fs.readFileSync(HTML, 'utf8');
  const anchorIndex = html.indexOf(ANCHOR);
  assert.ok(anchorIndex >= 0, 'núcleo principal deve manter a ponte FIR usada como âncora');
  const scriptStart = html.lastIndexOf('<script', anchorIndex);
  const bodyStart = html.indexOf('>', scriptStart) + 1;
  const bodyEnd = html.indexOf('</script>', anchorIndex);
  assert.ok(scriptStart >= 0 && bodyStart > scriptStart && bodyEnd > bodyStart);
  return html.slice(bodyStart, bodyEnd);
}

function scanBalanced(source, openIndex, openChar, closeChar) {
  let depth = 0;
  let mode = 'code';
  let quote = '';
  let escape = false;
  for (let i = openIndex; i < source.length; i += 1) {
    const c = source[i];
    const next = source[i + 1] || '';
    if (mode === 'line-comment') { if (c === '\n') mode = 'code'; continue; }
    if (mode === 'block-comment') { if (c === '*' && next === '/') { mode = 'code'; i += 1; } continue; }
    if (mode === 'string') { if (escape) escape = false; else if (c === '\\') escape = true; else if (c === quote) mode = 'code'; continue; }
    if (mode === 'template') { if (escape) escape = false; else if (c === '\\') escape = true; else if (c === '`') mode = 'code'; continue; }
    if (c === '/' && next === '/') { mode = 'line-comment'; i += 1; continue; }
    if (c === '/' && next === '*') { mode = 'block-comment'; i += 1; continue; }
    if (c === '"' || c === "'") { mode = 'string'; quote = c; continue; }
    if (c === '`') { mode = 'template'; continue; }
    if (c === openChar) depth += 1;
    else if (c === closeChar) { depth -= 1; if (depth === 0) return i; }
  }
  return -1;
}

function extractFunction(source, name) {
  const pattern = new RegExp('(^|\\n)([ \\t]*)function\\s+' + name + '\\s*\\(', 'g');
  const matches = [...source.matchAll(pattern)];
  assert.equal(matches.length, 1, `${name} deve existir exatamente uma vez no módulo`);
  const match = matches[0];
  const offset = match.index + (match[1] === '\n' ? 1 : 0);
  const paren = source.indexOf('(', offset);
  const parenEnd = scanBalanced(source, paren, '(', ')');
  assert.ok(parenEnd > paren, `${name}: parâmetros não terminados`);
  let brace = parenEnd + 1;
  while (/\s/.test(source[brace] || '')) brace += 1;
  assert.equal(source[brace], '{', `${name}: abertura não encontrada`);
  const end = scanBalanced(source, brace, '{', '}');
  assert.ok(end > brace, `${name}: declaração não terminada`);
  return source.slice(offset, end + 1);
}

function compile(source, name) {
  return Function(`${source}; return ${name};`)();
}

test('getPath e setPath preservam identidade byte a byte dentro de CoreUtils', () => {
  const source = moduleSource();
  for (const [name, expected] of Object.entries(EXPECTED)) {
    const body = extractFunction(source, name);
    assert.equal(Buffer.byteLength(body, 'utf8'), expected.bytes, `${name}: tamanho mudou`);
    assert.equal(crypto.createHash('sha256').update(body).digest('hex'), expected.sha256, `${name}: SHA mudou`);
  }
});

test('núcleo consome o par por alias de FlightFlowCoreUtils e não o redeclara', () => {
  const kernel = kernelSource();
  assert.ok(kernel.includes('const { shortMessageType, displayValue, cleanDisplay, humanize, clone, formatBytes, angleDifference, hashString, seeded, getPath, setPath, normalizeSearchText } = CoreUtils;'));
  for (const name of Object.keys(EXPECTED)) {
    assert.equal(new RegExp(`function\\s+${name}\\s*\\(`).test(kernel), false, `${name} não deve continuar inline`);
  }
});

test('cluster de acesso por caminho permanece puro e desacoplado de infraestrutura', () => {
  const source = moduleSource();
  for (const name of Object.keys(EXPECTED)) {
    const body = extractFunction(source, name);
    for (const token of FORBIDDEN_COUPLING) assert.ok(!body.includes(token), `${name} passou a depender de ${token}`);
  }
});

test('getPath preserva leitura aninhada e semântica atual de caminhos ausentes', () => {
  const fn = compile(extractFunction(moduleSource(), 'getPath'), 'getPath');
  const data = { flight: { route: { first: 'PADIL' }, nullNode: null }, zero: 0, empty: '' };
  assert.equal(fn(data, 'flight.route.first'), 'PADIL');
  assert.equal(fn(data, 'zero'), 0);
  assert.equal(fn(data, 'empty'), '');
  assert.equal(fn(data, 'flight.route.missing'), undefined);
  assert.equal(fn(data, 'flight.missing.child'), '');
  assert.equal(fn(data, 'flight.nullNode.child'), '');
});

test('setPath preserva criação de objetos intermediários', () => {
  const fn = compile(extractFunction(moduleSource(), 'setPath'), 'setPath');
  const data = {};
  assert.equal(fn(data, 'flight.route.first', 'PADIL'), undefined);
  assert.deepEqual(data, { flight: { route: { first: 'PADIL' } } });
  fn(data, 'flight.route.last', 'MASVA');
  assert.deepEqual(data, { flight: { route: { first: 'PADIL', last: 'MASVA' } } });
});

test('setPath preserva criação automática de arrays para segmentos numéricos', () => {
  const fn = compile(extractFunction(moduleSource(), 'setPath'), 'setPath');
  const data = {};
  fn(data, 'points.0.ident', 'PADIL');
  fn(data, 'points.1.ident', 'MASVA');
  assert.ok(Array.isArray(data.points));
  assert.deepEqual(data, { points: [{ ident: 'PADIL' }, { ident: 'MASVA' }] });
});

test('setPath preserva valores intermediários existentes em vez de recriá-los', () => {
  const fn = compile(extractFunction(moduleSource(), 'setPath'), 'setPath');
  const existing = { config: { ui: { scale: 1 } } };
  const originalUi = existing.config.ui;
  fn(existing, 'config.ui.scale', 1.25);
  assert.equal(existing.config.ui, originalUi);
  assert.equal(existing.config.ui.scale, 1.25);
});
