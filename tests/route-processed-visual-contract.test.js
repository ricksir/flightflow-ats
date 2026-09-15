const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');
const MODULE = path.join(ROOT, 'src', 'route', 'route-processed-v7412.js');

function sourceText() {
  return fs.readFileSync(MODULE, 'utf8');
}

function loadRouteApi() {
  let source = sourceText();
  const initMarker = "  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(init,0),{once:true});else setTimeout(init,0);\n})();";
  assert.ok(source.includes(initMarker), 'bootstrap conhecido da Rota Processada deve permanecer localizável');
  source = source.replace(initMarker, '  window.FlightFlowRouteProcessedV7412=publicApi();\n})();');

  const sandbox = { console };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox, { filename: MODULE });
  return sandbox.FlightFlowRouteProcessedV7412;
}

test('Rota Processada separa faixa explicativa da legenda recolhível', () => {
  const source = sourceText();
  assert.match(source, /class="ffrp-map-stage"/);
  assert.match(source, /<details id="ffrpLegend" class="ffrp-legend">/);
  assert.match(source, /<summary>Legenda operacional<\/summary>/);
  assert.match(source, /<div id="ffrpMapNote" class="ffrp-map-note" role="status"><\/div>/);
  assert.match(source, /\.ffrp-map-note\{position:static/);
  assert.match(source, /\.ffrp-legend summary\{/);
});

test('modo foco mantém poucos labels prioritários e suporta seleção explícita', () => {
  const api = loadRouteApi();
  const model = api.getModel();
  model.history = { route: '', ades: '' };
  model.focusMode = true;
  model.selectedPointIndex = -1;

  const snapshot = {
    points: [
      { ident: 'ORIG', geo: { lat: -10, lon: -50 } },
      { ident: 'P1', geo: { lat: -11, lon: -49 } },
      { ident: 'P2', geo: { lat: -12, lon: -48 } },
      { ident: 'P3', geo: { lat: -13, lon: -47 } },
      { ident: 'DEST', geo: { lat: -14, lon: -46 } },
    ],
    operation: 'Teste visual',
  };

  const focus = api.routeDisplayContext(snapshot, 0.52);
  assert.ok(focus.permanent.size < focus.plotPoints.length, 'modo foco não deve rotular todos os pontos');
  assert.ok(focus.permanent.has(0), 'origem deve permanecer rotulada');
  assert.ok(focus.permanent.has(snapshot.points.length - 1), 'último ponto deve permanecer rotulado');
  assert.ok(focus.permanent.has(focus.focusPlotIndex), 'ponto atual deve permanecer rotulado');

  model.selectedPointIndex = 1;
  const selected = api.routeDisplayContext(snapshot, 0.52);
  assert.ok(selected.permanent.has(1), 'ponto selecionado deve permanecer rotulado');
  assert.equal(api.pointDisplayState(selected, 1).selected, true);

  model.focusMode = false;
  const expanded = api.routeDisplayContext(snapshot, 0.52);
  assert.ok(expanded.permanent.size >= selected.permanent.size, 'fora do modo foco a densidade pode aumentar sem perder prioridades');
});

test('labels nativos deixam de ser todos permanentes e preservam detalhes por hover/click', () => {
  const source = sourceText();
  assert.match(source, /const permanent=state\.labelled/);
  assert.match(source, /sticky:!permanent/);
  assert.match(source, /ffrp-native-fix-hover/);
  assert.match(source, /model\.selectedPointIndex=i/);
  assert.match(source, /tabindex="0" role="button"/);
  assert.match(source, /\.ffrp-map \.wp text\{font:850 14px/);
});

test('PR visual não altera o contrato temporal protegido da rota', () => {
  const source = sourceText();
  assert.match(source, /function pseudoDestinationTail\(\) \{ return null; \}/);
  assert.match(source, /function movementPoints\(snapshot\)/);
  assert.match(source, /function timedProgressLimit\(snapshot\)/);
  assert.doesNotMatch(source, /function goTo\(/, 'módulo Rota Processada não deve introduzir implementação própria de goTo');
});
