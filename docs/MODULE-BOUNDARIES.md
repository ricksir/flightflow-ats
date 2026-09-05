# Fronteiras atuais de módulos JavaScript

Este documento registra a decomposição gradual do `index.html`. A regra é mover uma fronteira por vez, preservar o contrato existente e validar antes de qualquer limpeza interna.

## Inventário estrutural

`python3 tools/function_inventory.py index.html --check` acompanha blocos inline e módulos JavaScript locais referenciados por `<script src="...">`.

Baseline lógica anterior às extrações:

- **8 posições/blocos de script**;
- **724 declarações `function nomeada(...)`**;
- **711 nomes únicos**;
- **11 nomes repetidos** catalogados.

Esses valores continuam sendo acompanhados mesmo quando uma fronteira sai fisicamente do HTML.

## Fronteiras atuais

| Fronteira | Situação |
|---|---|
| `FlightParser` / `window.FlightParser` | **externo em `src/parser/flight-parser.js`** |
| `window.__SAMPLE_HISTORY__` | **externo em `src/data/sample-history.js`** |
| `window.__FLIGHTFLOW_GEO_DATA__` | **externo em `src/data/geo-data.js`** |
| IIFE principal `FlightFlow ATS - TIOP Cindacta1` | ainda inline; **último grande alvo** |
| motor IA/governança | ainda inline; próximo candidato lógico |
| Secure Storage / `window.FlightFlowStorage` | **externo em `src/storage/secure-storage.js`** |
| FIR v7.3.5 / `window.renderManualFirLayers` | **externo em `src/map/fir-layers.js`** |
| Rota Processada v7.4.12 | **externo em `src/route/route-processed-v7412.js`** |

## Repetições catalogadas

`buildTimeline`, `describeEvent`, `escapeHtml`, `exportNormalized`, `getSourceClass`, `init`, `normalizeSearchText`, `openDb`, `parseHistory`, `stageForProgress` e `toast`.

O CI falha se surgir um novo nome repetido fora dessa baseline.

## Extrações concluídas

### 1. FlightParser

Movido para `src/parser/flight-parser.js` mantendo `window.FlightParser`, CommonJS, ordem de carregamento e API pública.

### 2. Rota Processada v7.4.12

Movida para `src/route/route-processed-v7412.js`, mantendo `window.FlightFlowRouteProcessedV7412`, inicialização e API. O caso 78→79 continua protegido por `tests/route-regression.test.js`.

### 3. Secure Storage

Movido para `src/storage/secure-storage.js`, mantendo `window.FlightFlowStorage`, schema, IndexedDB, snapshots, autosave, backup/restauração e hooks existentes.

### 4. FIR v7.3.5

O contrato de `window.__FlightFlowFirBridge` foi congelado antes da extração. A implementação FIR foi movida para `src/map/fir-layers.js`, preservando catálogo, storage, renderizadores, listeners e `window.renderManualFirLayers`.

### 5. Histórico de demonstração

`window.__SAMPLE_HISTORY__` foi movido para `src/data/sample-history.js`. SHA-256 preservado:

`283887403c91163bc09206f772850754cf455ac59794ece1c0bbd7d226d9cc1d`

Proteções: `tests/sample-history-module.test.js` e `tests/e2e/sample-history-module.spec.js`.

### 6. Base geográfica embutida

`window.__FLIGHTFLOW_GEO_DATA__` foi movido para `src/data/geo-data.js` sem reformatar ou regenerar a base.

- tamanho preservado: **590.457 bytes**;
- SHA-256 preservado: `4db1eea05bfab2d4dae2323c78290d854881b3f575fbf5a4e9c2d196055f0844`;
- zero funções nomeadas adicionadas/removidas;
- consumidores do objeto global não foram modificados.

Proteções permanentes: `tests/geo-data-module.test.js` e `tests/e2e/geo-data-module.spec.js`.

## Regras para os próximos PRs

1. **Não misturar extração e melhoria funcional.**
2. Diff de extração deve ser essencialmente “mover código/dados + alterar referência”.
3. `npm run audit` deve validar todos os scripts locais.
4. `npm run inventory` não pode introduzir nova repetição não catalogada.
5. Testes Node e Playwright devem permanecer verdes.
6. APIs/objetos globais existentes devem ser preservados na primeira extração.
7. Refatoração interna só ocorre em PR posterior.

## Próxima etapa

Com Parser, Sample History, Geo Data, Secure Storage, FIR e Rota Processada já isolados, o próximo candidato de baixo risco é o **motor de IA/governança**. Antes de movê-lo, deve ser criado um teste de contrato específico para suas APIs/globais e efeitos de inicialização.

Somente depois desse módulo deve começar a decomposição do IIFE principal por domínio (`timeline/`, `navigation/`, `map/`, `flightplan/`, `ats/`, `ui/`).
