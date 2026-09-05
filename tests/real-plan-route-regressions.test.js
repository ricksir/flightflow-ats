'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');
const Parser = require(path.join(ROOT, 'src', 'parser', 'flight-parser.js'));

function loadRouteApi() {
  const modulePath = path.join(ROOT, 'src', 'route', 'route-processed-v7412.js');
  let source = fs.readFileSync(modulePath, 'utf8');
  const initTail = /if\(document\.readyState==='loading'\)document\.addEventListener\('DOMContentLoaded',\(\)=>setTimeout\(init,0\),\{once:true\}\);else setTimeout\(init,0\);/;
  assert.match(source, initTail);
  source = source.replace(initTail, 'window.FlightFlowRouteProcessedV7412=publicApi();');
  const sandbox = {
    console,
    setTimeout: () => 0,
    clearTimeout: () => {},
    setInterval: () => 0,
    clearInterval: () => {},
    fetch: async () => { throw new Error('network disabled'); },
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox, { filename: modulePath });
  return sandbox.FlightFlowRouteProcessedV7412;
}

const RouteApi = loadRouteApi();

const GLO7634_WRAPPED_ROUTE = `
*****************************************************
* HISTÓRICO DE PLANOS *
* Data: 10/07/26 Hora 00:44:43 *
* Indicativo do plano: GLO7634 Número: 299 *
* ADEP: SBBR DOF: 260709 EOBT: 1215 *
*****************************************************

############################################################

OPERAÇÃO : Criação por Mensagem Automática (TTY)

data: 09/07/2026 hora: 11:55:04 posição: SPA01 ambiente: OpA
Estado: PRE Setor anterior: NUL NUL atual: DN NUL NUL seguinte: DN NUL NUL

Indicativo       : GLO7634
Tipo de aeronave : B38M
Turbulência      : M
Velocidade       : N0465
Regra de voo     : I
Tipo de voo      : S
ADEP             : SBBR
EOBT             : 1215
ADES             : KMCO
Nível            : 340
IDPLANO          : O8LV86WS
Rota         : DCT UGUGA UM409 KIGER/N0462F360 UM409 VUMPI/N0462F360 UL795 DANVO
               /N0455F380 UL795 GELOG UL210 BORDO Y259 OCTAL DCT
`;

const EXPECTED_GLO7634_ROUTE = 'DCT UGUGA UM409 KIGER/N0462F360 UM409 VUMPI/N0462F360 UL795 DANVO /N0455F380 UL795 GELOG UL210 BORDO Y259 OCTAL DCT';

const TAM3774_MIDNIGHT_POINTS = `
*****************************************************
* HISTÓRICO DE PLANOS *
* Data: 09/07/26 Hora 02:33:08 *
* Indicativo do plano: TAM3774 Número: 853 *
* ADEP: SBBR DOF: 260708 EOBT: 2345 *
*****************************************************

############################################################

OPERAÇÃO : Criação pelo Arquivo de RPL

data: 08/07/2026 hora: 18:00:34 posição: SPA01 ambiente: OpA
Estado: INA Setor anterior: NUL NUL atual: NUL NUL seguinte: NUL NUL

Indicativo   : TAM3774
ADEP         : SBBR
ADES         : SBCT
Data do voo  : 260708
EOBT         : 2345
Nível        : F340
Rota         : KUKOL UZ5 UMGUL
IDPLANO      : FZ5SKC0O

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

const PSFBU_ID_CORRECTION = `
*****************************************************
* HISTÓRICO DE PLANOS *
* Data: 09/07/26 Hora 14:39:25 *
* Indicativo do plano: PSFBU Número: 406 *
* ADEP: SBBR DOF: 260709 EOBT: 1302 *
*****************************************************

############################################################

OPERAÇÃO : Criação por Mensagem Automática (FPL)

