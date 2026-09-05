'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const Parser = require(path.resolve(__dirname, '..', 'src', 'parser', 'flight-parser.js'));

function parse(text) {
  return Parser.parseHistoryText(text, { includeRawText: false });
}

const TAM3720_ACC = `
*****************************************************
* HISTÓRICO DE PLANOS *
* Indicativo do plano: TAM3720 Número: 831 *
* ADEP: SBBR DOF: 260709 EOBT: 1225 *
*****************************************************

############################################################
OPERAÇÃO : Criação pelo Arquivo de RPL
data: 09/07/2026 hora: 09:00:14 posição: SPA01 ambiente: OpA
Estado: INA Setor anterior: NUL NUL atual: NUL NUL seguinte: NUL NUL
Indicativo   : TAM3720
Tipo de aeronave : A321
ADEP        : SBBR
ADES        : SBCF
EOBT        : 1225
Data do voo : 260709
Nível       : F330
Rota        : GEPMO UZ35 REINA
IDPLANO     : C9Z7MG00
PONTOS : SBBR        SEMDU       1630S04732W GEPMO       ANBIR       IREGU
CFL/IFL: 330         330         330         330         330         330
ETIM   : 09-12:25    09-12:28    09-12:33    09-12:38    09-12:41    09-12:50
PONTOS : REINA       ENSIG       SBCF
CFL/IFL: 330         330         330
ETIM   : 09-12:56    09-13:05    09-13:13

############################################################
OPERAÇÃO : Recepção de Mensagem DEP
data: 09/07/2026 hora: 12:29:11 posição: SPA01 ambiente: OpA
Estado: ATV Setor anterior: NUL NUL atual: DS REC NUL seguinte: DS REC NUL
Conteúdo         :
(DEPSBBR/SBBS249-TAM3720-SBBR1229-SBCF-DOF/260709)
`;

const TAM3720_APP = `
*****************************************************
* HISTÓRICO DE PLANOS *
* Indicativo do plano: TAM3720 Número: 131 *
* ADEP: SBBR DOF: 260709 EOBT: 1225 *
*****************************************************

############################################################
OPERAÇÃO : Criação por Mensagem Automática (TTY)
data: 09/07/2026 hora: 12:05:05 posição: SPA01 ambiente: OpA
Estado: PRE Setor anterior: NUL NUL atual: DS NUL NUL seguinte: DS NUL NUL
Indicativo       : TAM3720
Tipo de aeronave : A321
ADEP             : SBBR
ADES             : SBCF
EOBT             : 1225
Nível            : 330
IDPLANO          : C9Z7MG00
Rota             : GEPMO UZ35 REINA

############################################################
OPERAÇÃO : Recepção de Mensagem DEP
data: 09/07/2026 hora: 12:29:11 posição: SPA01 ambiente: OpA
Estado: ATV Setor anterior: NUL NUL atual: DS REC NUL seguinte: DS REC NUL
Conteúdo         :
(DEPSBBR/SBBR058-TAM3720-SBBR1229-SBCF-DOF/260709)
`;

const PSFBU_ACC = `
*****************************************************
* HISTÓRICO DE PLANOS *
* Indicativo do plano: PSFBU Número: 406 *
* ADEP: SBBR DOF: 260709 EOBT: 1302 *
*****************************************************

############################################################
OPERAÇÃO : Criação por Mensagem Automática (FPL)
data: 09/07/2026 hora: 12:33:10 posição: SPA01 ambiente: OpA
Estado: INA Setor anterior: NUL NUL atual: NUL NUL seguinte: NUL NUL
Indicativo   : PSFBU
Tipo de aeronave : E55P
ADEP        : SBBR
ADES        : SBGO
EOBT        : 1302
Nível       : F140
Rota        : DCT
IDPLANO     : PLFWLN9
PONTOS : SBBR        1616S04836W SBGO
CFL/IFL: 140         140         140
ETIM   : 09-13:02    09-13:11    09-13:18

############################################################
OPERAÇÃO : Recepção de Mensagem ATS
data: 09/07/2026 hora: 12:33:23 posição: SPA01 ambiente: OpA
Estado: INA Setor anterior: NUL NUL atual: NUL NUL seguinte: NUL NUL
Conteúdo         :
-TITLE ACK -MSGTYP FPL -IDPLANO PLFWLN99 -BEGIN MSGSUM -ARCID PSFBU -ADEP SBBR -ADES SBGO -EOBT 1302 -EOBD 260709 -END MSGSUM

############################################################
OPERAÇÃO : Recepção de Mensagem CNL
data: 09/07/2026 hora: 12:48:35 posição: SPA01 ambiente: OpA
Estado: TER Setor anterior: NUL NUL atual: BR NUL NUL seguinte: NUL NUL
Conteúdo         :
(CNL-PSFBU-SBBR1302-SBGO-DOF/260709 ORGN/SBSPSIGX RMK/AD CFM IDPLANO PLFWLN99)

############################################################
OPERAÇÃO : Evento Automático de Arquivamento
data: 09/07/2026 hora: 14:39:25 posição: SPA01 ambiente: OpA
Estado: ARQ Setor anterior: NUL NUL atual: BR NUL NUL seguinte: NUL NUL
`;

