# Fronteiras atuais de módulos JavaScript

Este documento registra a decomposição gradual do `index.html`. A regra é mover uma fronteira por vez, preservar o contrato existente e validar antes de qualquer limpeza interna.

## Inventário estrutural

`python3 tools/function_inventory.py index.html --check` acompanha blocos inline e módulos JavaScript locais referenciados por `<script src="...">`.

Baseline lógica anterior às extrações:

- **8 posições/blocos de script**;
- **724 declarações `function nomeada(...)`**;
- **711 nomes únicos**;
- **11 nomes repetidos** catalogados.

Após a eliminação das duplicações internas byte-idênticas `buildTimeline` e `getSourceClass`, o inventário global passou para:

- **722 declarações `function nomeada(...)`**;
- **711 nomes únicos**;
- **9 nomes repetidos** entre fronteiras/módulos diferentes.

## Fronteiras atuais

| Fronteira | Situação |
|---|---|
| `FlightParser` / `window.FlightParser` | **externo em `src/parser/flight-parser.js`** |
| `window.__SAMPLE_HISTORY__` | **externo em `src/data/sample-history.js`** |
| `window.__FLIGHTFLOW_GEO_DATA__` | **externo em `src/data/geo-data.js`** |
| IIFE principal `FlightFlow ATS - TIOP Cindacta1` | ainda inline; decomposição deve ocorrer **por domínio** |
| motor IA/governança / `window.__flightflowAI` | **externo em `src/ai/ai-engine.js`** |
| Secure Storage / `window.FlightFlowStorage` | **externo em `src/storage/secure-storage.js`** |
| FIR v7.3.5 / `window.renderManualFirLayers` | **externo em `src/map/fir-layers.js`** |
| Rota Processada v7.4.12 | **externo em `src/route/route-processed-v7412.js`** |

## Repetições catalogadas

`describeEvent`, `escapeHtml`, `exportNormalized`, `init`, `normalizeSearchText`, `openDb`, `parseHistory`, `stageForProgress` e `toast`.

Esses nomes estão repetidos entre fronteiras diferentes e permanecem catalogados. O CI falha se surgir uma nova repetição fora dessa baseline.

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
- consumidores do objeto global não foram modificados.

Proteções: `tests/geo-data-module.test.js` e `tests/e2e/geo-data-module.spec.js`.

### 7. Motor de IA/governança

Antes do corte, o contrato do motor foi congelado em `tests/ai-engine-contract.test.js` e `tests/e2e/ai-engine-contract.spec.js`. O bloco foi então movido mecanicamente para `src/ai/ai-engine.js`.

Contratos preservados:

- tamanho exato: **165.965 bytes**;
- SHA-256: `304326300500423f81e250208a5c4eca839b76fb07e5c16c9fa0b30d6689bcd9`;
- `AI_ENGINE_VERSION = 1.3.2`;
- schema de modelo 1;
- chaves `flightflow-ai-governance-v1`, `flightflow-ai-audit-v1` e `flightflow-ai-settings-v1`;
- IndexedDB `FlightFlowAIBrain`, versão 1, store `manuals`;
- `window.__flightflowKnowledgeEntries`;
- `window.__flightflowAI = Object.freeze(...)`;
- listener `flightflow:history-session-reset`;
- inicialização por `DOMContentLoaded`;
- API pública com 18 métodos, incluindo `runSelfTests()`;
- self-tests internos executáveis em Chrome real.

A primeira extração não altera regras, respostas, heurísticas, base de conhecimento, persistência nem UI do motor.

### 8. Limpeza das duplicações internas do núcleo

Antes de qualquer decomposição por domínio, o contrato do IIFE principal foi congelado em Node e Chrome real. A comparação mostrou que as duas declarações de `buildTimeline` eram byte-idênticas entre si e que as duas declarações de `getSourceClass` também eram byte-idênticas.

Foram removidas somente as primeiras cópias redundantes. O núcleo passou a ter:

- **1.148.151 bytes**;
- **5.540 linhas**;
- SHA-256 `09a49e38f076badb3f1e6a72f368de3a5fc330e76b9adc93a1768eb769c7ea9e`;
- **376 funções nomeadas**;
- **376 nomes únicos**;
- **zero duplicações internas de funções nomeadas**.

`tests/main-kernel-contract.test.js` exige que `buildTimeline` e `getSourceClass` existam exatamente uma vez e que nenhuma nova duplicação interna seja introduzida.

## Regras para os próximos PRs

1. **Não misturar extração e melhoria funcional.**
2. Diff de extração deve ser essencialmente “mover código/dados + alterar referência”.
3. `npm run audit` deve validar todos os scripts locais.
4. `npm run inventory` não pode introduzir nova repetição não catalogada.
5. Testes Node e Playwright devem permanecer verdes.
6. APIs/objetos globais existentes devem ser preservados na primeira extração.
7. Refatoração interna só ocorre em PR posterior.

## Próxima etapa

O grande IIFE principal permanece inline, mas agora está protegido por contrato e sem duplicações internas. Ele **não deve ser movido inteiro**.

O próximo passo é escolher o primeiro cluster pequeno de baixa dependência, criar um teste de contrato específico para esse cluster e só então extraí-lo. A decomposição continuará por domínio (`timeline/`, `navigation/`, `map/`, `flightplan/`, `ats/`, `ui/`), priorizando fronteiras com menos estado compartilhado antes de tocar no núcleo temporal/espacial da rota e da aeronave.