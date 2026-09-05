const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = path.resolve(__dirname, '..');
const HTML = path.join(ROOT, 'index.html');
const MODULE = path.join(ROOT, 'src', 'ui', 'typography-utils.js');
const ANCHOR = 'window.__FlightFlowFirBridge = Object.freeze({';
const MODULE_BYTES = 940;
const MODULE_SHA256 = '15bed357076afacc2732b70d5d2f6f0f425e7d6be7d59788c811d009d94fac23';
const EXPECTED = Object.freeze({
  normalizeFontScale: { bytes: 202, sha256: 'df4f249980aa79d5a7a18a5c0b09f91e0631e0cfa4b65e5cd2eb8b5cd5bb1270' },
  fontLayoutForScale: { bytes: 180, sha256: 'fe8c0cd74d66820b21e5fbc1011387c37834e7e2ff23223a7d084b14aad458ee' },
  fontLayoutDescription: { bytes: 380, sha256: 'eda3e96fe81fd999948835b0a4eb87087c055fabd9b7369b7692dd1ac92a634a' },
});

const FORBIDDEN_COUPLING = [
  'state', 'els.', 'document.', 'localStorage', 'sessionStorage',
  'indexedDB', 'fetch(', 'realMapState', 'google.', 'L.', 'Parser',
  'setTimeout', 'requestAnimationFrame'
];

function readHtml() {
  return fs.readFileSync(HTML, 'utf8');
}

function kernelSource() {
  const html = readHtml();
  const anchorIndex = html.indexOf(ANCHOR);
  assert.ok(anchorIndex >= 0, 'núcleo principal deve manter a ponte FIR usada como âncora');
  const scriptStart = html.lastIndexOf('<script', anchorIndex);
  const bodyStart = html.indexOf('>', scriptStart) + 1;
  const bodyEnd = html.indexOf('</script>', anchorIndex);
  assert.ok(scriptStart >= 0 && bodyStart > scriptStart && bodyEnd > bodyStart);
  return html.slice(bodyStart, bodyEnd);
}

function moduleSource() {
  return fs.readFileSync(MODULE, 'utf8');
}

function extractFunction(source, name) {
  const pattern = new RegExp('(^|\\n)([ \\t]*)function\\s+' + name + '\\s*\\([^)]*\\)\\s*\\{', 'g');
  const matches = [...source.matchAll(pattern)];
  assert.equal(matches.length, 1, `${name} deve existir exatamente uma vez no módulo`);
  const match = matches[0];
  const offset = match.index + (match[1] === '\n' ? 1 : 0);
  const brace = source.indexOf('{', offset);
  assert.ok(brace >= 0, `${name}: abertura não encontrada`);

  let depth = 0;
  let state = 'code';
  let quote = '';
  let escape = false;
  for (let i = brace; i < source.length; i += 1) {
    const c = source[i];
    const next = source[i + 1] || '';
    if (state === 'line-comment') { if (c === '\n') state = 'code'; continue; }
    if (state === 'block-comment') { if (c === '*' && next === '/') { state = 'code'; i += 1; } continue; }
    if (state === 'string') { if (escape) escape = false; else if (c === '\\') escape = true; else if (c === quote) state = 'code'; continue; }
    if (state === 'template') { if (escape) escape = false; else if (c === '\\') escape = true; else if (c === '`') state = 'code'; continue; }
    if (c === '/' && next === '/') { state = 'line-comment'; i += 1; continue; }
    if (c === '/' && next === '*') { state = 'block-comment'; i += 1; continue; }
    if (c === '"' || c === "'") { state = 'string'; quote = c; continue; }
    if (c === '`') { state = 'template'; continue; }
    if (c === '{') depth += 1;
    if (c === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(offset, i + 1);
    }
  }
  assert.fail(`${name}: declaração não terminada`);
}

function compile(source, name) {
  return Function(`${source}; return ${name};`)();
}

