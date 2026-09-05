const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = path.resolve(__dirname, '..');
const HTML = path.join(ROOT, 'index.html');
const ANCHOR = 'window.__FlightFlowFirBridge = Object.freeze({';
const EXPECTED = Object.freeze({
  normalizeFontScale: { bytes: 202, sha256: 'df4f249980aa79d5a7a18a5c0b09f91e0631e0cfa4b65e5cd2eb8b5cd5bb1270' },
  fontLayoutForScale: { bytes: 180, sha256: 'fe8c0cd74d66820b21e5fbc1011387c37834e7e2ff23223a7d084b14aad458ee' },
  fontLayoutDescription: { bytes: 380, sha256: 'eda3e96fe81fd999948835b0a4eb87087c055fabd9b7369b7692dd1ac92a634a' },
});

const FORBIDDEN_COUPLING = [
  'state', 'els.', 'document.', 'window.', 'localStorage', 'sessionStorage',
  'indexedDB', 'fetch(', 'realMapState', 'google.', 'L.', 'Parser',
  'setTimeout', 'requestAnimationFrame'
];

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

function extractFunction(source, name) {
  const pattern = new RegExp('(^|\\n)([ \\t]*)function\\s+' + name + '\\s*\\([^)]*\\)\\s*\\{', 'g');
  const matches = [...source.matchAll(pattern)];
  assert.equal(matches.length, 1, `${name} deve existir exatamente uma vez no núcleo antes da extração`);
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

test('três utilitários puros de tipografia mantêm identidade byte a byte', () => {
  const kernel = kernelSource();
  for (const [name, expected] of Object.entries(EXPECTED)) {
    const source = extractFunction(kernel, name);
    assert.equal(Buffer.byteLength(source, 'utf8'), expected.bytes, `${name}: tamanho mudou`);
    assert.equal(crypto.createHash('sha256').update(source).digest('hex'), expected.sha256, `${name}: SHA mudou`);
  }
});

test('cluster permanece desacoplado de estado, DOM, rede, storage e mapa', () => {
  const kernel = kernelSource();
  for (const name of Object.keys(EXPECTED)) {
    const source = extractFunction(kernel, name);
    for (const token of FORBIDDEN_COUPLING) assert.ok(!source.includes(token), `${name} passou a depender de ${token}`);
  }
});

test('repairTypographyLayout permanece fora deste contrato puro', () => {
  assert.equal(Object.hasOwn(EXPECTED, 'repairTypographyLayout'), false);
  assert.match(kernelSource(), /function\s+repairTypographyLayout\s*\(/);
});

test('normalizeFontScale preserva limites e arredondamento atuais', () => {
  const fn = compile(extractFunction(kernelSource(), 'normalizeFontScale'), 'normalizeFontScale');
  const cases = [
    [undefined, 1], [null, 0.9], [-1, 0.9], [0, 0.9], [0.75, 0.9], [0.9, 0.9],
    [1, 1], [1.1, 1.1], [1.25, 1.25], [1.3, 1.3], [1.5, 1.5], [1.6, 1.6],
    [2, 1.6], [5, 1.6], ['1.2', 1.2]
  ];
  for (const [input, expected] of cases) assert.equal(fn(input), expected, `entrada ${String(input)}`);
});

test('fontLayoutForScale preserva limiares atuais', () => {
  const fn = compile(extractFunction(kernelSource(), 'fontLayoutForScale'), 'fontLayoutForScale');
  for (const [input, expected] of [
    [0.9, 'normal'], [1, 'normal'], [1.09, 'normal'],
    [1.1, 'large'], [1.29, 'large'],
    [1.3, 'stacked'], [1.49, 'stacked'],
    [1.5, 'xlarge'], [1.6, 'xlarge']
  ]) assert.equal(fn(input), expected);
});

test('fontLayoutDescription preserva textos atuais', () => {
  const fn = compile(extractFunction(kernelSource(), 'fontLayoutDescription'), 'fontLayoutDescription');
  assert.equal(fn('normal'), 'Painéis lado a lado.');
  assert.equal(fn('large'), 'Colunas e espaçamentos ajustados para preservar a área útil.');
  assert.equal(fn('stacked'), 'Área de voo e painel de dados organizados verticalmente.');
  assert.equal(fn('xlarge'), 'Painéis empilhados e campos organizados em coluna única.');
  assert.equal(fn('other'), 'Painéis lado a lado.');
  assert.equal(fn(''), 'Painéis lado a lado.');
});
