# FlightFlow ATS — AI Current State

> Checkpoint operacional para continuidade entre conversas.
>
> Última verificação: **14/09/2026**, após o merge do PR **#168** e conclusão verde do workflow pós-merge **#418**.

## 1. Fonte de verdade atual

- Repositório: `ricksir/flightflow-ats`.
- Visibilidade atual: **público**.
- Branch principal: `main`.
- Último commit com alteração de produção verificado neste checkpoint:
  `6231f2b94a46a4a42ed9e0824724d44e13c087ce`
  — `refactor: extract strip cell` (PR #168).
- Release estável publicada: **FlightFlow ATS v0.2.0**.
- Tag `v0.2.0` aponta exatamente para:
  `e089820456c08eb42df968faa9da59b062a32b6f`.
- A refatoração posterior à release continua no ciclo **v0.3.0**, sempre em PRs pequenos e protegidos por contrato.

Este arquivo é um checkpoint, não um substituto para o GitHub. Ao retomar o trabalho, conferir primeiro o `main`, os PRs mais recentes e os workflows. Um commit posterior exclusivamente documental pode fazer o SHA de `main` avançar sem alterar o baseline de produção abaixo.

## 2. Último ciclo concluído

### PR #166 — remapeamento analítico descartável

O PR **#166 — `chore: fresh kernel remap after PR 165`** remapeou novamente o kernel sobre o `main` documental
`d835f56cc36572d45dbe616cbccc39ccbf935156`, já após a extração de `fieldCardMarkup`.

- head analítico: `897db339695e978c15ad2609b37766ce7ba4ab9b`;
- workflow **#414** — sucesso;
- **46 passed**, **0 flaky**, **0 retry**, **0 `SPATIAL_EQ_DIAG`**;
- PR fechado **sem merge**.

A inspeção descartou novamente fronteiras de maior acoplamento, incluindo `refreshLocalizedViews`,
`refreshFieldCards`, `clamp01`, `clamp`, `normalizeLocalityCode` e handlers de clique.
O próximo candidato limpo selecionado foi `stripCell`.

### PR #167 — congelamento de `stripCell`

O PR **#167 — `test: freeze strip cell contract`** congelou a fronteira antes da extração:

- corpo exato de **492 bytes**;
- SHA-256 `955b9c7f2e44a4d125a446c31816357fc082ac2209c691bfe5c126cd81729dd4`;
- dependências:
  - `STRIP_FIELD_DEFS`;
  - `escapeHtml`;
  - `displayValue`;
- **24 chamadas executáveis**, todas pertencentes ao único consumidor funcional `renderStrip`;
- markup, classes, marcador `updated`, fallback de título, escaping, não mutação e propagação de erros congelados;
- ausência de acoplamento direto com estado, DOM, storage, rede e núcleo temporal/espacial.

O PR foi mergeado por squash em:

`990a32354a4849f2133c87b895cc92cc277c4819`

Workflows:

- PR: **#415** — sucesso;
- pós-merge: **#416** — sucesso;
- ambos com **46 passed**, **0 flaky**, **0 retry**, **0 `SPATIAL_EQ_DIAG`**.

### PR #168 — extração de `stripCell`

O PR **#168 — `refactor: extract strip cell`** moveu mecanicamente a função para:

`src/ui/strip-cell-renderer.js`

A extração preservou:

- corpo de `stripCell`: **492 bytes**;
- SHA-256 do corpo:
  `955b9c7f2e44a4d125a446c31816357fc082ac2209c691bfe5c126cd81729dd4`;
- as **24 chamadas executáveis** dentro de `renderStrip`;
- `STRIP_FIELD_DEFS`, `escapeHtml` e `displayValue` permanecem no núcleo e são injetados explicitamente;
- 0 declarações inline de `stripCell` no IIFE principal.

Novo módulo:

- arquivo: `src/ui/strip-cell-renderer.js`;
- **1.086 bytes**;
- SHA-256:
  `a7c35321091617905045854b32c93b2623a7f548e7a302a4fb1d9c467e41c5d4`;
- 2 funções nomeadas:
  - `createStripCellRenderer`;
  - `stripCell`.

Nenhum código de rota, DEP, `goTo()`, `renderCurrent()`, planner, interpolação, mapa,
movimento, timeline, scrubber, teclado ou autoplay foi alterado.

O PR #168 foi mergeado por squash em:

`6231f2b94a46a4a42ed9e0824724d44e13c087ce`

Workflows:

- PR: **#417** — sucesso;
- pós-merge no `main`: **#418** — sucesso;
- ambos com **46 passed**, **0 flaky**, **0 retry**, **0 `SPATIAL_EQ_DIAG`**.

### PR #163 — congelamento de `fieldCardMarkup`

O PR **#163 — `test: freeze field card markup contract`** congelou a fronteira de `fieldCardMarkup` antes da extração, cobrindo:

- identidade exata de **552 bytes**;
- SHA-256 `4fc03165e4914b6b1f917826e7492019b6bee80efcbf834b8b260ad1cefcb39e`;
- dependências restritas a:
  - `getFieldLayout`;
  - `escapeHtml`;
  - `fieldEditControlsMarkup`;
- exatamente **2 consumidores executáveis** no núcleo;
- markup exato dos cards com e sem alteração;
- classe e tag `ATUALIZADO`;
- supressão do valor anterior vazio ou igual a `—`;
- preservação de `valueHtml` e `labelHtml` já preparados;
- escaping de chave e valor anterior nos pontos existentes;
- propagação de erros das dependências;
- ausência de acoplamento direto com estado, DOM, storage, rede e núcleo temporal/espacial.

O PR foi mergeado por squash em:

`387c62dccf5a0f7ebf8b25bd75f5895a9cfd5e24`

Workflows:

- PR: **#408** — sucesso;
- pós-merge: **#409** — sucesso;
- ambos com **46 passed**, **0 flaky**, **0 retry**, **0 `SPATIAL_EQ_DIAG`**.

### PR #164 — extração de `fieldCardMarkup`

O PR **#164 — `refactor: extract field card markup`** moveu mecanicamente a função para:

`src/ui/field-card-renderer.js`

A extração preservou exatamente:

- corpo congelado de **552 bytes**;
- SHA-256 `4fc03165e4914b6b1f917826e7492019b6bee80efcbf834b8b260ad1cefcb39e`;
- os **2 consumidores executáveis** no núcleo;
- `getFieldLayout`, `escapeHtml` e `fieldEditControlsMarkup` permanecem no núcleo e são injetados por
  `FieldCardRenderer.create({ getFieldLayout, escapeHtml, fieldEditControlsMarkup })`;
- 0 declarações inline de `fieldCardMarkup` no IIFE principal.

Novo módulo:

- arquivo: `src/ui/field-card-renderer.js`;
- **1.213 bytes**;
- SHA-256 `e637279721a61c4b557740f1ae8edc6da30aa3f1ab71904c82d096849688da39`;
- 2 funções nomeadas: `createFieldCardRenderer` e `fieldCardMarkup`.

Nenhum código de rota, DEP, `goTo()`, `renderCurrent()`, planner, interpolação, mapa, movimento, timeline, scrubber, teclado ou autoplay foi alterado.

O PR #164 foi mergeado por squash em:

`223ae3e7b4ec57ee60406b5ab3f802b5c76bc5c6`

Workflows:

- PR: **#410** — sucesso;
- pós-merge no `main`: **#411** — sucesso;
- ambos com **46 passed**, **0 flaky**, **0 retry**, **0 `SPATIAL_EQ_DIAG`**.

### PR #162 — remapeamento analítico descartável

O PR **#162** produziu um ranking fresco sobre o `main` pós-#161. O workflow **#407** terminou em 46/0/0/0 e o PR foi fechado sem merge. Candidatos com leitura do evento atual, handlers de clique, helpers `clamp` e fronteiras de maior alcance permaneceram fora de escopo; `fieldCardMarkup` foi selecionada como próxima fronteira limpa de UI.

### PR #159 — congelamento de `renderKnowledgeFieldLabel`

O PR **#159 — `test: freeze render knowledge field label contract`** congelou a fronteira de `renderKnowledgeFieldLabel` antes da extração, cobrindo:

- identidade exata de **491 bytes**;
- SHA-256 `ce1b96ba294b91abb5db41098c9106b57570e37560948d33c7c8cb15224e78e4`;
- dependências restritas a:
  - `KNOWLEDGE_CLICK_FIELDS`;
  - `escapeHtml`;
  - `resolveKnowledgeEntry`;
- exatamente **1 consumidor executável** no núcleo;
- fallback de label escapado para campos não clicáveis;
- fallback de label escapado quando nenhuma entrada normativa é resolvida;
- markup exato do botão normativo;
- escaping de chave, campo, código e label;
- propagação de erros das dependências;
- ausência de acoplamento com estado, DOM, storage, rede e núcleo temporal/espacial.

O PR foi mergeado por squash em:

`7bdc9ab3a7d4a29ed526d5ec5c9738d81f318279`

Workflows:

- PR: **#401** — sucesso;
- pós-merge: **#402** — sucesso;
- ambos com **46 passed**, **0 flaky**, **0 retry**, **0 `SPATIAL_EQ_DIAG`**.

### PR #160 — extração de `renderKnowledgeFieldLabel`

O PR **#160 — `refactor: extract render knowledge field label`** moveu mecanicamente a função para:

`src/knowledge/knowledge-field-label-renderer.js`

A extração preservou exatamente:

- corpo congelado de **491 bytes**;
- SHA-256 `ce1b96ba294b91abb5db41098c9106b57570e37560948d33c7c8cb15224e78e4`;
- o único consumidor executável;
- `KNOWLEDGE_CLICK_FIELDS`, `escapeHtml` e `resolveKnowledgeEntry` permanecem no núcleo e são injetados por
  `KnowledgeFieldLabelRenderer.create({ knowledgeClickFields, escapeHtml, resolveKnowledgeEntry })`;
- 0 declarações inline de `renderKnowledgeFieldLabel` no IIFE principal.

Novo módulo:

- arquivo: `src/knowledge/knowledge-field-label-renderer.js`;
- **1.338 bytes**;
- SHA-256 `92aa1e4a96b8d0fff402b0c093dd6b0d8ee49c61f37dbbe0d11bc360ded44729`;
- 2 funções nomeadas: `createKnowledgeFieldLabelRenderer` e `renderKnowledgeFieldLabel`.

Nenhum código de rota, DEP, `goTo()`, `renderCurrent()`, planner, interpolação, mapa, movimento, timeline, scrubber, teclado ou autoplay foi alterado.

O PR #160 foi mergeado por squash em:

`6af98946a0604ebe4587df4752e6fea4c66af0cd`

Workflows:

- PR: **#403** — sucesso;
- pós-merge no `main`: **#404** — sucesso;
- ambos com **46 passed**, **0 flaky**, **0 retry**, **0 `SPATIAL_EQ_DIAG`**.

### PR #158 — remapeamento analítico descartável

O PR **#158** produziu um ranking fresco sobre o `main` pós-#157 usando filtro mais rigoroso para termos sensíveis também dentro de nomes camelCase. O workflow **#400** terminou em 46/0/0/0 e o PR foi fechado sem merge. Helpers espaciais/temporais e handlers mais acoplados permaneceram fora de escopo; `renderKnowledgeFieldLabel` foi selecionada como próxima fronteira limpa.

### PR #155 — congelamento de `knowledgeEntries`

O PR **#155 — `test: freeze knowledge entries contract`** congelou a fronteira de `knowledgeEntries` antes da extração, cobrindo:

- identidade exata de **363 bytes**;
- SHA-256 `1ed0db4735547d51112af91b9a4ade803d292b2f462a33271100cfb57b869730`;
- dependências restritas às três bases normativas:
  - `CIRCEA_KNOWLEDGE`;
  - `MCA_KNOWLEDGE`;
  - `SAGITARIO_ACC_KNOWLEDGE`;
- exatamente **6 consumidores executáveis** no núcleo;
- concatenação na ordem CIRCEA → MCA → SAGITARIO;
- descarte de `entries` que não sejam arrays;
- criação de um novo array a cada chamada;
- preservação das referências rasas das entradas;
- ausência de mutação das bases;
- ausência de acoplamento com estado, DOM, storage, rede e núcleo temporal/espacial.

O PR foi mergeado por squash em:

`8f06006f2e31ec932f2431b286655a83a5fecb0b`

Workflows:

- PR: **#394** — sucesso;
- pós-merge: **#395** — sucesso;
- ambos com **46 passed**, **0 flaky**, **0 retry**, **0 `SPATIAL_EQ_DIAG`**.

### PR #156 — extração de `knowledgeEntries`

O PR **#156 — `refactor: extract knowledge entries`** moveu mecanicamente a função para:

`src/knowledge/knowledge-entries.js`

A extração preservou exatamente:

- corpo congelado de **363 bytes**;
- SHA-256 `1ed0db4735547d51112af91b9a4ade803d292b2f462a33271100cfb57b869730`;
- os **6 consumidores executáveis** no núcleo;
- as três bases continuam definidas no núcleo e são injetadas por
  `KnowledgeEntries.create({ circeaKnowledge, mcaKnowledge, sagitarioKnowledge })`;
- 0 declarações inline de `knowledgeEntries` no IIFE principal.

Novo módulo:

- arquivo: `src/knowledge/knowledge-entries.js`;
- **944 bytes**;
- SHA-256 `dc641b7824391c617e359348e01422d8fd6267db6d92c38ed0100ff63d61d0bc`;
- 2 funções nomeadas: `createKnowledgeEntries` e `knowledgeEntries`.

Nenhum código de rota, DEP, `goTo()`, `renderCurrent()`, planner, interpolação, mapa, movimento, timeline, scrubber, teclado ou autoplay foi alterado.

O PR #156 foi mergeado por squash em:

`3027e997256d3c1f30d365916a35a542a6c4adaa`

Workflows:

- PR: **#396** — sucesso;
- pós-merge no `main`: **#397** — sucesso;
- ambos com **46 passed**, **0 flaky**, **0 retry**, **0 `SPATIAL_EQ_DIAG`**.

### PR #154 — remapeamento analítico descartável

O PR **#154** produziu um ranking fresco sobre o `main` pós-#153. O workflow **#393** terminou em 46/0/0/0 e o PR foi fechado sem merge. Candidatos ligados a Google Maps, runway, ground, geometria, progresso/timeline e handlers de UI mais acoplados permaneceram fora de escopo; `knowledgeEntries` foi selecionada como próxima fronteira limpa do domínio de conhecimento.

### PR #151 — congelamento de `normalizeFieldLayout`

O PR **#151 — `test: freeze normalize field layout contract`** congelou a fronteira de `normalizeFieldLayout` antes da extração, cobrindo:

- identidade exata de **305 bytes**;
- SHA-256 `2c8020e2b246838efdd49aead1331b9167be70745f07799bb3b54623685a2eca`;
- dependência única de `FIELD_DEFS`;
- pureza e ausência de acoplamento com estado, DOM, storage, rede e núcleo temporal/espacial;
- exatamente **2 consumidores executáveis** no núcleo;
- saída limitada às chaves de `FIELD_DEFS`;
- preservação da regra de `wide`;
- coerção por `Number(span) === 2`;
- ausência de mutação da entrada;
- resultados novos em chamadas independentes.

O PR foi mergeado por squash em:

`87517a1c0015e2ce618d02a87a4b4bf2649ae2ad`

Workflows:

- PR: **#387** — sucesso;
- pós-merge: **#388** — sucesso;
- ambos com **46 passed**, **0 flaky**, **0 retry**, **0 `SPATIAL_EQ_DIAG`**.

### PR #152 — extração de `normalizeFieldLayout`

O PR **#152 — `refactor: extract normalize field layout`** moveu mecanicamente a função para:

`src/ui/field-layout-utils.js`

A extração preservou exatamente:

- corpo congelado de **305 bytes**;
- SHA-256 `2c8020e2b246838efdd49aead1331b9167be70745f07799bb3b54623685a2eca`;
- os 2 consumidores executáveis;
- `FIELD_DEFS` permanece no núcleo e é injetado por
  `FieldLayoutUtils.create({ fieldDefs: FIELD_DEFS })`;
- 0 declarações inline de `normalizeFieldLayout` no IIFE principal.

Novo módulo:

- arquivo: `src/ui/field-layout-utils.js`;
- **727 bytes**;
- SHA-256 `59e8560f2cc7407023daa9b416a57bcd6448e986628a1079c793dd079a878da8`;
- 2 funções nomeadas: `createFieldLayoutUtils` e `normalizeFieldLayout`.

Nenhum código de rota, DEP, `goTo()`, `renderCurrent()`, planner, interpolação, mapa, movimento, timeline, scrubber, teclado ou autoplay foi alterado.

O PR #152 foi mergeado por squash em:

`7848fced701764f0c6b281df064e3bc1be4864b1`

Workflows:

- PR: **#389** — sucesso;
- pós-merge no `main`: **#390** — sucesso;
- ambos com **46 passed**, **0 flaky**, **0 retry**, **0 `SPATIAL_EQ_DIAG`**.

### PR #150 — remapeamento analítico descartável

O PR **#150** produziu um ranking fresco sobre o `main` pós-#149. O workflow **#386** terminou em 46/0/0/0 e o PR foi fechado sem merge. Os candidatos ligados a Google Maps, runway, ground, geometria e progresso permaneceram fora de escopo; `normalizeFieldLayout` foi selecionada como primeira fronteira limpa de UI/configuração.

### PR #147 — congelamento de `initSourceManager`

O PR **#147 — `test: freeze init source manager contract`** congelou a fronteira de `initSourceManager` antes da extração, cobrindo:

- identidade exata de **61 bytes**;
- SHA-256 `0b4e495f5f6fb8f779c9cd0e056ed3f7f6e0bbcaf5b82500186ad34b40461a94`;
- dependência única de `renderSourceManager()`;
- ausência de acoplamento com rota, DEP, `goTo()`, mapa, movimento, timeline, scrubber, autoplay, storage, rede e DOM;
- único consumidor executável via `safeInit('gerenciador de fontes', initSourceManager)`;
- uma chamada de `renderSourceManager` por invocação;
- retorno `undefined`;
- propagação de erros sem interceptação.

O PR foi mergeado por squash em:

`97fe98f9064b3e7fd5fd822e891d5b6fe0d669db`

Workflows:

- PR: **#380** — sucesso;
- pós-merge: **#381** — sucesso;
- ambos com **46 passed**, **0 flaky**, **0 retry**, **0 `SPATIAL_EQ_DIAG`**.

### PR #148 — extração de `initSourceManager`

O PR **#148 — `refactor: extract init source manager`** moveu mecanicamente a função do IIFE principal para:

`src/ui/source-manager-controller.js`

A extração preservou exatamente:

- corpo congelado de **61 bytes**;
- SHA-256 `0b4e495f5f6fb8f779c9cd0e056ed3f7f6e0bbcaf5b82500186ad34b40461a94`;
- único consumidor executável via `safeInit`;
- `renderSourceManager` permanece no núcleo e é injetado explicitamente por
  `SourceManagerController.create({ renderSourceManager })`;
- 0 declarações inline de `initSourceManager` no IIFE principal.

Novo módulo:

- arquivo: `src/ui/source-manager-controller.js`;
- **533 bytes**;
- SHA-256 `0118b418018537dbbbdb6e8279e10858598fa4207e74ffe25b07b4033c8ff551`;
- 2 funções nomeadas: `createSourceManagerController` e `initSourceManager`.

Nenhum código de rota, DEP, `goTo()`, `renderCurrent()`, planner, interpolação, mapa, movimento, timeline, scrubber, teclado ou autoplay foi alterado.

O PR #148 foi mergeado por squash em:

`bf144ee5f9015ba0d3a38dab5b9d75b4c3c9ba70`

Workflows:

- PR: **#382** — sucesso;
- pós-merge no `main`: **#383** — sucesso;
- ambos com **46 passed**, **0 flaky**, **0 retry**, **0 `SPATIAL_EQ_DIAG`**.

### PRs analíticos descartáveis #145/#146

- PR **#145**: remapeamento fresco após o ciclo #143/#144; fechado sem merge após workflow **#378** verde em 46/0/0/0.
- PR **#146**: inspeção específica de `initSourceManager`; confirmou 61 bytes, SHA congelado, dependência única de `renderSourceManager` e ausência de tokens sensíveis; workflow **#379** verde em 46/0/0/0; fechado sem merge.

### PR #142 — congelamento de `normalizeKnowledgeText`

O PR **#142 — `test: freeze normalize knowledge text contract`** congelou a versão do kernel de `normalizeKnowledgeText` antes da extração, cobrindo:

- identidade exata de **221 bytes**;
- SHA-256 `eb60fdefec2aa5732c3a5d1ca9c74be3dad16613ab7ba0187bfb9f5216c768f2`;
- pureza e ausência de acoplamento com infraestrutura;
- exatamente **11 consumidores funcionais no núcleo**;
- normalização NFD e remoção de diacríticos;
- conversão para caixa alta;
- normalização de travessões `–` e `—` para hífen ASCII;
- preservação de hífen ASCII;
- pontuação convertida em espaços;
- compactação de espaços, tratamento de vazios e idempotência.

O PR foi mergeado por squash em:

`a8e10b8df52599f0a61c8f3a2532b670068f9835`

Workflows:

- PR: **#371** — sucesso;
- pós-merge: **#372** — sucesso;
- ambos com **46 passed**, **0 flaky**, **0 retry**, **0 `SPATIAL_EQ_DIAG`**.

### PR #143 — extração de `normalizeKnowledgeText`

O PR **#143 — `refactor: extract normalize knowledge text`** moveu mecanicamente a função do IIFE principal para:

`src/timeline/communication-context-utils.js`

O wiring atual preserva:

```js
const { normalizeKnowledgeText } = CommunicationContextUtils;
const { canonicalKnowledgeCode } =
  CommunicationContextUtils.createCanonicalKnowledgeCode({ normalizeKnowledgeText });
```

A extração preservou exatamente:

- corpo congelado de **221 bytes**;
- SHA-256 `eb60fdefec2aa5732c3a5d1ca9c74be3dad16613ab7ba0187bfb9f5216c768f2`;
- **11 consumidores funcionais no núcleo**;
- 0 declarações inline no IIFE principal;
- 1 alias explícito vindo do módulo;
- injeção explícita em `createCanonicalKnowledgeCode({ normalizeKnowledgeText })`.

Nenhum código de rota, DEP, `goTo()`, `renderCurrent()`, planner, interpolação, mapa, movimento, timeline, scrubber, teclado ou autoplay foi alterado.

O PR teve inicialmente bloqueio de infraestrutura do GitHub Actions enquanto o repositório ainda estava privado: os runs **#373** e **#374** falharam antes de qualquer step/runner. Após o repositório ser alterado para **público**, o run **#374** foi reexecutado no head exato:

`00c3e26204afc7eb2649821850adc29899cb720b`

Resultado final do PR:

- Static audit ✅
- Function declaration inventory ✅
- Timeline and route regression tests ✅
- Browser availability ✅
- UI navigation regression tests / Playwright ✅
- **46 passed (2.9m)**
- **0 flaky**
- **0 retry**
- **0 `SPATIAL_EQ_DIAG`**

O PR #143 foi mergeado por squash em:

`b9300c0f13ea0d220ff1a7bc3926a252c1a06a9d`

Pós-merge no `main`:

- workflow **#375** no SHA exato acima — sucesso;
- **46 passed (2.3m)**;
- **0 flaky**;
- **0 retry**;
- **0 `SPATIAL_EQ_DIAG`**.

### PR #138 — congelamento de `normalizeSearchText`

O PR **#138 — `test: freeze normalize search text contract`** congelou
a versão do kernel de `normalizeSearchText` antes da extração, cobrindo:

- identidade exata de **151 bytes**;
- SHA-256 `57a99fe512a7f7ffb1b25a5609ef1d377791418703ff89862b7dce8cf476422c`;
- pureza e ausência de acoplamento com estado, DOM, storage, rede, mapa, parser e navegação;
- exatamente **6 consumidores** no núcleo;
- remoção de diacríticos via NFD;
- conversão para minúsculas com locale `pt-BR`;
- preservação de pontuação, separadores e dígitos;
- tratamento de valores vazios;
- idempotência.

O inventário confirmou implementações homônimas independentes em
`src/parser/flight-parser.js` e `src/ai/ai-engine.js`; elas permaneceram fora do escopo.

### PR #139 — extração de `normalizeSearchText`

O PR **#139 — `refactor: extract normalize search text`** foi mergeado por squash.

A função saiu do IIFE principal e passou para:

`src/core/core-utils.js`

Distribuição atual:

- corpo congelado de **151 bytes** preservado byte a byte;
- SHA-256 preservado:
  `57a99fe512a7f7ffb1b25a5609ef1d377791418703ff89862b7dce8cf476422c`;
- continua com **6 consumidores funcionais no núcleo**;
- não existe mais declaração inline de `normalizeSearchText` no IIFE principal;
- `FlightFlowCoreUtils` agora exporta também `normalizeSearchText`;
- o alias explícito do kernel passou a incluir:
  `normalizeSearchText`;
- `SearchExcerpt.create({ normalizeSearchText, escapeHtml })` continua recebendo a mesma função por injeção;
- as implementações de `flight-parser.js` e `ai-engine.js` não foram alteradas.

Durante o primeiro workflow do PR, o run **#365** falhou apenas porque
`tests/object-path-utils-contract.test.js` ainda fixava literalmente a linha antiga
de aliases de `FlightFlowCoreUtils`. A lógica de produção e os testes específicos
de `normalizeSearchText` estavam verdes. O contrato foi atualizado sem relaxar
comportamento, gerando novo head e workflow **#366**, que passou integralmente.

Nenhum código de rota, DEP, `goTo()`, `renderCurrent()`, planner, interpolação,
mapa, movimento, timeline, scrubber, teclado ou autoplay foi alterado nesse ciclo.

### Ciclo anterior — PRs #134/#135

- `isLocationCode`: 101 bytes;
- SHA-256 `0d264e32e3464949d6fcd3b6db0daf0bd1d51567a158d92103ed73dff846608b`;
- 4 consumidores;
- extraída para `src/geo/locality-utils.js` por
  `FlightFlowLocalityUtils.create({ normalizeLocalityCode })`.

### Ciclo anterior — PRs #130/#131

- PR **#130** congelou `canonicalKnowledgeCode`:
  - 114 bytes;
  - SHA-256 `2758c3035fc2ce162a5470d7da91e4695f979636cae2499426ce178bd98ac229`;
  - 9 consumidores;
  - dependência única de `normalizeKnowledgeText`.
- PR **#131** extraiu a função para
  `src/timeline/communication-context-utils.js` por
  `createCanonicalKnowledgeCode({ normalizeKnowledgeText })`.

### Ciclo anterior — PRs #126/#127

- `findKnowledgeEntriesByCode`: 285 bytes, 2 consumidores;
- SHA-256 `7166b261151e266666ff3fbfb9c88f64f988eeb401b1b7cd92cd632c062564bb`;
- extraída por
  `createKnowledgeEntriesByCodeFinder({ knowledgeEntries, canonicalKnowledgeCode })`.

### Ciclo anterior — PRs #123/#124

- `findKnowledgeEntryByKey`: 117 bytes, 5 consumidores;
- extraída por `createKnowledgeEntryFinder({ knowledgeEntries })`.

### Ciclo anterior — PRs #120/#121

- `parseAddresses`: 325 bytes, 4 consumidores;
- extraída para `src/timeline/communication-context-utils.js`.

### Ciclos anteriores — PRs #117/#118 e #114/#115

- `knowledgeCategoryLabel`: 4 consumidores, sem declaração inline;
- `knowledgeEntryDocumentLabel`: 5 consumidores, sem declaração inline;
- `knowledgeEntryDocumentKey`: 1 consumidor no núcleo e 1 no módulo.

## 3. Baselines atuais protegidos

### Núcleo principal

Conforme `tests/main-kernel-contract.test.js` após o PR #168:

- **1.123.088 bytes**;
- **5.139 linhas**;
- SHA-256:
  `4bf6526598317315e55403d20cb94ba913847f8f034fa2ff40c1f9efbefafa12`;
- **292 funções nomeadas** no núcleo protegido.

### Core Utils

Conforme `tests/core-utils-contract.test.js` após o PR #139:

- arquivo: `src/core/core-utils.js`;
- **2.367 bytes**;
- SHA-256:
  `9388afc824423c8434a0b4f300412b1294df6ba28c28a33cda8d01dd4dbd4a52`;
- **12 funções nomeadas**;
- API pública congelada inclui:
  - `shortMessageType`;
  - `displayValue`;
  - `cleanDisplay`;
  - `humanize`;
  - `clone`;
  - `formatBytes`;
  - `angleDifference`;
  - `hashString`;
  - `seeded`;
  - `getPath`;
  - `setPath`;
  - `normalizeSearchText`.

`normalizeSearchText` mantém no módulo os mesmos **151 bytes** e o mesmo
SHA-256 congelado no PR #138.

### Locality Utils

Conforme `tests/location-code-contract.test.js`:

- arquivo: `src/geo/locality-utils.js`;
- **536 bytes**;
- SHA-256:
  `76ebc1bf46bd8f9e7a38e2f2b4e6228546fb8a5d5c61b4e827721c807078aa01`;
- API pública congelada:
  - `create`;
- fábrica:
  - `create({ normalizeLocalityCode })`;
- retorno congelado:
  - `isLocationCode`.

### Communication Context Utils

Conforme `tests/communication-context-utils-contract.test.js` após o PR #143:

- arquivo: `src/timeline/communication-context-utils.js`;
- **9.313 bytes**;
- SHA-256:
  `601e5280e299149b772b991550f4aaf2dc2118e44ce7aaa0ac337de3e64c3d73`;
- **22 funções nomeadas**.

A API pública congelada inclui:

- `internalTransitionDetails`;
- `parseAddresses`;
- `knowledgeEntryDocumentKey`;
- `normalizeKnowledgeText`;
- `createCanonicalKnowledgeCode`;
- `createKnowledgeEntryFinder`;
- `createKnowledgeEntriesByCodeFinder`;
- `createKnowledgeDocumentLabeler`;
- `createKnowledgeCategoryLabeler`;
- `create`;
- `createAddressFormatter`;
- `createAddressDisplayFormatter`;
- `createFieldDisplayFormatter`.

### Source Manager Controller

Conforme `tests/init-source-manager-contract.test.js` após o PR #148:

- arquivo: `src/ui/source-manager-controller.js`;
- **533 bytes**;
- SHA-256:
  `0118b418018537dbbbdb6e8279e10858598fa4207e74ffe25b07b4033c8ff551`;
- API pública congelada:
  - `create`;
- fábrica:
  - `create({ renderSourceManager })`;
- retorno congelado:
  - `initSourceManager`;
- corpo de `initSourceManager`: **61 bytes**;
- SHA-256 do corpo:
  `0b4e495f5f6fb8f779c9cd0e056ed3f7f6e0bbcaf5b82500186ad34b40461a94`.

### Field Layout Utils

Conforme `tests/normalize-field-layout-contract.test.js` após o PR #152:

- arquivo: `src/ui/field-layout-utils.js`;
- **727 bytes**;
- SHA-256:
  `59e8560f2cc7407023daa9b416a57bcd6448e986628a1079c793dd079a878da8`;
- API pública congelada:
  - `create`;
- fábrica:
  - `create({ fieldDefs })`;
- retorno congelado:
  - `normalizeFieldLayout`;
- corpo de `normalizeFieldLayout`: **305 bytes**;
- SHA-256 do corpo:
  `2c8020e2b246838efdd49aead1331b9167be70745f07799bb3b54623685a2eca`.

### Knowledge Entries

Conforme `tests/knowledge-entries-contract.test.js` após o PR #156:

- arquivo: `src/knowledge/knowledge-entries.js`;
- **944 bytes**;
- SHA-256:
  `dc641b7824391c617e359348e01422d8fd6267db6d92c38ed0100ff63d61d0bc`;
- API pública congelada:
  - `create`;
- fábrica:
  - `create({ circeaKnowledge, mcaKnowledge, sagitarioKnowledge })`;
- retorno congelado:
  - `knowledgeEntries`;
- corpo de `knowledgeEntries`: **363 bytes**;
- SHA-256 do corpo:
  `1ed0db4735547d51112af91b9a4ade803d292b2f462a33271100cfb57b869730`;
- consumidores no núcleo: **6**.

### Knowledge Field Label Renderer

Conforme `tests/render-knowledge-field-label-contract.test.js` após o PR #160:

- arquivo: `src/knowledge/knowledge-field-label-renderer.js`;
- **1.338 bytes**;
- SHA-256:
  `92aa1e4a96b8d0fff402b0c093dd6b0d8ee49c61f37dbbe0d11bc360ded44729`;
- API pública congelada:
  - `create`;
- fábrica:
  - `create({ knowledgeClickFields, escapeHtml, resolveKnowledgeEntry })`;
- retorno congelado:
  - `renderKnowledgeFieldLabel`;
- corpo de `renderKnowledgeFieldLabel`: **491 bytes**;
- SHA-256 do corpo:
  `ce1b96ba294b91abb5db41098c9106b57570e37560948d33c7c8cb15224e78e4`;
- consumidores no núcleo: **1**.

### Field Card Renderer

Conforme `tests/field-card-markup-contract.test.js` após o PR #164:

- arquivo: `src/ui/field-card-renderer.js`;
- **1.213 bytes**;
- SHA-256:
  `e637279721a61c4b557740f1ae8edc6da30aa3f1ab71904c82d096849688da39`;
- API pública congelada:
  - `create`;
- fábrica:
  - `create({ getFieldLayout, escapeHtml, fieldEditControlsMarkup })`;
- retorno congelado:
  - `fieldCardMarkup`;
- corpo de `fieldCardMarkup`: **552 bytes**;
- SHA-256 do corpo:
  `4fc03165e4914b6b1f917826e7492019b6bee80efcbf834b8b260ad1cefcb39e`;
- consumidores no núcleo: **2**.

### Strip Cell Renderer

Conforme `tests/strip-cell-contract.test.js` após o PR #168:

- arquivo: `src/ui/strip-cell-renderer.js`;
- **1.086 bytes**;
- SHA-256:
  `a7c35321091617905045854b32c93b2623a7f548e7a302a4fb1d9c467e41c5d4`;
- API pública congelada:
  - `create`;
- fábrica:
  - `create({ stripFieldDefs, escapeHtml, displayValue })`;
- retorno congelado:
  - `stripCell`;
- corpo de `stripCell`: **492 bytes**;
- SHA-256 do corpo:
  `955b9c7f2e44a4d125a446c31816357fc082ac2209c691bfe5c126cd81729dd4`;
- consumidores funcionais no núcleo:
  - `renderStrip`, com **24 chamadas executáveis**.

### Inventário global

Após o PR #168:

- **749 declarações function nomeadas** entre o HTML e scripts locais;
- **738 nomes únicos**;
- o IIFE principal contém **292 funções nomeadas**;
- `src/core/core-utils.js` contém **12 funções nomeadas**;
- `src/timeline/communication-context-utils.js` contém **22 funções nomeadas**;
- `src/ui/source-manager-controller.js` contém **2 funções nomeadas**;
- `src/ui/field-layout-utils.js` contém **2 funções nomeadas**;
- `src/ui/field-card-renderer.js` contém **2 funções nomeadas**;
- `src/ui/strip-cell-renderer.js` contém **2 funções nomeadas**;
- `src/knowledge/knowledge-entries.js` contém **2 funções nomeadas**;
- `src/knowledge/knowledge-field-label-renderer.js` contém **2 funções nomeadas**;
- `flightflow-locality-utils` continua contendo:
  - `createLocalityUtils`;
  - `isLocationCode`.

## 4. Gates de segurança obrigatórios

Nenhum PR de produção ou documentação deve ser mergeado sem todos os gates verdes:

1. **Static audit**;
2. **Function declaration inventory**;
3. **Timeline and route regression tests / Node**;
4. **Browser availability**;
5. **UI navigation regression tests / Playwright**.

Referência do último ciclo:

- remapeamento descartável #166:
  - workflow **#414** no head exato `897db339695e978c15ad2609b37766ce7ba4ab9b` — sucesso;
  - **46 passed**, **0 flaky**, **0 retry**, **0 `SPATIAL_EQ_DIAG`**;
  - fechado sem merge.
- PR de contrato #167:
  - workflow **#415** no head exato `c441f2cb416d51b90afee74f9bc278b857449bd1` — sucesso;
  - pós-merge: workflow **#416** no SHA `990a32354a4849f2133c87b895cc92cc277c4819` — sucesso;
  - ambos em **46/0/0/0**.
- PR de extração #168:
  - workflow **#417** no head exato `4d87f65a9012673a50c416f170416042af83965d` — sucesso;
  - pós-merge: workflow **#418** no SHA `6231f2b94a46a4a42ed9e0824724d44e13c087ce` — sucesso;
  - ambos em **46/0/0/0**.

Só fazer merge depois de conferir o workflow correspondente ao **SHA atual do head do PR**. Nunca confiar em workflow de SHA antigo.

## 5. Invariantes funcionais que não podem regredir

A fidelidade temporal e espacial continua sendo requisito inegociável:

- não pular fixos;
- aeronave exatamente sobre os fixos;
- preservar ordem e horários dos checkpoints;
- DEP continua sendo a referência temporal;
- Próximo, Anterior, timeline, scrubber, teclado e autoplay devem permanecer equivalentes;
- o retrocesso deve percorrer os mesmos fixos em ordem inversa;
- não alterar `goTo()`, planner, movimento, rota processada ou interpolação sem cobertura dedicada.

Regressão histórica mais sensível, já protegida:

`PADIL → IRISO → LIBEC → EGDOD → IBGAM → PMS → ILVES → MASVA`

Também preservar:

- `ILVES 01:34` antes de `MASVA 01:36`;
- retrocesso 79 → 78 pelos mesmos fixos em ordem inversa;
- aeronave renderizada sobre o fixo esperado.

## 6. Ponto exato para continuar

O ciclo `stripCell` está concluído em produção e validado no SHA
`6231f2b94a46a4a42ed9e0824724d44e13c087ce`.

**Não reutilizar o ranking do PR #166**, porque o kernel mudou com a extração do PR #168.

Próximo fluxo seguro:

1. mergear este checkpoint documental somente com todos os gates verdes;
2. validar novamente o workflow `push` no SHA documental resultante de `main`;
3. criar um **novo remapeamento fresco e descartável** sobre esse `main`;
4. manter fora da seleção todas as fronteiras já extraídas, incluindo:
   - `knowledgeCategoryLabel`;
   - `parseAddresses`;
   - `findKnowledgeEntryByKey`;
   - `findKnowledgeEntriesByCode`;
   - `knowledgeEntryDocumentLabel`;
   - `knowledgeEntryDocumentKey`;
   - `canonicalKnowledgeCode`;
   - `isLocationCode`;
   - `normalizeSearchText`;
   - `normalizeKnowledgeText`;
   - `initSourceManager`;
   - `normalizeFieldLayout`;
   - `knowledgeEntries`;
   - `renderKnowledgeFieldLabel`;
   - `fieldCardMarkup`;
   - `stripCell`;
5. excluir novamente candidatos ligados a `goTo`, rota, DEP, timeline, scrubber, autoplay,
   planner, interpolação, mapa, movimento, geometria e outras fronteiras de alto blast radius;
6. inspecionar manualmente o melhor candidato restante;
7. abrir primeiro PR **somente de contrato**;
8. validar no SHA exato e exigir **46 passed / 0 flaky / 0 retry / 0 `SPATIAL_EQ_DIAG`**;
9. só depois iniciar a extração mecânica em PR separado.

Regra central:
**remapeamento fresco → inspeção → contrato → gates verdes → merge do contrato → pós-merge verde → extração mecânica → gates verdes → merge → pós-merge verde → documentação → gates verdes → merge → pós-merge verde → novo remapeamento fresco**.

## 7. Documentos históricos

`docs/ROADMAP.md` e `docs/MODULE-BOUNDARIES.md` contêm contexto útil, mas várias métricas registradas neles são históricas.

Para números atuais do kernel/módulos, priorizar:

1. contratos em `tests/*-contract.test.js`;
2. estado real do `main`;
3. workflows do GitHub Actions;
4. este checkpoint, desde que validado contra os itens acima.

## 8. Protocolo para uma nova conversa

Ao receber uma solicitação para “continuar o FlightFlow ATS”:

1. ler este arquivo;
2. consultar `main`, PRs recentes e workflows;
3. comparar o SHA/estado atual com este checkpoint;
4. se houver divergência, usar o GitHub atual como fonte de verdade;
5. continuar do primeiro passo ainda não concluído;
6. nunca pular os gates;
7. nunca fazer merge com workflow pendente, falho ou associado a SHA antigo.
