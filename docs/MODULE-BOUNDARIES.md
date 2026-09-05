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

As extrações por domínio não alteram esses totais globais: as declarações apenas mudam de fronteira.

## Fronteiras atuais

| Fronteira | Situação |
|---|---|
| `FlightParser` / `window.FlightParser` | **externo em `src/parser/flight-parser.js`** |
| `window.__SAMPLE_HISTORY__` | **externo em `src/data/sample-history.js`** |
| `window.__FLIGHTFLOW_GEO_DATA__` | **externo em `src/data/geo-data.js`** |
| utilitários puros / `window.FlightFlowCoreUtils` | **externo e expandido em `src/core/core-utils.js`** |
| tipografia pura / `window.FlightFlowTypographyUtils` | **externo em `src/ui/typography-utils.js`** |
| estado visual operacional / `window.FlightFlowOperationalStateUtils` | **externo em `src/ui/operational-state-utils.js`** |
| playback/timer / `window.FlightFlowPlaybackController` | **externo em `src/timeline/playback-controller.js`** |
| IIFE principal `FlightFlow ATS - TIOP Cindacta1` | ainda inline; decomposição continua **por domínio** |
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

### 9. Primeira extração por domínio: utilitários puros

O primeiro cluster retirado do IIFE foi escolhido por baixo acoplamento. Antes da mudança, `tests/core-utils-contract.test.js` congelou tamanho, SHA-256 e comportamento de:

- `shortMessageType`;
- `displayValue`;
- `cleanDisplay`;
- `humanize`;
- `clone`;
- `formatBytes`.

O mapeamento confirmou que essas funções não dependiam de `state`, DOM, mapa, rede, armazenamento, `FlightParser` ou timers.

A implementação foi movida mecanicamente para `src/core/core-utils.js` e publicada como `window.FlightFlowCoreUtils = Object.freeze(...)`. O IIFE principal mantém aliases locais explícitos para os mesmos seis nomes, portanto os consumidores não foram reescritos.

Contratos após a extração:

- módulo: **1.284 bytes**;
- SHA-256 do módulo: `7d1e6b33134764ea46281988e486a55e98f09a6770ab6de06778b99a97a2b289`;
- cada corpo de função preserva exatamente seu tamanho e SHA anterior;
- núcleo principal: **1.147.287 bytes** / **5.522 linhas**;
- SHA-256 do núcleo: `c76c79f1ccfd325108d9f3be56777985523d4b404b53c069050acb4c6f5c1740`;
- núcleo: **370 funções nomeadas / 370 nomes únicos / zero duplicações internas**;
- inventário global: **722 declarações / 711 nomes únicos / 9 nomes repetidos conhecidos**.

Proteções: `tests/core-utils-contract.test.js`, `tests/e2e/core-utils-module.spec.js` e `tests/main-kernel-contract.test.js`.

### 10. Segunda extração por domínio: utilitários puros de tipografia

O segundo cluster foi novamente escolhido por baixo acoplamento. Antes do corte, `tests/typography-utils-contract.test.js` congelou tamanho, SHA-256 e comportamento de:

- `normalizeFontScale`;
- `fontLayoutForScale`;
- `fontLayoutDescription`.

As três funções são matemáticas/textuais e não dependem de `state`, DOM, mapa, rede, armazenamento, `FlightParser` ou timers. `repairTypographyLayout` foi deliberadamente excluída porque manipula a UI e permanece no IIFE principal.

A implementação foi movida mecanicamente para `src/ui/typography-utils.js` e publicada como `window.FlightFlowTypographyUtils = Object.freeze(...)`. O módulo é carregado depois de `FlightFlowCoreUtils` e antes do IIFE principal. O núcleo mantém aliases locais com os nomes originais, sem reescrever os consumidores.

Contratos após a extração:

- módulo: **940 bytes**;
- SHA-256 do módulo: `15bed357076afacc2732b70d5d2f6f0f425e7d6be7d59788c811d009d94fac23`;
- cada corpo de função preserva exatamente seu tamanho e SHA anterior;
- núcleo principal: **1.146.763 bytes** / **5.506 linhas**;
- SHA-256 do núcleo: `60411ca70b0dcd32ca6abbba8a6e5fc15e83733f9b18e3622700a71c011c1f97`;
- núcleo: **367 funções nomeadas / 367 nomes únicos / zero duplicações internas**;
- inventário global: **722 declarações / 711 nomes únicos / 9 nomes repetidos conhecidos**;
- `repairTypographyLayout` permanece exatamente uma vez no IIFE principal.

