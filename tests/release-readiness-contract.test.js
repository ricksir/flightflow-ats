'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(ROOT, relative), 'utf8');

const PACKAGE = JSON.parse(read('package.json'));
const WORKFLOW = read('.github/workflows/quality-gates.yml');
const README = read('README.md');
const TESTS_README = read('tests/README.md');
const RELEASE_DOC = read('docs/RELEASE-READINESS.md');
const ROUTE_REGRESSION = read('tests/route-regression.test.js');
const SPATIAL = read('tests/e2e/aircraft-fix-spatial-regression.spec.js');
const NAV_SPATIAL = read('tests/e2e/navigation-spatial-equivalence.spec.js');
const UI_NAV = read('tests/e2e/ui-navigation.spec.js');
const REAL_PLAN = read('tests/real-plan-route-regressions.test.js');

const EXPECTED_FIXES = ['PADIL', 'IRISO', 'LIBEC', 'EGDOD', 'IBGAM', 'PMS', 'ILVES', 'MASVA'];

test('release candidate continua exigindo todos os quality gates', () => {
  assert.equal(PACKAGE.scripts.audit, 'python3 tools/audit_static.py index.html');
  assert.equal(PACKAGE.scripts.inventory, 'python3 tools/function_inventory.py index.html --check');
  assert.equal(PACKAGE.scripts.test, 'node --test tests/*.test.js');
  assert.equal(PACKAGE.scripts['test:ui'], 'playwright test');
  assert.equal(PACKAGE.scripts.check, 'npm run audit && npm run inventory && npm test && npm run test:ui');

  for (const token of [
    'Static audit',
    'Function declaration inventory',
    'Timeline and route regression tests',
    'Browser availability',
    'UI navigation regression tests',
    'npm run audit',
    'npm run inventory',
    'npm test',
    'npm run test:ui',
  ]) assert.ok(WORKFLOW.includes(token), `gate ausente no workflow: ${token}`);
});

test('sequência crítica 78 → 79 permanece protegida em Node e Playwright', () => {
  const literal = "['PADIL', 'IRISO', 'LIBEC', 'EGDOD', 'IBGAM', 'PMS', 'ILVES', 'MASVA']";
  assert.ok(ROUTE_REGRESSION.includes(literal));
  assert.ok(SPATIAL.includes(literal));
  assert.ok(NAV_SPATIAL.includes(literal));

  for (const ident of EXPECTED_FIXES) {
    assert.ok(ROUTE_REGRESSION.includes(ident), `fixo ausente do teste Node: ${ident}`);
    assert.ok(SPATIAL.includes(ident), `fixo ausente do teste espacial: ${ident}`);
  }

  assert.ok(ROUTE_REGRESSION.includes('ILVES deve anteceder MASVA'));
  assert.ok(ROUTE_REGRESSION.includes('retrocesso 79 → 78 percorre os mesmos fixos em ordem inversa'));
  assert.ok(SPATIAL.includes('renderiza a aeronave exatamente em PADIL..MASVA'));
});

test('equivalência das formas de navegação continua coberta por E2E', () => {
  for (const token of [
    'Próximo e Anterior mantêm navegação sincronizada e atualizam STRIP/FPV',
    'Próximo, clique na timeline e scrubber convergem para o mesmo estado visível',
    'teclado ArrowRight e ArrowLeft usa a mesma navegação da interface',
    'autoplay avança e uma navegação manual interrompe a reprodução',
  ]) assert.ok(UI_NAV.includes(token), `cobertura de navegação ausente: ${token}`);

  for (const token of ['EXPECTED_FIXES', 'BASE_INDEX = 77', 'TARGET_INDEX = 78']) {
    assert.ok(NAV_SPATIAL.includes(token), `contrato espacial de navegação ausente: ${token}`);
  }
});

test('STRIP e FPV permanecem cobertos no fluxo operacional E2E', () => {
  for (const token of [
    '#stripToggleBtn',
    '#stripWindow',
    '[data-strip-field="E"] .strip-value',
    '[data-strip-field="F"] .strip-value',
    '[data-strip-field="H"] .strip-value',
    '#stripRecognizeBtn',
    'Alterações reconhecidas',
    '#stripCloseBtn',
    '#fpvToggleBtn',
    '#fpvWindow',
    '[data-fpv="acft"] b',
    '[data-fpv="dest"] b',
    '#fpvCloseBtn',
  ]) assert.ok(UI_NAV.includes(token), `cobertura operacional ausente: ${token}`);
});

test('troca de histórico sem resíduo permanece coberta por E2E', () => {
  for (const token of [
    'troca de histórico sem resíduo da sessão anterior',
    "document.addEventListener('flightflow:history-session-reset'",
    "name: 'history-second.txt'",
    "sample.replaceAll('TAM3542', 'GLO4321')",
    "modes: ['pending']",
    "expect(currentSession.modes).toEqual(['pending', 'source'])",
    "expect(currentSession.sourceNames).toEqual(['history-second'])",
    'staleProcessedRoute',
    'staleSnapshot',
    'staleMovementProfile',
    'staleRouteHistory',
  ]) assert.ok(UI_NAV.includes(token), `proteção de troca de histórico ausente: ${token}`);
});

test('regressões baseadas em históricos representativos permanecem no conjunto Node', () => {
  for (const token of ['GLO7634', 'TAM3774', 'PSFBU']) {
    assert.ok(REAL_PLAN.includes(token), `fixture representativo ausente: ${token}`);
  }
  assert.ok(REAL_PLAN.includes('mantém 18 pontos atravessando meia-noite'));
  assert.ok(REAL_PLAN.includes('substitui IDPLANO parcial pelo identificador completo'));
});

test('documentação atual descreve o estado real de modularização e testes', () => {
  assert.ok(README.includes('Release Readiness'));
  assert.ok(README.includes('src/'));
  assert.ok(README.includes('módulos já extraídos'));
  assert.equal(README.includes('destino da modularização futura'), false);

  assert.ok(TESTS_README.includes('cobertura automatizada'));
  assert.ok(TESTS_README.includes('Playwright'));
  assert.equal(TESTS_README.includes('A próxima etapa é adicionar testes automatizados'), false);

  for (const token of [
    'Static audit',
    'Function declaration inventory',
    'Node regression tests',
    'Playwright UI regression tests',
    'PADIL → IRISO → LIBEC → EGDOD → IBGAM → PMS → ILVES → MASVA',
    'Aceitação manual antes da versão estável',
  ]) assert.ok(RELEASE_DOC.includes(token), `critério de release ausente: ${token}`);
});
