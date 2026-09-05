const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const MODULE = path.join(ROOT, 'src', 'ui', 'operational-state-utils.js');
const SAMPLE = path.join(ROOT, 'src', 'data', 'sample-history.js');
const Parser = require(path.join(ROOT, 'src', 'parser', 'flight-parser.js'));

function loadOperationalStateUtils() {
  const source = fs.readFileSync(MODULE, 'utf8');
  const sandbox = {};
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox, { filename: MODULE });
  assert.ok(sandbox.FlightFlowOperationalStateUtils);
  return sandbox.FlightFlowOperationalStateUtils;
}

function loadSampleHistory() {
  const source = fs.readFileSync(SAMPLE, 'utf8');
  const sandbox = {};
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox, { filename: SAMPLE });
  assert.equal(typeof sandbox.__SAMPLE_HISTORY__, 'string');
  return sandbox.__SAMPLE_HISTORY__;
}

test('INATIVO deve usar tema não controlado mesmo quando a operação contém Arquivo', () => {
  const api = loadOperationalStateUtils();
  assert.equal(api.stripTheme({ snapshot: { status: 'INATIVO' } }), 'theme-noncontrolled');
  assert.equal(
    api.stripTheme({ snapshot: { status: 'INATIVO' }, operation: 'Criação pelo Arquivo de RPL' }),
    'theme-noncontrolled'
  );
});

test('prioridades especiais continuam acima da regra de INATIVO', () => {
  const api = loadOperationalStateUtils();
  assert.equal(api.stripTheme({ snapshot: { status: 'INATIVO' }, operation: 'EMERG' }), 'theme-alert');
  assert.equal(api.stripTheme({ snapshot: { status: 'INATIVO', rvsm: 'X' } }), 'theme-nonrvsm');
  assert.equal(api.stripTheme({ snapshot: { status: 'INATIVO', groundState: 'DOADOR' } }), 'theme-donor');
  assert.equal(api.stripTheme({ snapshot: { status: 'INATIVO', groundState: 'RECEPTOR' } }), 'theme-receiver');
});

test('os dez eventos INATIVO do histórico de demonstração devem renderizar cinza', () => {
  const api = loadOperationalStateUtils();
  const parsed = Parser.parseHistoryText(loadSampleHistory());
  const inactive = parsed.events.filter(event => String(event?.snapshot?.status || '').toUpperCase() === 'INATIVO');
  assert.equal(inactive.length, 10, 'fixture conhecida deve continuar expondo dez eventos INATIVO');
  assert.deepEqual(
    inactive.map(event => api.stripTheme(event)),
    Array(inactive.length).fill('theme-noncontrolled')
  );
});
