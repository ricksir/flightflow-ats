const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = path.resolve(__dirname, '..');
const HTML = path.join(ROOT, 'index.html');
const MODULE = path.join(ROOT, 'src', 'core', 'core-utils.js');
const ANCHOR = 'window.__FlightFlowFirBridge = Object.freeze({';
const REFERENCE = '<script id="flightflow-core-utils" src="src/core/core-utils.js"></script>';
const MODULE_BYTES = 2367;
const MODULE_SHA256 = '9388afc824423c8434a0b4f300412b1294df6ba28c28a33cda8d01dd4dbd4a52';
const EXPECTED = Object.freeze({
  shortMessageType: { bytes: 124, sha256: 'c61517a0039c41c02772b7d261d23925ad705fd5ef36dbbd6c47ef01d15b68c3' },
  displayValue: { bytes: 379, sha256: '79d5ccbcaec3caead3749f1defa25434e8d05b6f00cca3ac81fd6da66bbe341b' },
  cleanDisplay: { bytes: 90, sha256: '59f5bf0626873301d135dabc421a5f7e8deaecc2569ab52ca391c889d58f881f' },
  humanize: { bytes: 127, sha256: 'ae83fb699c075c0433d680e992e58456076aa71e650eced83825138f35d10010' },
  clone: { bytes: 69, sha256: 'db7ba8554335e139efc09ba8d33ec21644dd3beaa67883dac4faeef570f3873a' },
  formatBytes: { bytes: 292, sha256: 'e10a2b791e297d5c037cceb25ce9bdd960dd14f72965737fb5e505ef93db2e76' },
  angleDifference: { bytes: 89, sha256: 'c33f42ad25fa9d352f3d38975f1d054fe026b3924bf1ac37780e11b674c5e4b2' },
  hashString: { bytes: 141, sha256: '7da6f0aba25a918f031e10e8abbd2fea0c777054758b7b5b7d0edec024555a94' },
  seeded: { bytes: 107, sha256: 'e8a98352bd15958c19bfa524d389fa7f84ce3ab902bde82439dafee89dacfbc2' },
  getPath: { bytes: 138, sha256: '247f4a3dd072d9a76e62f80d3b247d7891c65d0b4a3c2082bb4f932dd67963ea' },
  setPath: { bytes: 345, sha256: 'b8e0c78106388a4ced70f669fff1012e9583f6fc1ecfff51e5b2da3a90db1c91' },
  normalizeSearchText: { bytes: 151, sha256: '57a99fe512a7f7ffb1b25a5609ef1d377791418703ff89862b7dce8cf476422c' },
});

