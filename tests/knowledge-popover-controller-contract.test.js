'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');
const HTML = path.join(ROOT, 'index.html');
const MODULE = path.join(ROOT, 'src', 'knowledge', 'knowledge-popover-controller.js');

function loadApi() {
  const source = fs.readFileSync(MODULE, 'utf8');
  const context = { window: {} };
  vm.runInNewContext(source, context);
  return context.window.FlightFlowKnowledgePopoverController;
}

test('knowledge-popover-controller expõe apenas a factory create', () => {
  const api = loadApi();
  assert.equal(Object.isFrozen(api), true);
  assert.deepEqual(Object.keys(api), ['create']);
  assert.equal(typeof api.create, 'function');
});

test('factory exige els e state explicitamente', () => {
  const api = loadApi();

  assert.throws(
    () => api.create({}),
    /FlightFlowKnowledgePopoverController requer els/
  );

  assert.throws(
    () => api.create({ els: {} }),
    /FlightFlowKnowledgePopoverController requer state/
  );
});

test('factory retorna somente hideKnowledgePopover e mantém o escopo congelado', () => {
  const api = loadApi();
  const scoped = api.create({
    els: {},
    state: {},
  });

  assert.equal(Object.isFrozen(scoped), true);
  assert.deepEqual(Object.keys(scoped), ['hideKnowledgePopover']);
  assert.equal(typeof scoped.hideKnowledgePopover, 'function');
});

test('index carrega o módulo antes do núcleo e faz wiring explícito', () => {
  const html = fs.readFileSync(HTML, 'utf8');
  const tag = '<script id="flightflow-knowledge-popover-controller" src="src/knowledge/knowledge-popover-controller.js"></script>';
  const anchor = 'window.__FlightFlowFirBridge = Object.freeze({';

  assert.ok(html.includes(tag));
  assert.ok(html.indexOf(tag) < html.indexOf(anchor));
  assert.ok(html.includes('const KnowledgePopoverController = window.FlightFlowKnowledgePopoverController;'));
  assert.ok(html.includes("if (!KnowledgePopoverController) throw new Error('FlightFlowKnowledgePopoverController não foi carregado.');"));
  assert.ok(html.includes('const { hideKnowledgePopover } = KnowledgePopoverController.create({ els, state });'));
});
