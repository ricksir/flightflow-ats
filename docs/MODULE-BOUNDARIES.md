# Fronteiras atuais de módulos JavaScript

Este documento registra a estrutura do FlightFlow durante a decomposição gradual do `index.html`. Ele não propõe uma reescrita; serve como mapa para que cada movimento de código seja pequeno, verificável e reversível.

## Inventário estrutural

A auditoria automática (`python3 tools/function_inventory.py index.html --check`) acompanha tanto os blocos inline quanto os módulos JavaScript locais referenciados por `<script src="...">`.

A baseline lógica anterior à primeira extração possuía:

- **8 posições/blocos de script**;
- **724 declarações `function nomeada(...)`**;
- **711 nomes únicos**;
- **11 nomes de função repetidos** em mais de uma declaração.

Esses números são um **guardrail de arquitetura**, não uma métrica de qualidade isolada. Uma repetição pode ser legítima quando as declarações vivem em IIFEs diferentes. O inventário segue os arquivos externos para que mover código para `src/` não reduza artificialmente a visibilidade arquitetural.

## As 8 fronteiras atuais

| Bloco/fronteira | Papel observado no código | Situação | Prioridade de extração |
|---|---|---|---|
| 1 | `FlightParser` em formato UMD (`window.FlightParser`) | **extraído para `src/parser/flight-parser.js`**; API preservada | concluída |
| 2 | `window.__SAMPLE_HISTORY__` com histórico de demonstração | dado/fixture embutido, sem funções nomeadas | posterior |
| 3 | `window.__FLIGHTFLOW_GEO_DATA__` | grande base geográfica serializada, sem funções nomeadas | posterior |
| 4 | IIFE principal da aplicação (`FlightFlow ATS - TIOP Cindacta1`) | maior núcleo: estado, UI, timeline, mapa e integrações | **por último** |
| 5 | motor de IA/governança (`AI_ENGINE_VERSION`) | IIFE relativamente independente | após módulos já isolados |
| 6 | `flightflow-secure-storage-module` / `window.FlightFlowStorage` | **extraído para `src/storage/secure-storage.js`**; IndexedDB, API e autosave preservados | concluída |
| 7 | camada FIR v7.3.5, ligada a `window.__FlightFlowFirBridge` | extensão especializada sobre a ponte do mapa | próxima |
| 8 | `flightflow-route-processed-v7412` / `window.FlightFlowRouteProcessedV7412` | **extraído para `src/route/route-processed-v7412.js`**; API e inicialização preservadas | concluída |

## Nomes repetidos catalogados

A lista abaixo é a baseline conhecida. O CI falha se surgir **um novo nome repetido não catalogado**.

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

### Como interpretar

Há dois casos diferentes que não devem ser confundidos:

1. **repetição entre módulos/IIFEs diferentes** — pode ser perfeitamente legítima, como `init` ou `openDb` em módulos especializados;
2. **repetição dentro do mesmo bloco principal** — merece inspeção prioritária, porque pode representar gerações de implementação acumuladas ou sobresposição lógica.

O inventário é propositalmente conservador: ele não chama essas ocorrências de “bugs” ou “colisões” sem análise de escopo.

## Ordem segura de modularização

### 1. FlightParser — concluído

O UMD existente foi movido para `src/parser/flight-parser.js` mantendo:

- `window.FlightParser` no navegador;
- `module.exports` para testes Node/CommonJS;
- carregamento antes do IIFE principal;
- nenhuma alteração interna das regras de parsing.

O contrato é protegido por `tests/parser-module.test.js` e pelos testes de navegador.

### 2. Rota Processada v7.4.12 — concluído

O IIFE existente foi movido para `src/route/route-processed-v7412.js` mantendo:

- o guard contra dupla inicialização `window.FlightFlowRouteProcessedV7412`;
- a versão pública `7.4.12`;
- o mesmo gancho de inicialização por `DOMContentLoaded`/`setTimeout`;
- a mesma API pública construída por `publicApi()`;
- a mesma cobertura de DEP, ETIM, progressão e do caso crítico evento 78→79.

A suíte `tests/route-regression.test.js` passou a carregar o arquivo externo diretamente no sandbox de regressão, sem alterar os fixtures nem as expectativas de rota.

### 3. Secure Storage — concluído nesta etapa

O IIFE `flightflow-secure-storage-module` foi movido para `src/storage/secure-storage.js` sem alterar a implementação interna. Foram preservados:

- `window.FlightFlowStorage`;
- `APP_VERSION = FINAL-OFICIAL-SECURE-1.1`;
- `SCHEMA_VERSION = 1` e `FlightFlowSecureDB`;
- stores, tombstones, backups, metadados e hashes;
- reconhecimento das chaves legadas de configuração, localidades, aeródromos, geodados e IA;
- autosave/snapshot por `scheduleSnapshot()` e `flush()`;
- exportação/importação/validação/restauração de backup;
- restauração de histórico por `selectFile`/`loadFile` quando esses hooks globais existem;
- auto-inicialização via `DOMContentLoaded`.

Os consumidores que aparecem antes do módulo continuam usando `window.FlightFlowStorage?.scheduleSnapshot(...)`, portanto permanecem tolerantes ao módulo ainda não ter sido carregado naquele instante. O contrato é protegido por `tests/storage-module.test.js` e por um smoke test Playwright em Chrome real.

### 4. FIR — próxima fronteira

A camada FIR depende explicitamente de `window.__FlightFlowFirBridge`. Antes do corte físico, o contrato da ponte deve ficar congelado em teste. A dependência observada inclui pelo menos:

- `state`;
- `realMapState`;
- `normalizeLocalityCode`;
- `closeLeafletRing`;
- `sanitizeLeafletAreaPoints`;
- `projectGeo`;
- `polygonCentroid`;
- `escapeHtml`;
- `toast`.

A primeira extração FIR deve apenas mover o IIFE para `src/map/fir-layers.js`, preservando a chave `flightflow-manual-firs-v1`, o catálogo FIR, `window.renderManualFirLayers` e os listeners já existentes.

### 5. IIFE principal

Somente depois das extrações de baixo risco. O bloco principal concentra responsabilidades demais para ser dividido por corte mecânico. A decomposição deve acontecer por domínio, com testes antes de cada movimento:

- `timeline/`;
- `navigation/`;
- `map/`;
- `flightplan/`;
- `ats/`;
- `ui/`;
- integrações/bridges.

## Regras para cada PR de extração

1. **Não misturar extração e melhoria funcional.**
2. O diff deve mostrar principalmente “mover código + alterar referência de carregamento”.
3. `npm run audit` deve permanecer verde e validar também módulos externos locais.
4. `npm run inventory` não pode introduzir nova repetição de nome e deve seguir módulos externos locais.
5. Os testes do núcleo devem permanecer verdes.
6. Os testes Playwright de navegação devem permanecer verdes.
7. Se um módulo já possui objeto global/API pública, o contrato externo deve ser preservado durante a primeira extração.
8. Refatorações internas ficam para um PR posterior, depois que a equivalência comportamental da extração estiver comprovada.

## Próximo candidato concreto

Depois de validar e mesclar o Secure Storage, o próximo candidato é **FIR → `src/map/fir-layers.js`**. Antes disso, deve ser criado um teste que congele o contrato de `window.__FlightFlowFirBridge` e a presença de `window.renderManualFirLayers`, evitando que a extração transforme dependências implícitas do mapa em regressões silenciosas.
