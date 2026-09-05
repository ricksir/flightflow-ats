const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');
const HTML = path.join(ROOT, 'index.html');
const MODULE = path.join(ROOT, 'src', 'data', 'sample-history.js');
const EXPECTED_SHA256 = '283887403c91163bc09206f772850754cf455ac59794ece1c0bbd7d226d9cc1d';
const REFERENCE = '<script id="flightflow-sample-history" src="src/data/sample-history.js"></script>';

test('sample history externo preserva exatamente os bytes extraídos', () => {
  const source = fs.readFileSync(MODULE);
  const digest = crypto.createHash('sha256').update(source).digest('hex');
  assert.equal(digest, EXPECTED_SHA256);
});

test('index carrega sample history externo uma única vez e não mantém definição inline', () => {
  const html = fs.readFileSync(HTML, 'utf8');
  assert.equal(html.split(REFERENCE).length - 1, 1);
  assert.doesNotMatch(html, /window\.__SAMPLE_HISTORY__\s*=/);
});

test('módulo publica o mesmo histórico de demonstração conhecido', () => {
  const source = fs.readFileSync(MODULE, 'utf8');
  const sandbox = {};
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox, { filename: 'sample-history.js' });

  assert.equal(typeof sandbox.__SAMPLE_HISTORY__, 'string');
  assert.match(sandbox.__SAMPLE_HISTORY__, /HISTÓRICO DE PLANOS/);
  assert.match(sandbox.__SAMPLE_HISTORY__, /TAM3542/);
  assert.match(sandbox.__SAMPLE_HISTORY__, /ADEP:\s*SBBR/);
  assert.match(sandbox.__SAMPLE_HISTORY__, /ADES\s*:\s*SBGO/);
});
