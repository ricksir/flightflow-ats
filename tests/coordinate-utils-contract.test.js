const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = path.resolve(__dirname, '..');
const HTML = path.join(ROOT, 'index.html');
const MODULE = path.join(ROOT, 'src', 'geo', 'coordinate-utils.js');
const ANCHOR = 'window.__FlightFlowFirBridge = Object.freeze({';
const REFERENCE = '<script id="flightflow-coordinate-utils" src="src/geo/coordinate-utils.js"></script>';
const MODULE_BYTES = 1561;
const MODULE_SHA256 = '06e572d6f76851bb8ff8a25e17e97add6f89a429581fe5b6b0c8b75fec75396d';

const EXPECTED = Object.freeze({
  normalizeCoordinateInput: {
    bytes: 196,
    sha256: '25eeb5945c7e4d2b8d6e3fcd17bce4fd78d3eb4c51e779c9f80360a26e75f528',
  },
  validAerodromeCoordinate: {
    bytes: 192,
    sha256: '3e113b6ba7a93eb851c5f70ad19a5aff715436c3b1804a36da4335fef87563c5',
  },
  formatGeoCoord: {
    bytes: 135,
    sha256: 'a7219e2ed5d6939754accd2b96248cecbfc826c43bc905718d082c52ee6f963e',
  },
  atsCoordinateLabel: {
    bytes: 141,
    sha256: '541c59f892839907c29cbfeac7ac7256251aca2272180d83c4f3b355ecc532b6',
  },
  groundCentroid: {
    bytes: 279,
    sha256: '6b44bab8c967d72ca473e966bd782704177f9d595589451a4c42eab4dbe15559',
  },
  runwayTokens: {
    bytes: 104,
    sha256: 'ea7c2d4dc62cfc56fa3bda6177625df9caff5213888cf700d5d5ad05d8eb7b2f',
  },
  runwayHeading: {
    bytes: 243,
    sha256: '290ed08d8817232463fe1838fedf8e9d1f0a7efed4f663d5bcea3e8c8e06b715',
  },
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

test('módulo coordinate-utils mantém identidade estrutural completa', () => {
  const source = moduleSource();
  assert.equal(Buffer.byteLength(source, 'utf8'), MODULE_BYTES);
  assert.equal(crypto.createHash('sha256').update(source).digest('hex'), MODULE_SHA256);
  assert.ok(source.startsWith("(function () {\n  'use strict';"));
  assert.ok(source.includes('window.FlightFlowCoordinateUtils = Object.freeze({'));
  assert.ok(source.endsWith('})();\n'));
});

test('sete utilitários geográficos preservam identidade byte a byte após a extração', () => {
  const source = moduleSource();
  for (const [name, expected] of Object.entries(EXPECTED)) {
    const body = extractFunction(source, name);
    assert.equal(Buffer.byteLength(body, 'utf8'), expected.bytes, `${name}: tamanho mudou`);
    assert.equal(crypto.createHash('sha256').update(body).digest('hex'), expected.sha256, `${name}: SHA mudou`);
  }
});

test('módulo carrega antes do IIFE e o núcleo usa aliases explícitos sem redeclarar o cluster', () => {
  const html = fs.readFileSync(HTML, 'utf8');
  assert.equal(html.split(REFERENCE).length - 1, 1, 'referência coordinate-utils deve ser única');
  const referenceIndex = html.indexOf(REFERENCE);
  const anchorIndex = html.indexOf(ANCHOR);
  const mainScriptStart = html.lastIndexOf('<script', anchorIndex);
  assert.ok(referenceIndex >= 0 && referenceIndex < mainScriptStart, 'coordinate-utils deve carregar antes do núcleo principal');

  const kernel = kernelSource();
  assert.ok(kernel.includes('const CoordinateUtils = window.FlightFlowCoordinateUtils;'));
  assert.ok(kernel.includes("if (!CoordinateUtils) throw new Error('FlightFlowCoordinateUtils não foi carregado.');"));
  assert.ok(kernel.includes('const { normalizeCoordinateInput, validAerodromeCoordinate, formatGeoCoord, atsCoordinateLabel, groundCentroid, runwayTokens, runwayHeading } = CoordinateUtils;'));
  for (const name of Object.keys(EXPECTED)) {
    assert.equal(new RegExp(`function\\s+${name}\\s*\\(`).test(kernel), false, `${name} não deve continuar declarado inline`);
  }
});

test('cluster de coordenadas permanece puro e desacoplado de infraestrutura', () => {
  const source = moduleSource();
  for (const name of Object.keys(EXPECTED)) {
    const body = extractFunction(source, name);
    for (const token of FORBIDDEN_COUPLING) {
      assert.ok(!body.includes(token), `${name} passou a depender de ${token}`);
    }
  }
});

test('normalizeCoordinateInput preserva vírgula decimal, espaços e comportamento de vazios', () => {
  const fn = compile(extractFunction(moduleSource(), 'normalizeCoordinateInput'), 'normalizeCoordinateInput');
  assert.equal(fn(' -15,8692 '), -15.8692);
  assert.equal(fn('-47.9208'), -47.9208);
  assert.equal(fn('0'), 0);
  assert.equal(fn(''), 0);
  assert.equal(fn(null), 0);
  assert.ok(Number.isNaN(fn('abc')));
});

test('validAerodromeCoordinate preserva limites geográficos inclusivos atuais', () => {
  const fn = compile(extractFunction(moduleSource(), 'validAerodromeCoordinate'), 'validAerodromeCoordinate');
  assert.equal(fn(-90, -180), true);
  assert.equal(fn(90, 180), true);
  assert.equal(fn('0', '0'), true);
  assert.equal(fn(-90.0001, 0), false);
  assert.equal(fn(90.0001, 0), false);
  assert.equal(fn(0, -180.0001), false);
  assert.equal(fn(0, 180.0001), false);
  assert.equal(fn('abc', 0), false);
});

test('formatGeoCoord preserva quatro casas e hemisférios', () => {
  const fn = compile(extractFunction(moduleSource(), 'formatGeoCoord'), 'formatGeoCoord');
  assert.equal(fn(-15.8692, 'NS'), '15.8692°S');
  assert.equal(fn(-47.9208, 'EW'), '47.9208°W');
  assert.equal(fn(12.5, 'NS'), '12.5000°N');
  assert.equal(fn(45.25, 'EW'), '45.2500°E');
  assert.equal(fn(0, 'NS'), '0.0000°N');
});

test('atsCoordinateLabel preserva composição LAT/LONG atual', () => {
  const source = moduleSource();
  const formatBody = extractFunction(source, 'formatGeoCoord');
  const labelBody = extractFunction(source, 'atsCoordinateLabel');
  const api = Function(`${formatBody}; ${labelBody}; return { formatGeoCoord, atsCoordinateLabel };`)();
  assert.equal(api.atsCoordinateLabel(-15.8692, -47.9208), 'LAT 15.8692°S · LONG 47.9208°W');
  assert.equal(api.atsCoordinateLabel(12.5, 45.25), 'LAT 12.5000°N · LONG 45.2500°E');
});