test('módulo de tipografia mantém identidade estrutural congelada', () => {
  const source = moduleSource();
  assert.equal(Buffer.byteLength(source, 'utf8'), MODULE_BYTES);
  assert.equal(crypto.createHash('sha256').update(source).digest('hex'), MODULE_SHA256);
  assert.match(source, /^\(function \(\) \{\n\s*'use strict';/);
  assert.match(source, /window\.FlightFlowTypographyUtils\s*=\s*Object\.freeze\(\{/);
  assert.match(source, /\}\)\(\);\n$/);
});

test('três utilitários preservam identidade byte a byte após a extração', () => {
  const source = moduleSource();
  for (const [name, expected] of Object.entries(EXPECTED)) {
    const body = extractFunction(source, name);
    assert.equal(Buffer.byteLength(body, 'utf8'), expected.bytes, `${name}: tamanho mudou`);
    assert.equal(crypto.createHash('sha256').update(body).digest('hex'), expected.sha256, `${name}: SHA mudou`);
  }
});

test('cluster permanece desacoplado de estado, DOM, rede, storage e mapa', () => {
  const source = moduleSource();
  for (const name of Object.keys(EXPECTED)) {
    const body = extractFunction(source, name);
    for (const token of FORBIDDEN_COUPLING) assert.ok(!body.includes(token), `${name} passou a depender de ${token}`);
  }
});

test('index carrega tipografia depois de CoreUtils e antes do IIFE principal', () => {
  const html = readHtml();
  const coreRef = '<script id="flightflow-core-utils" src="src/core/core-utils.js"></script>';
  const typographyRef = '<script id="flightflow-typography-utils" src="src/ui/typography-utils.js"></script>';
  const coreIndex = html.indexOf(coreRef);
  const typographyIndex = html.indexOf(typographyRef);
  const kernelIndex = html.indexOf('(function () {', typographyIndex + typographyRef.length);
  assert.ok(coreIndex >= 0, 'CoreUtils deve estar referenciado');
  assert.ok(typographyIndex > coreIndex, 'TypographyUtils deve carregar depois de CoreUtils');
  assert.ok(kernelIndex > typographyIndex, 'TypographyUtils deve carregar antes do IIFE principal');
});

test('núcleo usa aliases externos e não redeclara as três funções', () => {
  const kernel = kernelSource();
  assert.ok(kernel.includes('const TypographyUtils = window.FlightFlowTypographyUtils;'));
  assert.ok(kernel.includes("if (!TypographyUtils) throw new Error('FlightFlowTypographyUtils não foi carregado.');"));
  assert.ok(kernel.includes('const { normalizeFontScale, fontLayoutForScale, fontLayoutDescription } = TypographyUtils;'));
  for (const name of Object.keys(EXPECTED)) {
    assert.doesNotMatch(kernel, new RegExp(`function\\s+${name}\\s*\\(`), `${name} não deve retornar ao IIFE`);
  }
});

test('repairTypographyLayout permanece no IIFE e fora do módulo puro', () => {
  assert.doesNotMatch(moduleSource(), /function\s+repairTypographyLayout\s*\(/);
  assert.match(kernelSource(), /function\s+repairTypographyLayout\s*\(/);
});

test('normalizeFontScale preserva limites e arredondamento atuais', () => {
  const fn = compile(extractFunction(moduleSource(), 'normalizeFontScale'), 'normalizeFontScale');
  const cases = [
    [undefined, 1], [null, 0.9], [-1, 0.9], [0, 0.9], [0.75, 0.9], [0.9, 0.9],
    [1, 1], [1.1, 1.1], [1.25, 1.25], [1.3, 1.3], [1.5, 1.5], [1.6, 1.6],
    [2, 1.6], [5, 1.6], ['1.2', 1.2]
  ];
  for (const [input, expected] of cases) assert.equal(fn(input), expected, `entrada ${String(input)}`);
});

test('fontLayoutForScale preserva limiares atuais', () => {
  const fn = compile(extractFunction(moduleSource(), 'fontLayoutForScale'), 'fontLayoutForScale');
  for (const [input, expected] of [
    [0.9, 'normal'], [1, 'normal'], [1.09, 'normal'],
    [1.1, 'large'], [1.29, 'large'],
    [1.3, 'stacked'], [1.49, 'stacked'],
    [1.5, 'xlarge'], [1.6, 'xlarge']
  ]) assert.equal(fn(input), expected);
});

test('fontLayoutDescription preserva textos atuais', () => {
  const fn = compile(extractFunction(moduleSource(), 'fontLayoutDescription'), 'fontLayoutDescription');
  assert.equal(fn('normal'), 'Painéis lado a lado.');
  assert.equal(fn('large'), 'Colunas e espaçamentos ajustados para preservar a área útil.');
  assert.equal(fn('stacked'), 'Área de voo e painel de dados organizados verticalmente.');
  assert.equal(fn('xlarge'), 'Painéis empilhados e campos organizados em coluna única.');
  assert.equal(fn('other'), 'Painéis lado a lado.');
  assert.equal(fn(''), 'Painéis lado a lado.');
});