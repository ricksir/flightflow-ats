'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');
const HTML = path.join(ROOT, 'index.html');
const MODULE = path.join(ROOT, 'src', 'ui', 'strip-window-controller.js');

function loadApi() {
  const source = fs.readFileSync(MODULE, 'utf8');
  const context = { window: {} };
  vm.runInNewContext(source, context);
  return context.window.FlightFlowStripWindowController;
}

test('strip-window-controller expõe apenas a factory create', () => {
  const api = loadApi();
  assert.equal(Object.isFrozen(api), true);
  assert.deepEqual(Object.keys(api), ['create']);
  assert.equal(typeof api.create, 'function');
});

test('factory exige state e setStripVisible explicitamente', () => {
  const api = loadApi();

  assert.throws(
    () => api.create({}),
    /FlightFlowStripWindowController requer state/
  );

  assert.throws(
    () => api.create({ state: {} }),
    /FlightFlowStripWindowController requer setStripVisible/
  );
});

test('factory retorna somente minimizeStrip e mantém o escopo congelado', () => {
  const api = loadApi();
  const scoped = api.create({
    state: {},
    setStripVisible() {},
  });

  assert.equal(Object.isFrozen(scoped), true);
  assert.deepEqual(Object.keys(scoped), ['minimizeStrip']);
  assert.equal(typeof scoped.minimizeStrip, 'function');
});

test('index carrega o módulo antes do núcleo e faz wiring explícito', () => {
  const html = fs.readFileSync(HTML, 'utf8');
  const tag = '<script id="flightflow-strip-window-controller" src="src/ui/strip-window-controller.js"></script>';
  const anchor = 'window.__FlightFlowFirBridge = Object.freeze({';

  assert.ok(html.includes(tag));
  assert.ok(html.indexOf(tag) < html.indexOf(anchor));
  assert.ok(html.includes('const StripWindowController = window.FlightFlowStripWindowController;'));
  assert.ok(html.includes("if (!StripWindowController) throw new Error('FlightFlowStripWindowController não foi carregado.');"));
  assert.ok(html.includes('const { minimizeStrip } = StripWindowController.create({ state, setStripVisible });'));
});
