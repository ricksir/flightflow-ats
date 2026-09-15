const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');
const MODULE = path.join(ROOT, 'src', 'route', 'route-processed-v7412.js');

const TAM3774_FIXTURE = `
Indicativo do plano: TAM3774
ADEP: SBBR
ADES: SBCT
Rota: KUKOL UZ5 UMGUL

data:   08/07/2026      hora:   18:00:34
OPERAÇÃO : Criação pelo Arquivo de RPL

PONTOS : SBBR        UMSUB       KUKOL       SIRUL       VUDOT       EDMIN
CFL/IFL: 340         340         340         340         340         340
ETIM   : 08-23:45    08-23:50    08-23:55    09-00:04    09-00:09    09-00:11

PONTOS : 1853S04832W UDIGI       MEVIK       ASTOB       VUPOG       UPONA
CFL/IFL: 340         340         340         340         340         340
ETIM   : 09-00:13    09-00:16    09-00:25    09-00:28    09-00:28    09-00:32

PONTOS : 2127S04856W ISISA       ENPEG       PALCA       ANSOK       IMTBI
CFL/IFL: 340         340         340         340         340         340
ETIM   : 09-00:34    09-00:36    09-00:36    09-00:39    09-00:42    09-00:43
`;

const EXPECTED_POINTS = [
  'SBBR', 'UMSUB', 'KUKOL', 'SIRUL', 'VUDOT', 'EDMIN',
  '1853S04832W', 'UDIGI', 'MEVIK', 'ASTOB', 'VUPOG', 'UPONA',
  '2127S04856W', 'ISISA', 'ENPEG', 'PALCA', 'ANSOK', 'IMTBI',
];

const EXPECTED_UZ5 = Object.freeze({
  KUKOL: [-16.6897222222, -48.4483333333],
  SIRUL: [-17.7119444444, -48.5341666667],
  VUDOT: [-18.3055555556, -48.5872222222],
  EDMIN: [-18.675, -48.6208333333],
  UDIGI: [-19.1702777778, -48.6655555556],
  MEVIK: [-20.2786111111, -48.7811111111],
  ASTOB: [-20.68, -48.8230555556],
  VUPOG: [-20.7422222222, -48.8330555556],
  UPONA: [-21.2108333333, -48.9077777778],
  ISISA: [-21.6555555556, -48.9791666667],
  ENPEG: [-21.7608333333, -49.005],
  PALCA: [-22.0988888889, -49.0883333333],
  ANSOK: [-22.3938888889, -49.1613888889],
  IMTBI: [-22.5677777778, -49.2108333333],
});

const EXPECTED_UZ5_CONTINUATION = Object.freeze({
  VULRU: [-22.8975, -49.3013888889],
  UBNID: [-23.2113888889, -49.3877777778],
  GIKLU: [-23.4263888889, -49.4402777778],
  USVIG: [-23.6322222222, -49.5047222222],
  UMGUL: [-23.7438888889, -49.5358333333],
});

function loadRouteApi() {
  let source = fs.readFileSync(MODULE, 'utf8');
  const initMarker = "  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(init,0),{once:true});else setTimeout(init,0);\n})();";
  assert.ok(source.includes(initMarker), 'bootstrap conhecido da Rota Processada deve permanecer localizável');
  source = source.replace(initMarker, '  window.FlightFlowRouteProcessedV7412=publicApi();\n})();');

  const sandbox = { console };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox, { filename: MODULE });
  assert.ok(sandbox.FlightFlowRouteProcessedV7412, 'API da Rota Processada deve ser publicada no sandbox');
  return sandbox.FlightFlowRouteProcessedV7412;
}

function assertNear(actual, expected, label) {
  assert.ok(Number.isFinite(actual), `${label} deve ser numérico`);
  assert.ok(Math.abs(actual - expected) < 1e-9, `${label}: esperado ${expected}, recebido ${actual}`);
}

