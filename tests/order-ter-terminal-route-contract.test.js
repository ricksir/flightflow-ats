const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');
const MODULE = path.join(ROOT, 'src', 'route', 'route-processed-v7412.js');

const FIXTURE_WITH_TER = String.raw`
Indicativo do plano: TAM3774
ADEP: SBBR
ADES: SBCT
Rota: KUKOL UZ5 UMGUL

############################################################
OPERAÇÃO : Criação pelo Arquivo de RPL
data:   08/07/2026      hora:   18:00:34      posição: SPA01      ambiente: OpA

PONTOS : SBBR        UMSUB       KUKOL       SIRUL       VUDOT       EDMIN
CFL/IFL: 340         340         340         340         340         340
ETIM   : 08-23:45    08-23:50    08-23:55    09-00:04    09-00:09    09-00:11

PONTOS : 1853S04832W UDIGI       MEVIK       ASTOB       VUPOG       UPONA
CFL/IFL: 340         340         340         340         340         340
ETIM   : 09-00:13    09-00:16    09-00:25    09-00:28    09-00:28    09-00:32

PONTOS : 2127S04856W ISISA       ENPEG       PALCA       ANSOK       IMTBI
CFL/IFL: 340         340         340         340         340         340
ETIM   : 09-00:34    09-00:36    09-00:36    09-00:39    09-00:42    09-00:43

############################################################
OPERAÇÃO : Recepção de Mensagem DEP
data:   08/07/2026      hora:   23:45:00      posição: SPA01      ambiente: OpA
Mensagem         : DEP
Conteúdo         :
(DEP-TAM3774-SBBR2345-SBCT)

############################################################
OPERAÇÃO : Ordem TER
data:   09/07/2026      hora:   00:50:00      posição: SPA01      ambiente: OpA
Plano encerrado por Ordem TER

############################################################
OPERAÇÃO : Arquivamento pós encerramento
data:   09/07/2026      hora:   00:51:00      posição: SPA01      ambiente: OpA
Plano arquivado
############################################################
`;

const FIXTURE_NO_TER = FIXTURE_WITH_TER
  .replace('OPERAÇÃO : Ordem TER', 'OPERAÇÃO : Coordenação final')
  .replace('Plano encerrado por Ordem TER', 'Plano aguardando encerramento');

function loadRouteApi() {
  let source = fs.readFileSync(MODULE, 'utf8');
  const initMarker = "  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(init,0),{once:true});else setTimeout(init,0);\n})();";
  assert.ok(source.includes(initMarker), 'bootstrap conhecido da Rota Processada deve permanecer localizável');
  source = source.replace(initMarker, '  window.FlightFlowRouteProcessedV7412=publicApi();\n})();');

  const sandbox = { console };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox, { filename: MODULE });
  return sandbox.FlightFlowRouteProcessedV7412;
}

function prepare(api, fixture) {
  const history = api.parseHistory(fixture, 'TAM3774-terminal-contract.txt');
  const model = api.getModel();
  model.history = history;

  const seed = new Map(Array.from(api.officialSeed, row => [row.ident, row]));
  for (const row of api.officialSeed) model.embedded.set(row.ident, { ...row });

  const snapshot = {
    ...history.snapshots[0],
    points: history.snapshots[0].points.map(point => ({
      ...point,
      geo: api.parseCoordinateIdent(point.ident) || seed.get(point.ident) || null,
    })),
  };
  model.resolvedSnapshots = [snapshot];
  return { history, model, snapshot, seed };
}

test('sem Ordem TER o fechamento terminal permanece inativo e SBCT não entra no perfil espacial', () => {
  const api = loadRouteApi();
  const { snapshot } = prepare(api, FIXTURE_NO_TER);

  assert.equal(api.terminalClosureContext(), null);
  assert.equal(api.terminalClosureState(snapshot, 999).active, false);
  assert.equal(
    api.movementPointsForProfile(snapshot).some(point => point.ident === 'SBCT'),
    false,
    'SBCT não pode ser anexado sem Ordem TER'
  );
});

test('Ordem TER mantém um único segmento lógico UMGUL → SBCT com endpoint oficial e sem dados inventados', () => {
  const api = loadRouteApi();
  const { snapshot, seed } = prepare(api, FIXTURE_WITH_TER);

  const context = api.terminalClosureContext();
  assert.ok(context, 'Ordem TER deve ser detectada');
  const terIndex = context.nativeIndex;
  assert.ok(terIndex > 0, 'deve existir evento imediatamente anterior ao TER');

  const pre = api.terminalClosureState(snapshot, terIndex - 1);
  const atTer = api.terminalClosureState(snapshot, terIndex);
  const afterTer = api.terminalClosureState(snapshot, terIndex + 1);

  assert.equal(pre.active, false, 'antes do TER o fechamento não pode ser desenhado');
  assert.equal(atTer.active, true, 'no TER o fechamento deve ficar ativo');
  assert.equal(afterTer.active, true, 'após o TER o fechamento deve permanecer ativo');

  const sbct = seed.get('SBCT');
  assert.ok(sbct, 'SBCT oficial deve existir');
  assert.equal(atTer.destination.ident, 'SBCT');
  assert.equal(Number(atTer.destination.geo.lat), Number(sbct.lat));
  assert.equal(Number(atTer.destination.geo.lon), Number(sbct.lon));
  assert.equal(Number(afterTer.destination.geo.lat), Number(atTer.destination.geo.lat));
  assert.equal(Number(afterTer.destination.geo.lon), Number(atTer.destination.geo.lon));

  const terminalSegment = [atTer.from, atTer.destination];
  assert.equal(terminalSegment.length, 2);
  assert.deepEqual(Array.from(terminalSegment, point => point.ident), ['UMGUL', 'SBCT']);
  assert.equal(atTer.from.ident, 'UMGUL');

  assert.equal(atTer.destination.terminalClosure, true);
  assert.equal(atTer.destination.derived, true);
  assert.equal(atTer.destination.untimed, true);
  assert.equal(atTer.destination.etim, '');
  assert.equal(atTer.destination.etimKey, null);
  assert.equal(atTer.destination.cfl, '');
  assert.ok(!atTer.destination.star, 'fechamento terminal não pode inventar STAR');

  const profile = api.buildMovementProfile();
  assert.ok(profile?.terminalClosure);
  assert.equal(profile.terminalClosure.nativeIndex, terIndex);
  assert.ok(profile.targets[terIndex - 1] < 1, 'pré-TER deve permanecer antes do ADES');
  assert.equal(profile.targets[terIndex], 1, 'TER deve terminar exatamente no ADES');
  assert.ok(profile.targets.slice(terIndex).every(value => value === 1), 'após TER o endpoint não pode mudar');
});