data: 09/07/2026 hora: 12:33:10 posição: SPA01 ambiente: OpA
Estado: INA Setor anterior: NUL NUL atual: NUL NUL seguinte: NUL NUL
Indicativo   : PSFBU
ADEP         : SBBR
ADES         : SBGO
IDPLANO     : PLFWLN9
Rota         : DCT

############################################################

OPERAÇÃO : Recepção de Mensagem ATS

data: 09/07/2026 hora: 12:33:23 posição: SPA01 ambiente: OpA
Estado: INA Setor anterior: NUL NUL atual: NUL NUL seguinte: NUL NUL
Conteúdo         :
-TITLE ACK -MSGTYP FPL -ORIGINDT 2607091233 -BEGIN ADDR -FAC SBRJZPZX -END ADDR -COMMENT AUTO -IDPLANO PLFWLN99 -BEGIN MSGSUM -ARCID PSFBU -ADEP SBBR -ADES SBGO -EOBT 1302 -EOBD 260709 -END MSGSUM
`;

test('FlightParser preserva a rota GLO7634 completa quando o histórico quebra Rota em continuação indentada', () => {
  const parsed = Parser.parseHistoryText(GLO7634_WRAPPED_ROUTE, { includeRawText: false });
  assert.equal(parsed.events[0].snapshot.route, EXPECTED_GLO7634_ROUTE);
});

test('Rota Processada preserva a mesma rota GLO7634 completa no modelo de histórico', () => {
  const history = RouteApi.parseHistory(GLO7634_WRAPPED_ROUTE, 'glo7634-app-fixture.txt');
  assert.equal(history.callsign, 'GLO7634');
  assert.equal(history.adep, 'SBBR');
  assert.equal(history.ades, 'KMCO');
  assert.equal(history.route, EXPECTED_GLO7634_ROUTE);
});

test('TAM3774 mantém 18 pontos atravessando meia-noite sem regressão temporal', () => {
  const history = RouteApi.parseHistory(TAM3774_MIDNIGHT_POINTS, 'tam3774-fixture.txt');
  assert.equal(history.snapshots.length, 1);
  const points = history.snapshots[0].points;
  assert.equal(points.length, 18);
  assert.equal(points[0].ident, 'SBBR');
  assert.equal(points.at(-1).ident, 'IMTBI');
  for (let index = 1; index < points.length; index += 1) {
    assert.ok(points[index].etimKey >= points[index - 1].etimKey, `ETIM regrediu entre ${points[index - 1].ident} e ${points[index].ident}`);
  }
  assert.ok(points[3].etimKey > points[2].etimKey, '09-00:04 deve ocorrer após 08-23:55');
});

test('TAM3774 mantém fixos distintos quando compartilham o mesmo ETIM', () => {
  const points = RouteApi.parseHistory(TAM3774_MIDNIGHT_POINTS).snapshots[0].points;
  const ids = points.map(point => point.ident);
  assert.ok(ids.indexOf('ASTOB') < ids.indexOf('VUPOG'));
  assert.equal(points.find(point => point.ident === 'ASTOB').etimKey, points.find(point => point.ident === 'VUPOG').etimKey);
  assert.ok(ids.indexOf('ISISA') < ids.indexOf('ENPEG'));
  assert.equal(points.find(point => point.ident === 'ISISA').etimKey, points.find(point => point.ident === 'ENPEG').etimKey);
});

test('PSFBU substitui IDPLANO parcial pelo identificador completo recebido posteriormente', () => {
  const parsed = Parser.parseHistoryText(PSFBU_ID_CORRECTION, { includeRawText: false });
  assert.equal(parsed.events[0].snapshot.idPlano, 'PLFWLN9');
  assert.equal(parsed.events.at(-1).snapshot.idPlano, 'PLFWLN99');
  const history = RouteApi.parseHistory(PSFBU_ID_CORRECTION);
  assert.equal(history.idPlano, 'PLFWLN99');
});
