const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = path.resolve(__dirname, '..');
const HTML = path.join(ROOT, 'index.html');
const ANCHOR = 'window.__FlightFlowFirBridge = Object.freeze({';

const EXPECTED = Object.freeze({
  themeSwatch: { bytes: 330, sha256: 'f6a08de7486f9f317f9ae48739bf130d2d3f7f07b45ab5c4f76afa609994ba52' },
  stripTheme: { bytes: 653, sha256: '2dd09d6f90d269c0441ca63a5022d66a12de606235acbe8d5554ef2bf8c6f2f4' },
  statusClass: { bytes: 413, sha256: '459acb249e4af18bb6973d305fbd6e43c9c558ec89452b975de71ee4d122f12e' },
});

const FORBIDDEN_COUPLING = [
  'state.', 'els.', 'document.', 'window.', 'localStorage', 'sessionStorage',
  'indexedDB', 'fetch(', 'realMapState', 'google.', 'L.', 'Parser',
  'setTimeout', 'setInterval', 'requestAnimationFrame', 'navigator.',
  'CustomEvent', 'dispatchEvent', 'addEventListener', 'querySelector', 'getElementById'
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
  assert.equal(matches.length, 1, `${name} deve existir exatamente uma vez no núcleo antes da extração`);
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

test('três utilitários de estado visual mantêm identidade byte a byte antes da extração', () => {
  const kernel = kernelSource();
  for (const [name, expected] of Object.entries(EXPECTED)) {
    const source = extractFunction(kernel, name);
    assert.equal(Buffer.byteLength(source, 'utf8'), expected.bytes, `${name}: tamanho mudou`);
    assert.equal(crypto.createHash('sha256').update(source).digest('hex'), expected.sha256, `${name}: SHA mudou`);
  }
});

test('cluster permanece puro e desacoplado de estado global, DOM, rede, storage, mapa e parser', () => {
  const kernel = kernelSource();
  for (const name of Object.keys(EXPECTED)) {
    const source = extractFunction(kernel, name);
    for (const token of FORBIDDEN_COUPLING) assert.ok(!source.includes(token), `${name} passou a depender de ${token}`);
  }
});

test('themeSwatch preserva paleta operacional atual e fallback', () => {
  const fn = compile(extractFunction(kernelSource(), 'themeSwatch'), 'themeSwatch');
  assert.deepEqual({
    preLight: fn('theme-pre-light'),
    preDark: fn('theme-pre-dark'),
    noncontrolled: fn('theme-noncontrolled'),
    controlled: fn('theme-controlled'),
    proposal: fn('theme-proposal'),
    donor: fn('theme-donor'),
    receiver: fn('theme-receiver'),
    finished: fn('theme-finished'),
    nonrvsm: fn('theme-nonrvsm'),
    alert: fn('theme-alert'),
    fallback: fn('unknown-theme'),
  }, {
    preLight: '#68ff72', preDark: '#00b832', noncontrolled: '#d6d6d6', controlled: '#111111',
    proposal: '#fff000', donor: '#ff9c2e', receiver: '#3f4cff', finished: '#d0d0d0',
    nonrvsm: '#954a2c', alert: '#c4151d', fallback: '#d6d6d6'
  });
});

test('stripTheme preserva prioridade e classificação operacional atuais', () => {
  const fn = compile(extractFunction(kernelSource(), 'stripTheme'), 'stripTheme');
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
    [{ snapshot: { status: 'INATIVO' } }, 'theme-noncontrolled'],
    [null, 'theme-noncontrolled'],
  ];
  for (const [event, expected] of cases) assert.equal(fn(event), expected, JSON.stringify(event));
});

test('statusClass preserva classificação e precedência atuais', () => {
  const fn = compile(extractFunction(kernelSource(), 'statusClass'), 'statusClass');
  assert.equal(fn('PRÉ-ATIVO'), 'status-preactive');
  assert.equal(fn('INATIVO'), 'status-inactive');
  assert.equal(fn('ATIVO'), 'status-active');
  assert.equal(fn('TERMINADO'), 'status-terminated');
  assert.equal(fn('ARQUIVADO'), 'status-archived');
  assert.equal(fn(''), 'status-empty');
  assert.equal(fn(null), 'status-empty');
});

test('cluster possui somente quatro pontos consumidores no núcleo atual', () => {
  const kernel = kernelSource();
  const lines = kernel.split('\n');
  const counts = {};
  for (const name of Object.keys(EXPECTED)) {
    counts[name] = lines.filter(line => new RegExp(`\\b${name}\\b`).test(line) && !new RegExp(`function\\s+${name}\\s*\\(`).test(line)).length;
  }
  assert.deepEqual(counts, { themeSwatch: 1, stripTheme: 2, statusClass: 1 });
});
