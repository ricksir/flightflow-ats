const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const HTML = path.join(ROOT, 'index.html');
const STORAGE = path.join(ROOT, 'src', 'storage', 'secure-storage.js');

const PUBLIC_MEMBERS = [
  'init',
  'scheduleSnapshot',
  'flush',
  'snapshot',
  'saveHistory',
  'exportBackup',
  'importBackupFile',
  'validateStorage',
  'deleteRecord',
  'getRecord',
];

const LEGACY_KEYS = [
  'flightflow-config-v2',
  'flightflow-localities-v1',
  'flightflow-custom-aerodromes-v1',
  'flightflow-geo-coordinate-v4',
  'flightflow-ai-governance-v1',
  'flightflow-ai-settings-v1',
  'flightflow-ai-audit-v1',
];

test('Secure Storage externo preserva identidade, schema e API pública', () => {
  const source = fs.readFileSync(STORAGE, 'utf8');
  assert.match(source, /const APP_VERSION = 'FINAL-OFICIAL-SECURE-1\.1';/);
  assert.match(source, /const SCHEMA_VERSION = 1;/);
  assert.match(source, /const DB_NAME = 'FlightFlowSecureDB';/);
  assert.match(source, /window\.FlightFlowStorage=Object\.freeze\(\{/);

  for (const member of PUBLIC_MEMBERS) {
    assert.ok(source.includes(member), `${member} deve permanecer no contrato do storage`);
  }
  for (const key of LEGACY_KEYS) {
    assert.ok(source.includes(key), `chave legada ${key} deve permanecer reconhecida`);
  }
});

test('Secure Storage preserva hooks globais e auto-inicialização', () => {
  const source = fs.readFileSync(STORAGE, 'utf8');
  assert.ok(source.includes("typeof selectFile==='function'"));
  assert.ok(source.includes("typeof loadFile==='function'"));
  assert.ok(source.includes("if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();"));
  assert.ok(source.includes("window.addEventListener('pagehide'"));
  assert.ok(source.includes("document.addEventListener('visibilitychange'"));
});

test('index carrega Secure Storage externo exatamente uma vez', () => {
  const html = fs.readFileSync(HTML, 'utf8');
  const tag = '<script id="flightflow-secure-storage-module" src="src/storage/secure-storage.js"></script>';
  assert.equal(html.split(tag).length - 1, 1, 'referência externa do storage deve ser única');
  assert.equal(
    html.includes('window.FlightFlowStorage=Object.freeze({'),
    false,
    'implementação do Secure Storage não deve voltar a ficar inline no index.html'
  );
});
