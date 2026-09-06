'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');
const SOURCE = fs.readFileSync(path.join(ROOT, 'src/map/radar-tag-controller.js'), 'utf8');

function loadModule() {
  const sandbox = { window: {} };
  vm.createContext(sandbox);
  vm.runInContext(SOURCE, sandbox, { filename: 'radar-tag-controller.js' });
  return sandbox.window.FlightFlowRadarTagController;
}

function tag(hidden = false) {
  return { hidden, style: { left: '', top: '' } };
}

test('create exige o objeto els e publica API congelada', () => {
  const module = loadModule();
  assert.throws(
    () => module.create(),
    error => error && error.name === 'TypeError' && error.message === 'els deve ser objeto.',
  );
  const api = module.create({ els: {} });
  assert.equal(Object.isFrozen(api), true);
  assert.equal(typeof api.updateRadarTagPosition, 'function');
});

test('updateRadarTagPosition preserva no-op para tag ausente, oculta ou coordenada inválida', () => {
  const module = loadModule();
  assert.doesNotThrow(() => module.create({ els: {} }).updateRadarTagPosition({ x: 800, y: 450 }));

  const hiddenTag = tag(true);
  module.create({ els: { radarTag: hiddenTag } }).updateRadarTagPosition({ x: 800, y: 450 });
  assert.equal(hiddenTag.style.left, '');
  assert.equal(hiddenTag.style.top, '');

  const invalidTag = tag(false);
  module.create({ els: { radarTag: invalidTag } }).updateRadarTagPosition({ x: 'abc', y: 450 });
  assert.equal(invalidTag.style.left, '');
  assert.equal(invalidTag.style.top, '');
});

test('updateRadarTagPosition converte o centro 1600x900 para 50%/50%', () => {
  const module = loadModule();
  const radarTag = tag();
  module.create({ els: { radarTag } }).updateRadarTagPosition({ x: 800, y: 450 });
  assert.equal(radarTag.style.left, '50%');
  assert.equal(radarTag.style.top, '50%');
});

test('updateRadarTagPosition mantém os limites visuais de 8..92% e 8..86%', () => {
  const module = loadModule();
  const radarTag = tag();
  const api = module.create({ els: { radarTag } });

  api.updateRadarTagPosition({ x: -100, y: -100 });
  assert.equal(radarTag.style.left, '8%');
  assert.equal(radarTag.style.top, '8%');

  api.updateRadarTagPosition({ x: 5000, y: 5000 });
  assert.equal(radarTag.style.left, '92%');
  assert.equal(radarTag.style.top, '86%');
});

test('updateRadarTagPosition preserva coerção numérica de coordenadas', () => {
  const module = loadModule();
  const radarTag = tag();
  module.create({ els: { radarTag } }).updateRadarTagPosition({ x: '400', y: '225' });
  assert.equal(radarTag.style.left, '25%');
  assert.equal(radarTag.style.top, '25%');
});
