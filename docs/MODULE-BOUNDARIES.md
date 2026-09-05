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
| `window.__SAMPLE_HISTORY__` | **externo em `src/data/sample-history.js`**; bytes e conteúdo de demonstração preservados |
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

Antes do corte, o contrato de `window.__FlightFlowFirBridge` foi congelado em Node e Chrome real. A implementação foi movida mecanicamente para `src/map/fir-layers.js`, preservando a ponte, a chave `flightflow-manual-firs-v1`, o catálogo FIR, `window.renderManualFirLayers`, listeners e inicialização. Proteções: `tests/fir-bridge.test.js` + `tests/e2e/fir-bridge.spec.js`.

### 5. Histórico de demonstração

A definição de `window.__SAMPLE_HISTORY__` foi movida para `src/data/sample-history.js` sem alterar seu conteúdo. A extração comparou o SHA-256 antes e depois do movimento e preservou exatamente:

`283887403c91163bc09206f772850754cf455ac59794ece1c0bbd7d226d9cc1d`

O fixture continua sendo uma `String.raw` contendo o histórico conhecido de TAM3542, ADEP SBBR e ADES SBGO. Os consumidores existentes de `window.__SAMPLE_HISTORY__` não foram alterados. Proteções permanentes: `tests/sample-history-module.test.js` e `tests/e2e/sample-history-module.spec.js`.

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

O próximo corte de baixo risco é:

1. `window.__FLIGHTFLOW_GEO_DATA__` → `src/data/geo-data.js`.

Depois dele, o motor de IA/governança pode receber o mesmo tratamento de contrato → extração → teste. Somente então deve começar a decomposição por domínio do IIFE principal (`timeline/`, `navigation/`, `map/`, `flightplan/`, `ats/`, `ui/`).