Proteções: `tests/typography-utils-contract.test.js`, `tests/e2e/typography-utils-module.spec.js` e `tests/main-kernel-contract.test.js`.

### 11. Terceira extração por domínio: utilitários determinísticos do núcleo

O terceiro corte reutiliza a fronteira já existente `FlightFlowCoreUtils`; nenhum novo módulo foi criado. Antes da mudança, `tests/deterministic-core-utils-contract.test.js` congelou tamanho, SHA-256 e comportamento de:

- `angleDifference` — 89 bytes / SHA-256 `c33f42ad25fa9d352f3d38975f1d054fe026b3924bf1ac37780e11b674c5e4b2`;
- `hashString` — 141 bytes / SHA-256 `7da6f0aba25a918f031e10e8abbd2fea0c777054758b7b5b7d0edec024555a94`;
- `seeded` — 107 bytes / SHA-256 `e8a98352bd15958c19bfa524d389fa7f84ce3ab902bde82439dafee89dacfbc2`.

As três funções são determinísticas e independentes de `state`, DOM, mapa, rede, armazenamento, `FlightParser` e timers. `clamp` e `clamp01` foram deliberadamente mantidas no IIFE por possuírem muitos consumidores em movimento, zoom, rota e UI.

Os três corpos foram movidos mecanicamente para `src/core/core-utils.js`. O objeto congelado `window.FlightFlowCoreUtils` passou de seis para nove métodos, e o alias local do IIFE foi ampliado sem alterar nenhum consumidor.

Contratos após a expansão:

- `FlightFlowCoreUtils`: **1.676 bytes**;
- SHA-256 do módulo: `35779c31b4a68a25ea4d79085cbac66625d52ec95c5b051033b79d06a1782193`;
- cada corpo movido preserva exatamente o tamanho e SHA anteriores;
- núcleo principal: **1.146.463 bytes** / **5.506 linhas**;
- SHA-256 do núcleo: `5933449b1c5aebf65f71c46b48f0040ad18117abb113d936ac4d72b68d074c5b`;
- núcleo: **364 funções nomeadas / 364 nomes únicos / zero duplicações internas**;
- inventário global permanece em **722 declarações / 711 nomes únicos / 9 nomes repetidos conhecidos**;
- `clamp` e `clamp01` permanecem exatamente uma vez no IIFE.

Proteções: `tests/core-utils-contract.test.js`, `tests/deterministic-core-utils-contract.test.js`, `tests/e2e/core-utils-module.spec.js` e `tests/main-kernel-contract.test.js`.

### 12. Quarta extração por domínio: estado visual operacional

O quarto corte priorizou raio de regressão em vez de quantidade de bytes. O mapeamento comparou um cluster de coordenadas com **13 pontos consumidores** e o cluster de estado visual com apenas **4 pontos consumidores**. Foi escolhido o segundo.

Antes da mudança, o PR de contrato congelou tamanho, SHA-256 e comportamento de:

- `themeSwatch` — 330 bytes / SHA-256 `f6a08de7486f9f317f9ae48739bf130d2d3f7f07b45ab5c4f76afa609994ba52`;
- `stripTheme` — 653 bytes / SHA-256 `2dd09d6f90d269c0441ca63a5022d66a12de606235acbe8d5554ef2bf8c6f2f4`;
- `statusClass` — 413 bytes / SHA-256 `459acb249e4af18bb6973d305fbd6e43c9c558ec89452b975de71ee4d122f12e`.

As três funções não dependem de estado global, DOM, mapa, rede, armazenamento, `FlightParser` ou timers. Os corpos foram movidos mecanicamente para `src/ui/operational-state-utils.js` e publicados por `window.FlightFlowOperationalStateUtils = Object.freeze(...)`. O IIFE mantém aliases locais com os nomes originais, sem reescrever os quatro consumidores existentes.

Contratos após a extração:

- módulo: **1.554 bytes**;
- SHA-256 do módulo: `d6620a7d53a24376969e2ae33b20a84f71a02eaaa7f852d98b43416e1af9f778`;
- corpo bruto do IIFE: **1.145.319 bytes**, SHA-256 `9a84b0f527e399cfc6a9a2be1838588bc16b0fc6b05d6cf7ebfd2aa21599c1a9`;
- contrato normalizado do núcleo: **1.145.315 bytes** / **5.495 linhas**;
- SHA-256 normalizado do núcleo: `a98a94f86875d5b66c7c3e2859c6d830178e9348d0d4ac935d3c2093a3e8232f`;
- núcleo: **361 funções nomeadas / 361 nomes únicos / zero duplicações internas**;
- inventário global permanece em **722 declarações / 711 nomes únicos / 9 nomes repetidos conhecidos**;
- `index.html` passa a ter **11 blocos de script**, sendo **10 módulos locais externos**.