const PSFBU_APP = `
*****************************************************
* HISTÓRICO DE PLANOS *
* Indicativo do plano: PSFBU Número: 117 *
* ADEP: SBBR DOF: 260709 EOBT: 1302 *
*****************************************************

############################################################
OPERAÇÃO : Criação por Mensagem Automática (TTY)
data: 09/07/2026 hora: 12:42:10 posição: SPA01 ambiente: OpA
Estado: PRE Setor anterior: NUL NUL atual: T4 NUL NUL seguinte: T4 NUL NUL
Indicativo       : PSFBU
Tipo de aeronave : E55P
ADEP             : SBBR
ADES             : SBGO
EOBT             : 1302
Nível            : 140
IDPLANO          : PLFWLN99
Rota             : DCT

############################################################
OPERAÇÃO : Recepção de Mensagem TTY CNL
data: 09/07/2026 hora: 12:48:36 posição: SPA01 ambiente: OpA
Estado: TER Setor anterior: NUL NUL atual: T4 NUL NUL seguinte: T4 NUL NUL
Conteúdo         :
(FPVD/CNL PSFBU                      SBBR      SBGO)

############################################################
OPERAÇÃO : Evento Automático de Arquivamento
data: 10/07/2026 hora: 00:48:43 posição: SPA01 ambiente: OpA
Estado: ARQ Setor anterior: NUL NUL atual: T4 NUL NUL seguinte: T4 NUL NUL
`;

test('TAM3720 ACC e APP convergem para a mesma identidade operacional', () => {
  const acc = parse(TAM3720_ACC);
  const app = parse(TAM3720_APP);
  for (const parsed of [acc, app]) {
    assert.equal(parsed.meta.callsign, 'TAM3720');
    assert.equal(parsed.meta.adep, 'SBBR');
    assert.equal(parsed.meta.ades, 'SBCF');
    assert.equal(parsed.events.at(-1).snapshot.callsign, 'TAM3720');
    assert.equal(parsed.events.at(-1).snapshot.idPlano, 'C9Z7MG00');
    assert.equal(parsed.events.at(-1).snapshot.eobt, '1229');
    assert.equal(parsed.events.at(-1).messageType, 'DEP');
  }
});

test('TAM3720 ACC mantém os 9 pontos enquanto APP não inventa quadro PONTOS ausente', () => {
  const acc = parse(TAM3720_ACC);
  const app = parse(TAM3720_APP);
  assert.deepEqual(acc.events[0].snapshot.routePoints.map(row => row.point), [
    'SBBR', 'SEMDU', '1630S04732W', 'GEPMO', 'ANBIR', 'IREGU', 'REINA', 'ENSIG', 'SBCF'
  ]);
  assert.equal(app.events[0].snapshot.routePoints, null);
});

test('PSFBU ACC e APP convergem para identidade, cancelamento e arquivamento sem DEP', () => {
  const acc = parse(PSFBU_ACC);
  const app = parse(PSFBU_APP);
  for (const parsed of [acc, app]) {
    assert.equal(parsed.meta.callsign, 'PSFBU');
    assert.equal(parsed.meta.adep, 'SBBR');
    assert.equal(parsed.meta.ades, 'SBGO');
    assert.equal(parsed.events.some(event => event.messageType === 'DEP'), false);
    assert.equal(parsed.events.at(-1).snapshot.callsign, 'PSFBU');
    assert.equal(parsed.events.at(-1).snapshot.idPlano, 'PLFWLN99');
    assert.equal(parsed.events.at(-1).snapshot.status, 'ARQUIVADO');
    assert.ok(parsed.events.every(event => event.departureCorrelationReceived === false));
    assert.ok(parsed.events.every(event => event.motionProgress <= 0.105));
  }
});

test('PSFBU ACC preserva a coordenada intermediária e APP não fabrica pontos inexistentes', () => {
  const acc = parse(PSFBU_ACC);
  const app = parse(PSFBU_APP);
  assert.deepEqual(acc.events[0].snapshot.routePoints.map(row => row.point), ['SBBR', '1616S04836W', 'SBGO']);
  assert.equal(app.events[0].snapshot.routePoints, null);
});
