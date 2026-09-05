const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = path.resolve(__dirname, '..');
const HTML = path.join(ROOT, 'index.html');
const MODULE = path.join(ROOT, 'src', 'ui', 'operational-state-utils.js');
const ANCHOR = 'window.__FlightFlowFirBridge = Object.freeze({';
const REFERENCE = '<script id="flightflow-operational-state-utils" src="src/ui/operational-state-utils.js"></script>';
const MODULE_BYTES = 1554;
const MODULE_SHA256 = 'd6620a7d53a24376969e2ae33b20a84f71a02eaaa7f852d98b43416e1af9f778';

const EXPECTED = Object.freeze({
  themeSwatch: { bytes: 330, sha256: 'f6a08de7486f9f317f9ae48739bf130d2d3f7f07b45ab5c4f76afa609994ba52' },
  stripTheme: { bytes: 653, sha256: '2dd09d6f90d269c0441ca63a5022d66a12de606235acbe8d5554ef2bf8c6f2f4' },
  statusClass: { bytes: 413, sha256: '459acb249e4af18bb6973d305fbd6e43c9c558ec89452b975de71ee4d122f12e' },
});

const FORBIDDEN_COUPLING = [
  'state.', 'els.', 'document.', 'localStorage', 'sessionStorage',
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

test('módulo operational-state mantém identidade estrutural completa', () => {
  const source = moduleSource();
  assert.equal(Buffer.byteLength(source, 'utf8'), MODULE_BYTES);
  assert.equal(crypto.createHash('sha256').update(source).digest('hex'), MODULE_SHA256);
  assert.ok(source.startsWith("(function () {\n  'use strict';"));
  assert.ok(source.includes('window.FlightFlowOperationalStateUtils = Object.freeze({'));
  assert.ok(source.endsWith('})();\n'));
});

test('três utilitários preservam identidade byte a byte após a extração', () => {
  const source = moduleSource();
  for (const [name, expected] of Object.entries(EXPECTED)) {
    const body = extractFunction(source, name);
    assert.equal(Buffer.byteLength(body, 'utf8'), expected.bytes, `${name}: tamanho mudou`);
    assert.equal(crypto.createHash('sha256').update(body).digest('hex'), expected.sha256, `${name}: SHA mudou`);
  }
});

test('módulo carrega antes do IIFE e o núcleo usa aliases explícitos sem redeclarar o cluster', () => {
  const html = fs.readFileSync(HTML, 'utf8');
  assert.equal(html.split(REFERENCE).length - 1, 1, 'referência operational-state deve ser única');
  const referenceIndex = html.indexOf(REFERENCE);
  const anchorIndex = html.indexOf(ANCHOR);
  const mainScriptStart = html.lastIndexOf('<script', anchorIndex);
  assert.ok(referenceIndex >= 0 && referenceIndex < mainScriptStart, 'operational-state deve carregar antes do núcleo principal');

  const kernel = kernelSource();
  assert.ok(kernel.includes('const OperationalStateUtils = window.FlightFlowOperationalStateUtils;'));
  assert.ok(kernel.includes("if (!OperationalStateUtils) throw new Error('FlightFlowOperationalStateUtils não foi carregado.');"));
  assert.ok(kernel.includes('const { themeSwatch, stripTheme, statusClass } = OperationalStateUtils;'));
  for (const name of Object.keys(EXPECTED)) {
    assert.equal(new RegExp(`function\\s+${name}\\s*\\(`).test(kernel), false, `${name} não deve continuar declarado inline`);
  }
});

test('cluster permanece puro e desacoplado de estado global, DOM, rede, storage, mapa e parser', () => {
  const source = moduleSource();
  for (const name of Object.keys(EXPECTED)) {
    const body = extractFunction(source, name);
    for (const token of FORBIDDEN_COUPLING) assert.ok(!body.includes(token), `${name} passou a depender de ${token}`);
  }
});

test('themeSwatch preserva paleta operacional atual e fallback', () => {
  const fn = compile(extractFunction(moduleSource(), 'themeSwatch'), 'themeSwatch');
  assert.deepEqual({
    preLight: fn('theme-pre-light'), preDark: fn('theme-pre-dark'),
    noncontrolled: fn('theme-noncontrolled'), controlled: fn('theme-controlled'),
    proposal: fn('theme-proposal'), donor: fn('theme-donor'), receiver: fn('theme-receiver'),
    finished: fn('theme-finished'), nonrvsm: fn('theme-nonrvsm'), alert: fn('theme-alert'),
    fallback: fn('unknown-theme'),
  }, {
    preLight: '#68ff72', preDark: '#00b832', noncontrolled: '#d6d6d6', controlled: '#111111',
    proposal: '#fff000', donor: '#ff9c2e', receiver: '#3f4cff', finished: '#d0d0d0',
    nonrvsm: '#954a2c', alert: '#c4151d', fallback: '#d6d6d6'
  });
});

test('stripTheme preserva exatamente a prioridade e classificação operacional atuais', () => {
  const fn = compile(extractFunction(moduleSource(), 'stripTheme'), 'stripTheme');
  const cases = [
    [{ snapshot: { status: 'ATIVO' }, operation: 'EMERG' }, 'theme-alert'],
    [{ snapshot: { status: 'ATIVO', rvsm: 'X' } }, 'theme-nonrvsm'],
    [{ snapshot: { status: 'PROPOSTA' } }, 'theme-proposal'],
    [{ snapshot: { groundState: 'DOADOR' } }, 'theme-donor'],
    [{ snapshot: { groundState: 'RECEPTOR' } }, 'theme-receiver'],
    [{ snapshot: { status: 'TERMINADO' } }, 'theme-finished'],
    [{ snapshot: { status: 'PRÉ-ATIVO', authorizationState: 'AUTORIZADO' } }, 'theme-pre-dark'],
    [{ snapshot: { status: 'PRÉ-ATIVO', authorizationState: '' } }, 'theme-pre-light'],
    [{ snapshot: { status: 'ATIVO' } }, 'theme-controlled'],
    // Equivalência deliberada: a extração não corrige a regra atual em que INATIVO contém ATIVO.
    [{ snapshot: { status: 'INATIVO' } }, 'theme-controlled'],
    [null, 'theme-noncontrolled'],
  ];
  for (const [event, expected] of cases) assert.equal(fn(event), expected, JSON.stringify(event));
});

test('statusClass preserva classificação e precedência atuais', () => {
  const fn = compile(extractFunction(moduleSource(), 'statusClass'), 'statusClass');
  assert.equal(fn('PRÉ-ATIVO'), 'status-preactive');
  assert.equal(fn('INATIVO'), 'status-inactive');
  assert.equal(fn('ATIVO'), 'status-active');
  assert.equal(fn('TERMINADO'), 'status-terminated');
  assert.equal(fn('ARQUIVADO'), 'status-archived');
  assert.equal(fn(''), 'status-empty');
  assert.equal(fn(null), 'status-empty');
});