A extração preserva deliberadamente todo comportamento existente. Em particular, `stripTheme` atualmente classifica `INATIVO` como `theme-controlled` porque a expressão `/ATIVO/` também casa com `INATIVO`. Esse comportamento foi congelado apenas para garantir equivalência da refatoração; eventual correção pertence a um PR funcional separado.

Proteções: `tests/operational-state-utils-contract.test.js`, `tests/e2e/operational-state-utils-module.spec.js` e `tests/main-kernel-contract.test.js`.

## Regras para os próximos PRs

1. **Não misturar extração e melhoria funcional.**
2. Diff de extração deve ser essencialmente “mover código/dados + alterar referência”.
3. `npm run audit` deve validar todos os scripts locais.
4. `npm run inventory` não pode introduzir nova repetição não catalogada.
5. Testes Node e Playwright devem permanecer verdes.
6. APIs/objetos globais existentes devem ser preservados na primeira extração.
7. Refatoração interna só ocorre em PR posterior.

## Próxima etapa

O grande IIFE principal permanece inline, agora com **351 funções nomeadas** e sem duplicações internas após a primeira extração do domínio timeline/estado. Ele continua protegido por contrato e **não deve ser movido inteiro**.

O cluster de coordenadas continua sendo um candidato de baixo acoplamento, mas possui 13 consumidores e deve receber contrato próprio antes de qualquer corte. `clamp`/`clamp01` só devem sair depois de um contrato específico que cubra seus muitos consumidores. Timeline, navegação, mapa e o núcleo temporal/espacial da rota e da aeronave permanecem protegidos de refatorações amplas até que suas dependências sejam mapeadas e cobertas por testes dedicados.

### 13. Quinta extração por domínio: utilitários puros de coordenadas

Após a correção funcional isolada de `INATIVO`, o núcleo voltou ao fluxo de decomposição por baixo acoplamento. O ranking dos candidatos restantes selecionou o cluster de coordenadas por coerência de domínio e ausência de dependências de DOM, estado global, rede, armazenamento, mapa ou parser.

Antes do corte, `tests/coordinate-utils-contract.test.js` congelou tamanho, SHA-256 e comportamento de:

- `normalizeCoordinateInput` — **196 bytes** / SHA-256 `25eeb5945c7e4d2b8d6e3fcd17bce4fd78d3eb4c51e779c9f80360a26e75f528`;
- `validAerodromeCoordinate` — **192 bytes** / SHA-256 `3e113b6ba7a93eb851c5f70ad19a5aff715436c3b1804a36da4335fef87563c5`;
- `formatGeoCoord` — **135 bytes** / SHA-256 `a7219e2ed5d6939754accd2b96248cecbfc826c43bc905718d082c52ee6f963e`;
- `atsCoordinateLabel` — **141 bytes** / SHA-256 `541c59f892839907c29cbfeac7ac7256251aca2272180d83c4f3b355ecc532b6`.

Os quatro corpos, totalizando **664 bytes** e **13 pontos consumidores conhecidos**, foram movidos mecanicamente para `src/geo/coordinate-utils.js` e publicados em `window.FlightFlowCoordinateUtils = Object.freeze(...)`. O IIFE principal mantém aliases locais com os mesmos nomes, portanto os consumidores existentes não foram reescritos.

Contratos após a extração:

- módulo: **872 bytes**;
- SHA-256 do módulo: `426cfdffc6a803275e6432bea2ee28a2e2c71c6464f4e27998e668641fcd44ea`;
- corpo bruto do IIFE: **1.143.741 bytes** / SHA-256 `2a368c80164933a8c472bac330f51049b0f0f8e87755da67004d3399a7746ceb`;
- contrato normalizado do IIFE: **1.143.741 bytes / 5.460 linhas**;
- SHA-256 normalizado: `2a368c80164933a8c472bac330f51049b0f0f8e87755da67004d3399a7746ceb`;
- as quatro declarações deixam de existir inline e permanecem disponíveis pelos aliases;
- o inventário global continua protegido contra novas duplicações.

