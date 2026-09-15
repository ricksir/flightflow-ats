const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');
const INDEX = path.join(ROOT, 'index.html');
const ROUTE = path.join(ROOT, 'src', 'route', 'route-processed-v7412.js');
const GEO = path.join(ROOT, 'src', 'data', 'geo-data.js');

function source(file) {
  return fs.readFileSync(file, 'utf8');
}

test('renderer principal não redesenha rota legada quando a Rota Processada é autoritativa', () => {
  const html = source(INDEX);

  assert.match(html, /const processedRoute=route\.ffrpProcessed===true;/);
  assert.match(
    html,
    /if\(!processedRoute\)L\.polyline\(routeLatLngs,\{renderer:realMapState\.renderer,color:'#7359dd'/,
    'Leaflet não pode pintar a linha roxa legada para rotas ffrpProcessed'
  );
  assert.match(
    html,
    /if\(!processedRoute\)updateLeafletCompletedRoute\(route\.points,mapProgress\);/,
    'Leaflet não pode sobrepor a linha azul percorrida legada à Rota Processada'
  );

  const googleBlock = html.slice(html.indexOf('function renderGoogleMapEvent(event){'), html.indexOf('function updateGoogleCompletedRoute(){'));
  assert.match(googleBlock, /const processedRoute=route\.ffrpProcessed===true;/);
  assert.match(googleBlock, /if\(!processedRoute\)\{/);
  assert.match(googleBlock, /updateGoogleCompletedRoute\(\);/);
});

test('fechamento terminal usa underlay e tracejado sobre exatamente a mesma geometria até o ADES', () => {
  const route = source(ROUTE);

  const nativeStart = route.indexOf("const terminalLatLngs=[[Number(terminal.from.geo.lat)");
  assert.ok(nativeStart >= 0, 'geometria terminal nativa deve existir');
  const nativeBlock = route.slice(nativeStart, nativeStart + 2200);
  assert.match(nativeBlock, /const terminalUnderlay=L\.polyline\(terminalLatLngs/);
  assert.match(nativeBlock, /const terminalLine=L\.polyline\(terminalLatLngs/);
  assert.match(nativeBlock, /dashArray:'6 9'/);
  assert.match(nativeBlock, /terminalUnderlay\.addTo\(model\.nativeMapLayer\)/);
  assert.match(nativeBlock, /terminalLine\.addTo\(model\.nativeMapLayer\)/);

  assert.match(route, /class="route-terminal-underlay"/);
  assert.match(route, /class="route-terminal"/);
  assert.match(route, /\.ffrp-map \.route-terminal-underlay\{/);
});

test('SBCT oficial existe na base principal e não pode ser deslocado por coordenada customizada antiga', () => {
  const sandbox = {};
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(source(GEO), sandbox, { filename: GEO });

  const rows = sandbox.__FLIGHTFLOW_GEO_DATA__?.airports || [];
  const sbct = rows.find(row => row[0] === 'SBCT');
  assert.ok(sbct, 'SBCT deve existir na base geográfica principal');
  assert.ok(Math.abs(Number(sbct[1]) - (-25.5316666667)) < 1e-10);
  assert.ok(Math.abs(Number(sbct[2]) - (-49.1761111111)) < 1e-10);
  assert.equal(sbct[6], 'official-aip');

  const html = source(INDEX);
  assert.match(html, /source:String\(item\[6\] \|\| 'base'\)/);
  assert.match(html, /const officialLocked=existing\.source==='official-aip';/);
  assert.match(html, /lat:officialLocked\?Number\(existing\.lat\):lat/);
  assert.match(html, /lon:officialLocked\?Number\(existing\.lon\):lon/);
});

test('coordenada SBCT da base principal coincide com a coordenada oficial da Rota Processada', () => {
  const route = source(ROUTE);
  const match = route.match(/ident:'SBCT',lat:([\d.-]+),lon:([\d.-]+),source:'AISWEB AIP AD 2 SBCT/);
  assert.ok(match, 'seed oficial de SBCT deve continuar presente na Rota Processada');

  const sandbox = {};
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(source(GEO), sandbox, { filename: GEO });
  const sbct = sandbox.__FLIGHTFLOW_GEO_DATA__.airports.find(row => row[0] === 'SBCT');

  assert.equal(Number(match[1]), Number(sbct[1]));
  assert.equal(Number(match[2]), Number(sbct[2]));
});
