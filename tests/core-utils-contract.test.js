const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = path.resolve(__dirname, '..');
const HTML = path.join(ROOT, 'index.html');
const ANCHOR = 'window.__FlightFlowFirBridge = Object.freeze({';
const EXPECTED = Object.freeze({
  shortMessageType: { bytes: 124, sha256: 'c61517a0039c41c02772b7d261d23925ad705fd5ef36dbbd6c47ef01d15b68c3' },
  displayValue: { bytes: 379, sha256: '79d5ccbcaec3caead3749f1defa25434e8d05b6f00cca3ac81fd6da66bbe341b' },
  cleanDisplay: { bytes: 90, sha256: '59f5bf0626873301d135dabc421a5f7e8deaecc2569ab52ca391c889d58f881f' },
  humanize: { bytes: 127, sha256: 'ae83fb699c075c0433d680e992e58456076aa71e650eced83825138f35d10010' },
  clone: { bytes: 69, sha256: 'db7ba8554335e139efc09ba8d33ec21644dd3beaa67883dac4faeef570f3873a' },
  formatBytes: { bytes: 292, sha256: 'e10a2b791e297d5c037cceb25ce9bdd960dd14f72965737fb5e505ef93db2e76' },
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
    if (state === 'line-comment') {
      if (c === '\n') state = 'code';
      continue;
    }
    if (state === 'block-comment') {
      if (c === '*' && next === '/') { state = 'code'; i += 1; }
      continue;
    }
    if (state === 'string') {
      if (escape) escape = false;
      else if (c === '\\') escape = true;
      else if (c === quote) state = 'code';
      continue;
    }
    if (state === 'template') {
      if (escape) escape = false;
      else if (c === '\\') escape = true;
      else if (c === '`') state = 'code';
      continue;
    }
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

test('seis utilitários puros mantêm identidade byte a byte antes da extração', () => {
  const kernel = kernelSource();
  for (const [name, expected] of Object.entries(EXPECTED)) {
    const source = extractFunction(kernel, name);
    assert.equal(Buffer.byteLength(source, 'utf8'), expected.bytes, `${name}: tamanho mudou`);
    assert.equal(crypto.createHash('sha256').update(source).digest('hex'), expected.sha256, `${name}: SHA mudou`);
  }
});

test('cluster escolhido permanece desacoplado de estado, DOM, rede, storage e mapa', () => {
  const kernel = kernelSource();
  for (const name of Object.keys(EXPECTED)) {
    const source = extractFunction(kernel, name);
    for (const token of FORBIDDEN_COUPLING) {
      assert.ok(!source.includes(token), `${name} passou a depender de ${token}`);
    }
  }
});

test('shortMessageType preserva normalização atual', () => {
  const fn = compile(extractFunction(kernelSource(), 'shortMessageType'), 'shortMessageType');
  assert.equal(fn(), 'ATS');
  assert.equal(fn('DEP'), 'DEP');
  assert.equal(fn('  cpl-abc/12 !!'), 'cplabc/1');
});

test('displayValue preserva representação de vazios, listas e objetos', () => {
  const fn = compile(extractFunction(kernelSource(), 'displayValue'), 'displayValue');
  assert.equal(fn(null), '—');
  assert.equal(fn(''), '—');
  assert.equal(fn('ABC'), 'ABC');
  assert.equal(fn([1, 2]), '1 | 2');
  assert.equal(fn([{ a: 'X', b: 'Y' }]), 'X · Y');
  assert.equal(fn({ a: 1 }), '{"a":1}');
});

test('cleanDisplay e humanize preservam formatação textual atual', () => {
  const kernel = kernelSource();
  const cleanDisplay = compile(extractFunction(kernel, 'cleanDisplay'), 'cleanDisplay');
  const humanize = compile(extractFunction(kernel, 'humanize'), 'humanize');
  assert.equal(cleanDisplay(null), '');
  assert.equal(cleanDisplay('  A   B  '), 'A B');
  assert.equal(cleanDisplay('A\nB\tC'), 'A B C');
  assert.equal(humanize('flight_level'), 'FLIGHT LEVEL');
  assert.equal(humanize('messageType'), 'MESSAGE TYPE');
  assert.equal(humanize('A-B_C'), 'A-B C');
});

test('clone continua produzindo cópia profunda JSON independente', () => {
  const clone = compile(extractFunction(kernelSource(), 'clone'), 'clone');
  const original = { a: 1, nested: { b: 2 } };
  const copied = clone(original);
  copied.nested.b = 99;
  assert.deepEqual(original, { a: 1, nested: { b: 2 } });
  assert.deepEqual(copied, { a: 1, nested: { b: 99 } });
});

test('formatBytes preserva unidades e arredondamento atuais', () => {
  const fn = compile(extractFunction(kernelSource(), 'formatBytes'), 'formatBytes');
  assert.equal(fn(0), '0 B');
  assert.equal(fn(Number.NaN), '0 B');
  assert.equal(fn(1024), '1.0 KB');
  assert.equal(fn(1536), '1.5 KB');
  assert.equal(fn(1048576), '1.0 MB');
});
