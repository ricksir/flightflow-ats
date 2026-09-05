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
  angleDifference: { bytes: 89, sha256: 'c33f42ad25fa9d352f3d38975f1d054fe026b3924bf1ac37780e11b674c5e4b2' },
  hashString: { bytes: 141, sha256: '7da6f0aba25a918f031e10e8abbd2fea0c777054758b7b5b7d0edec024555a94' },
  seeded: { bytes: 107, sha256: 'e8a98352bd15958c19bfa524d389fa7f84ce3ab902bde82439dafee89dacfbc2' },
});

const FORBIDDEN_COUPLING = [
  'state', 'els.', 'document.', 'window.', 'localStorage', 'sessionStorage',
  'indexedDB', 'fetch(', 'realMapState', 'google.', 'L.', 'Parser',
  'setTimeout', 'setInterval', 'requestAnimationFrame'
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

function extractFunction(source, name) {
  const pattern = new RegExp('(^|\\n)([ \\t]*)function\\s+' + name + '\\s*\\([^)]*\\)\\s*\\{', 'g');
  const matches = [...source.matchAll(pattern)];
  assert.equal(matches.length, 1, `${name} deve existir exatamente uma vez no CoreUtils`);
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

test('três utilitários determinísticos preservam identidade byte a byte após a extração', () => {
  const source = moduleSource();
  for (const [name, expected] of Object.entries(EXPECTED)) {
    const body = extractFunction(source, name);
    assert.equal(Buffer.byteLength(body, 'utf8'), expected.bytes, `${name}: tamanho mudou`);
    assert.equal(crypto.createHash('sha256').update(body).digest('hex'), expected.sha256, `${name}: SHA mudou`);
  }
});

test('cluster permanece desacoplado de estado, DOM, rede, storage, mapa e parser', () => {
  const source = moduleSource();
  for (const name of Object.keys(EXPECTED)) {
    const body = extractFunction(source, name);
    for (const token of FORBIDDEN_COUPLING) assert.ok(!body.includes(token), `${name} passou a depender de ${token}`);
  }
});

test('núcleo usa aliases externos e não redeclara o trio', () => {
  const kernel = kernelSource();
  assert.ok(kernel.includes('const { shortMessageType, displayValue, cleanDisplay, humanize, clone, formatBytes, angleDifference, hashString, seeded, getPath, setPath } = CoreUtils;'));
  for (const name of Object.keys(EXPECTED)) {
    assert.doesNotMatch(kernel, new RegExp(`function\\s+${name}\\s*\\(`), `${name} não deve retornar ao IIFE`);
  }
});

test('angleDifference preserva diferença angular mínima atual', () => {
  const fn = compile(extractFunction(moduleSource(), 'angleDifference'), 'angleDifference');
  for (const [a, b, expected] of [
    [10, 20, 10], [350, 10, 20], [10, 350, 20],
    [0, 180, 180], [180, 0, 180], [720, 0, 0]
  ]) assert.equal(fn(a, b), expected, `${a}/${b}`);
});

test('hashString preserva hash determinístico atual', () => {
  const fn = compile(extractFunction(moduleSource(), 'hashString'), 'hashString');
  assert.equal(fn(''), 2166136261);
  assert.equal(fn('A'), 3289118412);
  assert.equal(fn('ABC'), 1552166763);
  assert.equal(fn('GLO1762'), 2262905143);
  assert.equal(fn(12345), 1136836824);
});

test('seeded preserva sequência pseudoaleatória determinística atual', () => {
  const fn = compile(extractFunction(moduleSource(), 'seeded'), 'seeded');
  assert.equal(fn(0, 0), 0.8211895695640123);
  assert.equal(fn(1, 0), 0.6608764301472547);
  assert.equal(fn(1, 1), 0.13576392483810196);
  assert.equal(fn(42, 7), 0.04137097423517844);
  assert.equal(fn(42, 8), 0.6239928084542044);
});

test('clamp e clamp01 permanecem inline por alto alcance de consumidores', () => {
  const kernel = kernelSource();
  assert.match(kernel, /function\s+clamp\s*\(/);
  assert.match(kernel, /function\s+clamp01\s*\(/);
  assert.doesNotMatch(moduleSource(), /function\s+clamp\s*\(/);
  assert.doesNotMatch(moduleSource(), /function\s+clamp01\s*\(/);
});