const FORBIDDEN_COUPLING = [
  'state', 'els.', 'document.', 'localStorage', 'sessionStorage',
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

test('módulo core-utils mantém identidade estrutural completa', () => {
  const source = moduleSource();
  assert.equal(Buffer.byteLength(source, 'utf8'), MODULE_BYTES);
  assert.equal(crypto.createHash('sha256').update(source).digest('hex'), MODULE_SHA256);
  assert.ok(source.startsWith("(function () {\n  'use strict';"));
  assert.ok(source.includes('window.FlightFlowCoreUtils = Object.freeze({'));
  assert.ok(source.endsWith('})();\n'));
});

test('doze utilitários preservam identidade byte a byte dentro do módulo', () => {
  const source = moduleSource();
  for (const [name, expected] of Object.entries(EXPECTED)) {
    const body = extractFunction(source, name);
    assert.equal(Buffer.byteLength(body, 'utf8'), expected.bytes, `${name}: tamanho mudou`);
    assert.equal(crypto.createHash('sha256').update(body).digest('hex'), expected.sha256, `${name}: SHA mudou`);
  }
});

test('módulo é carregado antes do IIFE e o núcleo usa aliases explícitos', () => {
  const html = fs.readFileSync(HTML, 'utf8');
  assert.equal(html.split(REFERENCE).length - 1, 1, 'referência de core-utils deve ser única');
  const referenceIndex = html.indexOf(REFERENCE);
  const anchorIndex = html.indexOf(ANCHOR);
  const mainScriptStart = html.lastIndexOf('<script', anchorIndex);
  assert.ok(referenceIndex >= 0 && referenceIndex < mainScriptStart, 'core-utils deve carregar antes do núcleo principal');

  const kernel = kernelSource();
  assert.ok(kernel.includes('const CoreUtils = window.FlightFlowCoreUtils;'));
  assert.ok(kernel.includes("if (!CoreUtils) throw new Error('FlightFlowCoreUtils não foi carregado.');"));
  assert.ok(kernel.includes('const { shortMessageType, displayValue, cleanDisplay, humanize, clone, formatBytes, angleDifference, hashString, seeded, getPath, setPath, normalizeSearchText } = CoreUtils;'));
  for (const name of Object.keys(EXPECTED)) {
    assert.equal(new RegExp(`function\\s+${name}\\s*\\(`).test(kernel), false, `${name} não deve continuar declarado inline`);
  }
});

test('módulo permanece desacoplado de estado, DOM, rede, storage e mapa', () => {
  const source = moduleSource();
  for (const name of Object.keys(EXPECTED)) {
    const body = extractFunction(source, name);
    for (const token of FORBIDDEN_COUPLING) assert.ok(!body.includes(token), `${name} passou a depender de ${token}`);
  }
});

test('shortMessageType preserva normalização atual', () => {
  const fn = compile(extractFunction(moduleSource(), 'shortMessageType'), 'shortMessageType');
  assert.equal(fn(), 'ATS');
  assert.equal(fn('DEP'), 'DEP');
  assert.equal(fn('  cpl-abc/12 !!'), 'cplabc/1');
});

test('displayValue preserva representação de vazios, listas e objetos', () => {
  const fn = compile(extractFunction(moduleSource(), 'displayValue'), 'displayValue');
  assert.equal(fn(null), '—');
  assert.equal(fn(''), '—');
  assert.equal(fn('ABC'), 'ABC');
  assert.equal(fn([1, 2]), '1 | 2');
  assert.equal(fn([{ a: 'X', b: 'Y' }]), 'X · Y');
  assert.equal(fn({ a: 1 }), '{"a":1}');
});

test('cleanDisplay e humanize preservam formatação textual atual', () => {
  const source = moduleSource();
  const cleanDisplay = compile(extractFunction(source, 'cleanDisplay'), 'cleanDisplay');
  const humanize = compile(extractFunction(source, 'humanize'), 'humanize');
  assert.equal(cleanDisplay(null), '');
  assert.equal(cleanDisplay('  A   B  '), 'A B');
  assert.equal(cleanDisplay('A\nB\tC'), 'A B C');
  assert.equal(humanize('flight_level'), 'FLIGHT LEVEL');
  assert.equal(humanize('messageType'), 'MESSAGE TYPE');
  assert.equal(humanize('A-B_C'), 'A-B C');
});

test('clone continua produzindo cópia profunda JSON independente', () => {
  const clone = compile(extractFunction(moduleSource(), 'clone'), 'clone');
  const original = { a: 1, nested: { b: 2 } };
  const copied = clone(original);
  copied.nested.b = 99;
  assert.deepEqual(original, { a: 1, nested: { b: 2 } });
  assert.deepEqual(copied, { a: 1, nested: { b: 99 } });
});

test('formatBytes preserva unidades e arredondamento atuais', () => {
  const fn = compile(extractFunction(moduleSource(), 'formatBytes'), 'formatBytes');
  assert.equal(fn(0), '0 B');
  assert.equal(fn(Number.NaN), '0 B');
  assert.equal(fn(1024), '1.0 KB');
  assert.equal(fn(1536), '1.5 KB');
  assert.equal(fn(1048576), '1.0 MB');
});

test('angleDifference preserva diferença angular mínima', () => {
  const fn = compile(extractFunction(moduleSource(), 'angleDifference'), 'angleDifference');
  assert.equal(fn(350, 10), 20);
  assert.equal(fn(10, 350), 20);
  assert.equal(fn(0, 180), 180);
});

test('hashString e seeded preservam resultados determinísticos', () => {
  const source = moduleSource();
  const hashString = compile(extractFunction(source, 'hashString'), 'hashString');
  const seeded = compile(extractFunction(source, 'seeded'), 'seeded');
  assert.equal(hashString('GLO1762'), 2262905143);
  assert.equal(hashString(12345), 1136836824);
  assert.equal(seeded(42, 7), 0.04137097423517844);
  assert.equal(seeded(42, 8), 0.6239928084542044);
});

test('getPath e setPath permanecem disponíveis na API pública ampliada', () => {
  const source = moduleSource();
  const getPath = compile(extractFunction(source, 'getPath'), 'getPath');
  const setPath = compile(extractFunction(source, 'setPath'), 'setPath');
  const data = {};
  setPath(data, 'route.points.0.ident', 'PADIL');
  assert.equal(getPath(data, 'route.points.0.ident'), 'PADIL');
});