test('TAM3774 preserva a sequência processada de 18 pontos da UZ5', () => {
  const api = loadRouteApi();
  const history = api.parseHistory(TAM3774_FIXTURE, 'TAM3774Cw.txt');

  assert.equal(history.callsign, 'TAM3774');
  assert.equal(history.adep, 'SBBR');
  assert.equal(history.ades, 'SBCT');
  assert.equal(history.route, 'KUKOL UZ5 UMGUL');
  assert.equal(history.snapshots.length, 1);
  assert.deepEqual(
    Array.from(history.snapshots[0].points, point => point.ident),
    EXPECTED_POINTS,
    'nenhum fixo processado pode ser pulado ou reordenado'
  );

  const firstCoord = api.parseCoordinateIdent('1853S04832W');
  const secondCoord = api.parseCoordinateIdent('2127S04856W');
  assertNear(firstCoord.lat, -(18 + 53 / 60), '1853S latitude');
  assertNear(firstCoord.lon, -(48 + 32 / 60), '04832W longitude');
  assertNear(secondCoord.lat, -(21 + 27 / 60), '2127S latitude');
  assertNear(secondCoord.lon, -(48 + 56 / 60), '04856W longitude');
});

test('snapshot offline cobre os 14 fixos nominais UZ5 ausentes no TAM3774', () => {
  const api = loadRouteApi();
  const seed = new Map(Array.from(api.officialSeed, row => [row.ident, row]));

  for (const [ident, [lat, lon]] of Object.entries(EXPECTED_UZ5)) {
    const row = seed.get(ident);
    assert.ok(row, `${ident} deve estar disponível offline`);
    assert.equal(row.quality, 'official', `${ident} deve usar coordenada oficial`);
    assert.match(row.source, /AISWEB AIP ENR 3\.2 · UZ5/);
    assertNear(row.lat, lat, `${ident} latitude`);
    assertNear(row.lon, lon, `${ident} longitude`);
  }
});


test('TAM3774 expande somente a continuação publicada da UZ5 até UMGUL, sem inventar ETIM', () => {
  const api = loadRouteApi();
  const history = api.parseHistory(TAM3774_FIXTURE, 'TAM3774Cw.txt');
  const model = api.getModel();
  model.history = history;

  const continuation = api.declaredRouteContinuation(history.snapshots[0]);
  assert.deepEqual(
    Array.from(continuation, point => point.ident),
    ['VULRU', 'UBNID', 'GIKLU', 'USVIG', 'UMGUL'],
    'a continuação deve seguir a ordem oficial da UZ5 após IMTBI'
  );

  for (const point of continuation) {
    const expected = EXPECTED_UZ5_CONTINUATION[point.ident];
    assert.ok(expected, `${point.ident} deve pertencer à continuação congelada`);
    assert.equal(point.declared, true);
    assert.equal(point.untimed, true);
    assert.equal(point.etim, '', `${point.ident} não pode receber ETIM inventado`);
    assert.equal(point.etimKey, null, `${point.ident} não pode receber chave temporal inventada`);
    assert.equal(point.cfl, '', `${point.ident} não pode herdar CFL sem evidência do histórico`);
    assertNear(point.geo.lat, expected[0], `${point.ident} latitude`);
    assertNear(point.geo.lon, expected[1], `${point.ident} longitude`);
  }
});

test('TAM3774 não cria mais aproximação sintética IMTBI → SBCT e limita o movimento ao último ETIM real', () => {
  const api = loadRouteApi();
  const history = api.parseHistory(TAM3774_FIXTURE, 'TAM3774Cw.txt');
  const model = api.getModel();
  model.history = history;

  const seed = new Map(Array.from(api.officialSeed, row => [row.ident, row]));
  const snapshot = {
    ...history.snapshots[0],
    points: history.snapshots[0].points.map(point => {
      const geo = api.parseCoordinateIdent(point.ident) || seed.get(point.ident) || null;
      return {...point, geo};
    }),
  };

  const movement = api.movementPoints(snapshot);
  assert.deepEqual(
    Array.from(movement.slice(-6), point => point.ident),
    ['IMTBI', 'VULRU', 'UBNID', 'GIKLU', 'USVIG', 'UMGUL']
  );
  assert.equal(movement.some(point => point.ident === 'SBCT'), false, 'ADES não pode ser inserido como trecho espacial inventado');
  assert.equal(api.pseudoDestinationTail(snapshot), null, 'aproximação sintética até o ADES deve permanecer desativada');

  const limit = api.timedProgressLimit(snapshot);
  assert.ok(limit > 0 && limit < 1, 'último ETIM real deve terminar antes de 100% da continuação declarada');
  const fractions = api.routeDistanceFractions(movement);
  const imtbiIndex = movement.findIndex(point => point.ident === 'IMTBI');
  assertNear(limit, fractions[imtbiIndex], 'limite temporal em IMTBI');
});
