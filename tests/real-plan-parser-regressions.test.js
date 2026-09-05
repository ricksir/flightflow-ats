'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const Parser = require(path.resolve(__dirname, '..', 'src', 'parser', 'flight-parser.js'));

// Fixtures mínimas derivadas de históricos reais fornecidos para regressão.
// Mantêm somente a estrutura necessária para reproduzir os casos; os arquivos brutos não são versionados.

const GLO1762_MULTIROW_POINTS = `
*****************************************************
* HISTÓRICO DE PLANOS *
* Data: 09/07/26 Hora 03:09:11 *
* Indicativo do plano: GLO1762 Número: 627 *
* ADEP: SBBR DOF: 260709 EOBT: 0030 *
*****************************************************

############################################################

OPERAÇÃO : Criação pelo Arquivo de RPL

data: 08/07/2026 hora: 21:00:38 posição: SPA01 ambiente: OpA
Estado: INA Setor anterior: NUL NUL atual: NUL NUL seguinte: NUL NUL

Indicativo   : GLO1762
Tipo de voo : S
Regra de voo : I
Tipo de aeronave : B738
ADES        : SBMA
ADEP        : SBBR
Velocidade  : N0451
Data do voo : 260709
EOBT        : 0030
Turbulência : M
Tipo de Plano : RPL
Nível       : F380
Rota         : ILKUS UZ26 ESNER MRB

PONTOS : SBBR        ESBUX       ILKUS       PADIL       1215S04814W IRISO
CFL/IFL: 380         380         380         380         380         380
ETIM   : 09-00:30    09-00:32    09-00:41    09-01:01    09-01:03    09-01:07

PONTOS : LIBEC       EGDOD       IBGAM       PMS         ILVES       MASVA
CFL/IFL: 380         380         380         380         380         380
ETIM   : 09-01:10    09-01:13    09-01:18    09-01:18    09-01:22    09-01:24
`;

const APP_DEP_TTY = `
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
Turbulência   : M
Velocidade : N0465
Regra de voo     : I
Tipo de voo   : S
ADEP             : SBBR
EOBT       : 1215
ADES             : KMCO
Nível         : 340
IDPLANO      : O8LV86WS
Rota         : DCT UGUGA UM409 KIGER/N0462F360 UM409 VUMPI/N0462F360 UL795 DANVO/N0455F380 UL795 GELOG UL210 BORDO Y259 OCTAL DCT

############################################################

OPERAÇÃO : Recepção de Mensagem DEP

data: 09/07/2026 hora: 12:27:35 posição: SPA01 ambiente: OpA
Estado: ATV Setor anterior: NUL NUL atual: DN REC NUL seguinte: DN REC NUL

Mensagem         :
Originador       : SBBRZTZX
Destinatários    : SBBRZXCS
Data de Recepção : 09/07/2026 12:27:35
Tratamento       : Tratamento executado com sucesso
Conteúdo         :
(DEPSBBR/SBBR049-GLO7634-SBBR1227-KMCO-DOF/260709)
`;

const CANCELLED_WITHOUT_DEP = `
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
Tipo de voo : G
Regra de voo : I
Tipo de aeronave : E55P
ADES        : SBGO
ADEP        : SBBR
Velocidade  : N0300
Data do voo : 260709
EOBT        : 1302
Turbulência : M
Tipo de Plano : FPL
Nível       : F140
Rota         : DCT
IDPLANO     : PLFWLN99

############################################################

OPERAÇÃO : Recepção de Mensagem CNL

data: 09/07/2026 hora: 12:48:35 posição: SPA01 ambiente: OpA
Estado: TER Setor anterior: NUL NUL atual: BR NUL NUL seguinte: NUL NUL

Mensagem         :
Originador       : SBRJZPZX
Destinatários    : SBBSZQZX
Data de Recepção : 09/07/2026 12:48:35
Tratamento       : Tratamento executado com sucesso
Conteúdo         :
(CNL-PSFBU-SBBR1302-SBGO-DOF/260709 ORGN/SBSPSIGX RMK/AD CFM IDPLANO PLFWLN99)

############################################################

OPERAÇÃO : Evento Automático de Arquivamento

data: 09/07/2026 hora: 14:39:25 posição: SPA01 ambiente: OpA
Estado: ARQ Setor anterior: NUL NUL atual: BR NUL NUL seguinte: NUL NUL
`;

test('GLO1762 preserva todas as linhas PONTOS do mesmo bloco, na ordem operacional', () => {
  const parsed = Parser.parseHistoryText(GLO1762_MULTIROW_POINTS, { includeRawText: false });
  const points = parsed.events[0].snapshot.routePoints;
  assert.deepEqual(
    points.map(row => row.point),
    ['SBBR', 'ESBUX', 'ILKUS', 'PADIL', '1215S04814W', 'IRISO', 'LIBEC', 'EGDOD', 'IBGAM', 'PMS', 'ILVES', 'MASVA']
  );
  assert.equal(points.find(row => row.point === 'IBGAM').estimate, '09-01:18');
  assert.equal(points.find(row => row.point === 'PMS').estimate, '09-01:18');
});

test('GLO1762 associa CFL/IFL a cada ponto em todas as linhas', () => {
  const parsed = Parser.parseHistoryText(GLO1762_MULTIROW_POINTS, { includeRawText: false });
  const points = parsed.events[0].snapshot.routePoints;
  assert.equal(points.length, 12);
  assert.ok(points.every(row => row.cfl === '380'), 'cada ponto deve preservar o CFL/IFL 380 do histórico');
});

test('DEP TTY de APP preserva o indicativo do plano em vez do prefixo DEPSBBR', () => {
  const parsed = Parser.parseHistoryText(APP_DEP_TTY, { includeRawText: false });
  assert.equal(parsed.meta.callsign, 'GLO7634');
  assert.equal(parsed.events.at(-1).snapshot.callsign, 'GLO7634');
  assert.equal(parsed.events.at(-1).messageType, 'DEP');
  assert.equal(parsed.events.at(-1).snapshot.adep, 'SBBR');
  assert.equal(parsed.events.at(-1).snapshot.ades, 'KMCO');
});

test('PSFBU cancelado sem DEP nunca recebe correlação de partida nem abandona a pista', () => {
  const parsed = Parser.parseHistoryText(CANCELLED_WITHOUT_DEP, { includeRawText: false });
  assert.equal(parsed.meta.callsign, 'PSFBU');
  assert.equal(parsed.events.some(event => event.messageType === 'DEP'), false);
  assert.equal(parsed.events.at(-1).snapshot.status, 'ARQUIVADO');
  assert.ok(parsed.events.every(event => event.departureCorrelationReceived === false));
  assert.ok(parsed.events.every(event => event.motionProgress <= 0.105));
});
