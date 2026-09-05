# Fronteiras atuais de módulos JavaScript

Este documento registra a decomposição gradual do `index.html`. A regra é mover uma fronteira por vez, preservar o contrato existente e validar antes de qualquer limpeza interna.

## Inventário estrutural

`python3 tools/function_inventory.py index.html --check` acompanha blocos inline e módulos JavaScript locais referenciados por `<script src="...">`.

Baseline lógica anterior às extrações:

- **8 posições/blocos de script**;
- **724 declarações `function nomeada(...)`**;
- **711 nomes únicos**;
- **11 nomes repetidos** catalogados.

O inventário é um guardrail de arquitetura. Repetição de nome não é classificada automaticamente como bug porque módulos/IIFEs distintos podem reutilizar nomes legitimamente.

## Fronteiras atuais

| Fronteira | Situação |
|---|---|
| `FlightParser` / `window.FlightParser` | **externo em `src/parser/flight-parser.js`** |
| `window.__SAMPLE_HISTORY__` | ainda inline; dado de demonstração |
| `window.__FLIGHTFLOW_GEO_DATA__` | ainda inline; grande base geográfica |
| IIFE principal `FlightFlow ATS - TIOP Cindacta1` | ainda inline; **último grande alvo** |
| motor IA/governança | ainda inline |
| Secure Storage / `window.FlightFlowStorage` | **externo em `src/storage/secure-storage.js`** |
| FIR v7.3.5 / `window.renderManualFirLayers` | **externo em `src/map/fir-layers.js`** |
| Rota Processada v7.4.12 | **externo em `src/route/route-processed-v7412.js`** |

## Repetições catalogadas

- `buildTimeline`
- `describeEvent`
- `escapeHtml`
- `exportNormalized`
- `getSourceClass`
- `init`
- `normalizeSearchText`
- `openDb`
- `parseHistory`
- `stageForProgress`
- `toast`

O CI falha se surgir um novo nome repetido fora dessa baseline.

## Extrações concluídas

### 1. FlightParser

Movido para `src/parser/flight-parser.js` mantendo `window.FlightParser`, CommonJS, a ordem de carregamento e a API pública. Proteções: `tests/parser-module.test.js` + Playwright.

### 2. Rota Processada v7.4.12

Movida para `src/route/route-processed-v7412.js` mantendo `window.FlightFlowRouteProcessedV7412`, o guard de dupla inicialização, `publicApi()`, o gancho de inicialização e os comportamentos DEP/ETIM/progressão. O caso crítico 78→79 continua protegido por `tests/route-regression.test.js`.

### 3. Secure Storage

Movido para `src/storage/secure-storage.js` mantendo `window.FlightFlowStorage`, versão `FINAL-OFICIAL-SECURE-1.1`, schema 1, banco `FlightFlowSecureDB`, chaves legadas, snapshots/autosave, backup/restauração, hooks opcionais `selectFile`/`loadFile` e auto-inicialização. Proteções: `tests/storage-module.test.js` + `tests/e2e/storage-module.spec.js`.

### 4. FIR v7.3.5

Antes do corte, o contrato de `window.__FlightFlowFirBridge` foi congelado em Node e Chrome real. A ponte permanece publicada pelo IIFE principal como `Object.freeze()` com exatamente:

- `state`;
- `realMapState`;
- `normalizeLocalityCode`;
- `closeLeafletRing`;
- `sanitizeLeafletAreaPoints`;
- `projectGeo`;
- `polygonCentroid`;
- `escapeHtml`;
- `toast`.

A implementação FIR foi então movida mecanicamente para `src/map/fir-layers.js`, preservando:

- consumo e guard de `window.__FlightFlowFirBridge`;
- chave `flightflow-manual-firs-v1`;
- catálogo SBBS/SBAZ/SBCW/SBRE;
- renderização vetorial, Leaflet e Google existente;
- `window.renderManualFirLayers`;
- listener de `storage`;
- inicialização em `DOMContentLoaded`.

Proteções: `tests/fir-bridge.test.js` + `tests/e2e/fir-bridge.spec.js`.

## Regras para os próximos PRs

1. **Não misturar extração e melhoria funcional.**
2. Diff de extração deve ser essencialmente “mover código/dados + alterar referência”.
3. `npm run audit` deve validar todos os scripts locais.
4. `npm run inventory` não pode introduzir nova repetição não catalogada.
5. Testes Node devem permanecer verdes.
6. Testes Playwright devem permanecer verdes.
7. APIs/objetos globais existentes devem ser preservados na primeira extração.
8. Refatoração interna só ocorre em PR posterior.

## Próximos candidatos

Antes de dividir o IIFE principal, há duas fronteiras de risco menor que podem reduzir bastante o HTML sem tocar em lógica:

1. `window.__SAMPLE_HISTORY__` → `src/data/sample-history.js`;
2. `window.__FLIGHTFLOW_GEO_DATA__` → `src/data/geo-data.js`.

Cada base deve sair em PR separado, com teste de ordem de carregamento e equivalência do objeto global. Depois dessas duas extrações, o motor de IA/governança pode receber o mesmo tratamento de contrato → extração → teste, e somente então deve começar a decomposição por domínio do IIFE principal (`timeline/`, `navigation/`, `map/`, `flightplan/`, `ats/`, `ui/`).
