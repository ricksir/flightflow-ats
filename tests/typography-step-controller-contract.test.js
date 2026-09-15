'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');
const HTML = path.join(ROOT, 'index.html');
const MODULE = path.join(ROOT, 'src', 'ui', 'typography-step-controller.js');

function loadApi() {
  const source = fs.readFileSync(MODULE, 'utf8');
  const context = { window: {} };
  vm.runInNewContext(source, context);
  return context.window.FlightFlowTypographyStepController;
}

test('typography-step-controller expõe apenas a factory create', () => {
  const api = loadApi();
  assert.equal(Object.isFrozen(api), true);
  assert.deepEqual(Object.keys(api), ['create']);
  assert.equal(typeof api.create, 'function');
});

test('factory exige state e applyTypography explicitamente', () => {
  const api = loadApi();

  assert.throws(
    () => api.create({}),
    /FlightFlowTypographyStepController requer state/
  );

  assert.throws(
    () => api.create({ state: {} }),
    /FlightFlowTypographyStepController requer applyTypography/
  );
});

test('factory retorna somente stepTypography e mantém o escopo congelado', () => {
  const api = loadApi();
  const scoped = api.create({
    state: { config: {} },
    applyTypography() {},
  });

  assert.equal(Object.isFrozen(scoped), true);
  assert.deepEqual(Object.keys(scoped), ['stepTypography']);
  assert.equal(typeof scoped.stepTypography, 'function');
});

test('index carrega o módulo antes do núcleo e faz wiring explícito', () => {
  const html = fs.readFileSync(HTML, 'utf8');
  const tag = '<script id="flightflow-typography-step-controller" src="src/ui/typography-step-controller.js"></script>';
  const anchor = 'window.__FlightFlowFirBridge = Object.freeze({';

  assert.ok(html.includes(tag));
  assert.ok(html.indexOf(tag) < html.indexOf(anchor));
  assert.ok(html.includes('const TypographyStepController = window.FlightFlowTypographyStepController;'));
  assert.ok(html.includes("if (!TypographyStepController) throw new Error('FlightFlowTypographyStepController não foi carregado.');"));
  assert.ok(html.includes('const { stepTypography } = TypographyStepController.create({ state, applyTypography });'));
});