Proteções: `tests/coordinate-utils-contract.test.js`, `tests/e2e/coordinate-utils-module.spec.js`, `tests/main-kernel-contract.test.js`, auditoria estática, inventário global, regressão 78→79 e suíte Playwright/Chrome.

### 14. Sexta extração por domínio: acesso a objetos por caminho

Após comparar famílias ainda presentes no núcleo, o par `getPath`/`setPath` foi selecionado por possuir somente **483 bytes / 3 consumidores conhecidos**, sem dependências de DOM, estado global, rede, armazenamento, mapa ou parser. As famílias de geometria de solo/pista e polígonos foram adiadas por apresentarem raio de consumidores significativamente maior.

O PR de contrato congelou antes do corte:

- `getPath` — **138 bytes** / SHA-256 `247f4a3dd072d9a76e62f80d3b247d7891c65d0b4a3c2082bb4f932dd67963ea`;
- `setPath` — **345 bytes** / SHA-256 `b8e0c78106388a4ced70f669fff1012e9583f6fc1ecfff51e5b2da3a90db1c91`.

Como ambos são utilitários genéricos, a extração reutilizou a fronteira existente `src/core/core-utils.js` em vez de criar um novo script. Os dois corpos foram movidos byte a byte para `window.FlightFlowCoreUtils`, e o IIFE mantém aliases locais com os mesmos nomes; os três consumidores não foram reescritos.

Contratos após a extração:

- `FlightFlowCoreUtils`: **2.188 bytes** / SHA-256 `9c3d540e55f3332ff04a828993cef10b03fc5869529bf52ce79858f13bfaf87a`;
- corpo bruto do IIFE: **1.144.458 bytes** / SHA-256 `ea9d262b1a809711831b383b532159fe559a56fc8cbe0bf116fc86cba690d0f0`;
- contrato normalizado do IIFE: **1.144.454 bytes / 5.480 linhas**;
- SHA-256 normalizado: `2bac43822e8a24f573969d61b7b2b7c4f1cd5c5696c03bdbdd4ebcd989df9dd3`;
- **355 funções nomeadas / 355 nomes únicos / zero duplicações internas** no contrato do núcleo.

Proteções: `tests/object-path-utils-contract.test.js`, `tests/core-utils-contract.test.js`, `tests/e2e/core-utils-module.spec.js`, `tests/main-kernel-contract.test.js`, auditoria, inventário, regressão 78→79 e Playwright/Chrome.


### 15. Primeira extração de timeline/estado: controlador de playback

O domínio timeline/estado começou pela subfronteira de menor acoplamento. Antes do corte, o PR #31 congelou em Node e Chrome o comportamento de `startPlayback`, `stopPlayback`, `togglePlayback` e `scheduleNext`, incluindo reinício no primeiro evento quando Play é acionado no fim, cancelamento de timer, velocidade/ênfase ATS, piso de 350 ms e término exato no último evento.

A implementação foi movida para `src/timeline/playback-controller.js` e publicada como `window.FlightFlowPlaybackController = Object.freeze({ create })`. A fábrica recebe explicitamente `state`, um resolvedor preguiçoso do botão Play (`getPlayBtn`), `currentEvent`, `goTo`, `setTimeout` e `clearTimeout`; o módulo não importa diretamente rota processada, mapa, aeronave, storage ou parser. `goTo`, `renderCurrent`, `buildTimeline` e `enableControls` permanecem no IIFE.

Contratos após a extração:

- módulo: **2.616 bytes** / SHA-256 `b0d08389e4d333f3f2f885272d962e49544273d94a3ef95e51dcdf8f85fbe965`;
- corpo bruto do IIFE: **1.143.736 bytes** / SHA-256 `b56a79bd9b1d5cefbd795851a566fa47ebb2c13ad6a889d88d7a7c3526a3da0e`;
- contrato normalizado do IIFE: **1.143.732 bytes / 5.460 linhas**;
- SHA-256 normalizado: `c91da8d798192b0b0764a717a9dd464046810d1eac6066681d94d07f1615e41e`;
- **351 funções nomeadas / 351 nomes únicos / zero duplicações internas** no núcleo;
- inventário global permanece em **722 declarações / 711 nomes únicos / 9 repetições conhecidas**, pois a fábrica usa expressão arrow e as quatro declarações apenas mudaram de fronteira.

Proteções: `tests/playback-controller-contract.test.js`, `tests/e2e/playback-controller.spec.js`, `tests/e2e/ui-navigation.spec.js`, `tests/main-kernel-contract.test.js`, auditoria, inventário e regressão 78→79.
