const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');
const HTML = path.join(ROOT, 'index.html');
const MODULE = path.join(ROOT, 'src', 'data', 'geo-data.js');
const EXPECTED_SHA256 = '63a07fee3174782a23024f479ccbb7d68512447d94e5ecbbad33ee5bdd822506';
const EXPECTED_BYTES = 590527;
const REFERENCE = '<script id="flightflow-geo-data" src="src/data/geo-data.js"></script>';

test('base geográfica externa preserva exatamente bytes e SHA extraídos', () => {
  const source = fs.readFileSync(MODULE);
  assert.equal(source.length, EXPECTED_BYTES);
  const digest = crypto.createHash('sha256').update(source).digest('hex');
  assert.equal(digest, EXPECTED_SHA256);
});

test('index carrega geo data externo uma única vez e não mantém definição inline', () => {
  const html = fs.readFileSync(HTML, 'utf8');
  assert.equal(html.split(REFERENCE).length - 1, 1);
  assert.doesNotMatch(html, /window\.__FLIGHTFLOW_GEO_DATA__\s*=/);
});

test('módulo publica uma base geográfica não vazia', () => {
  const source = fs.readFileSync(MODULE, 'utf8');
  const sandbox = {};
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox, { filename: 'geo-data.js' });

  const geo = sandbox.__FLIGHTFLOW_GEO_DATA__;
  assert.ok(geo && typeof geo === 'object', 'global geográfico deve ser objeto/array');
  assert.ok(Object.keys(geo).length > 0, 'base geográfica não pode estar vazia');
  assert.ok(JSON.stringify(geo).length > 100000, 'base carregada deve manter volume material de dados');
});
