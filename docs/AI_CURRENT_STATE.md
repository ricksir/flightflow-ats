# FlightFlow ATS — AI Current State

> Checkpoint operacional para continuidade entre conversas.
>
> Última verificação: **14/09/2026**, após o merge do PR **#148** e conclusão verde do workflow pós-merge **#383**.

## 1. Fonte de verdade atual

- Repositório: `ricksir/flightflow-ats`.
- Visibilidade atual: **público**.
- Branch principal: `main`.
- Último commit com alteração de produção verificado neste checkpoint:
  `bf144ee5f9015ba0d3a38dab5b9d75b4c3c9ba70`
  — `refactor: extract init source manager` (PR #148).
- Release estável publicada: **FlightFlow ATS v0.2.0**.
- Tag `v0.2.0` aponta exatamente para:
  `e089820456c08eb42df968faa9da59b062a32b6f`.
- A refatoração posterior à release continua no ciclo **v0.3.0**, sempre em PRs pequenos e protegidos por contrato.

Este arquivo é um checkpoint, não um substituto para o GitHub. Ao retomar o trabalho, conferir primeiro o `main`, os PRs mais recentes e os workflows. Um commit posterior exclusivamente documental pode fazer o SHA de `main` avançar sem alterar o baseline de produção abaixo.

## 2. Último ciclo concluído

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

Conforme `tests/main-kernel-contract.test.js` após o PR #148:

- **1.123.780 bytes**;
- **5.138 linhas**;
- SHA-256:
  `4499028755b2c921c74f25568669edb1a1f141063677eb3e8287d34e5f89f907`;
- **297 funções nomeadas** no núcleo protegido.

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

### Inventário global

Após o PR #148:

- **744 declarações function nomeadas** entre o HTML e scripts locais;
- **733 nomes únicos**;
- o IIFE principal contém **297 funções nomeadas**;
- `src/core/core-utils.js` contém **12 funções nomeadas**;
- `src/timeline/communication-context-utils.js` contém **22 funções nomeadas**;
- `src/ui/source-manager-controller.js` contém **2 funções nomeadas**;
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

- PR de contrato #147:
  - workflow **#380** — sucesso;
  - **46 passed**, **0 flaky**, **0 retry**, **0 `SPATIAL_EQ_DIAG`**;
  - pós-merge no `main`: workflow **#381** no SHA
    `97fe98f9064b3e7fd5fd822e891d5b6fe0d669db` — sucesso;
  - pós-merge: **46 passed**, **0 flaky**, **0 retry**, **0 `SPATIAL_EQ_DIAG`**.
- PR de extração #148:
  - workflow **#382** no head exato
    `966fce5ac248c014f18c474ac0a63eab70f08f40` — sucesso;
  - **46 passed**, **0 flaky**, **0 retry**, **0 `SPATIAL_EQ_DIAG`**;
  - pós-merge no `main`: workflow **#383** no SHA
    `bf144ee5f9015ba0d3a38dab5b9d75b4c3c9ba70` — sucesso;
  - pós-merge: **46 passed**, **0 flaky**, **0 retry**, **0 `SPATIAL_EQ_DIAG`**.

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

**Não reutilizar rankings antigos nem branches antigas de análise.**

Os PRs analíticos descartáveis **#145** e **#146** foram fechados **sem merge**.
O #145 produziu um remapeamento fresco sobre o `main` pós-#144, e o #146 inspecionou
`initSourceManager` em detalhe. Esse ranking já é histórico porque `initSourceManager`
foi extraída no PR #148.

Próximo fluxo seguro:

1. confirmar que `main` ainda aponta para o estado pós-#148 ou identificar alterações posteriores;
2. após o checkpoint documental deste ciclo, remapear novamente no **`main` atual** os candidatos restantes de baixo acoplamento;
3. não considerar novamente como candidatos:
   - `knowledgeCategoryLabel`;
   - `parseAddresses`;
   - `findKnowledgeEntryByKey`;
   - `findKnowledgeEntriesByCode`;
   - `canonicalKnowledgeCode`;
   - `isLocationCode`;
   - `normalizeSearchText`;
   - `normalizeKnowledgeText`;
   - `initSourceManager`;
4. escolher apenas uma fronteira pequena, sem tocar o núcleo temporal/espacial;
5. abrir primeiro um PR **somente de contrato**, congelando:
   - corpo/bytes/SHA quando aplicável;
   - consumidores;
   - comportamento;
   - pureza/acoplamentos;
6. executar todos os gates e mergear o contrato somente se estiver tudo verde;
7. abrir um segundo PR separado para a **extração mecânica**;
8. atualizar os contratos afetados sem relaxar expectativas;
9. executar todos os gates novamente;
10. somente depois do merge validar também o workflow de `main`.

Regra central: **congelar contrato → merge verde → extrair → merge verde**.

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
