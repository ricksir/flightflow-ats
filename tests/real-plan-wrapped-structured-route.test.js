'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const Parser = require(path.resolve(__dirname, '..', 'src', 'parser', 'flight-parser.js'));

const EXPECTED = 'N0465F340 DCT UGUGA UM409 KIGER/N0462F360 UM409 VUMPI/N0462F360 UL795 DANVO/N0455F380 UL795 GELOG UL210 BORDO Y259 OCTAL DCT';

const FIXTURE = `
*****************************************************
* HISTÓRICO DE PLANOS *
* Indicativo do plano: GLO7634 Número: 299 *
* ADEP: SBBR DOF: 260709 EOBT: 1215 *
*****************************************************

############################################################

OPERAÇÃO : Criação por Mensagem Automática (TTY)

data: 09/07/2026 hora: 11:55:04 posição: SPA01 ambiente: OpA
Estado: PRE Setor anterior: NUL NUL atual: DN NUL NUL seguinte: DN NUL NUL
Indicativo       : GLO7634
ADEP             : SBBR
ADES             : KMCO
IDPLANO          : O8LV86WS
Rota             : DCT UGUGA UM409 KIGER/N0462F360 UM409 VUMPI/N0462F360 UL795 DANVO
                   /N0455F380 UL795 GELOG UL210 BORDO Y259 OCTAL DCT

############################################################

OPERAÇÃO : Recepção de Mensagem INF CRP

data: 09/07/2026 hora: 12:00:35 posição: SPA01 ambiente: OpA
Estado: PRE Setor anterior: NUL NUL atual: DN NUL NUL seguinte: DN NUL NUL
Conteúdo         :
-TITLE INF
-ARCID GLO7634
-ADEP SBBR
-ADES KMCO
-ROUTE N0465F340 DCT UGUGA UM409 KIGER/N0462F360 UM409
 VUMPI/N0462F360 UL795 DANVO/N0455F380 UL795 GELOG UL210 BORDO Y259
 OCTAL DCT
-FLTRUL I
-IDPLANO O8LV86WS
`;

test('mensagem estruturada GLO7634 preserva todas as linhas de -ROUTE', () => {
  const parsed = Parser.parseHistoryText(FIXTURE, { includeRawText: false });
  assert.equal(parsed.events.length, 2);
  assert.equal(parsed.events.at(-1).snapshot.route, EXPECTED);
  assert.equal(parsed.events.at(-1).snapshot.callsign, 'GLO7634');
});
