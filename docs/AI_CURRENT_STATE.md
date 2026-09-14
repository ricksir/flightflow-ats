# FlightFlow ATS — AI Current State

> Checkpoint operacional para continuidade entre conversas.
>
> Última verificação: **14/09/2026**, após o merge do PR **#139** e conclusão verde do workflow pós-merge **#367**.

## 1. Fonte de verdade atual

- Repositório: `ricksir/flightflow-ats`.
- Branch principal: `main`.
- Último commit com alteração de produção verificado neste checkpoint:
  `fc1a99b9f1aa36e64ee456ff91f11d94924eae8c`
  — `refactor: extract normalize search text` (PR #139).
- Release estável publicada: **FlightFlow ATS v0.2.0**.
- Tag `v0.2.0` aponta exatamente para:
  `e089820456c08eb42df968faa9da59b062a32b6f`.
- A refatoração posterior à release continua no ciclo **v0.3.0**, sempre em PRs pequenos e protegidos por contrato.

Este arquivo é um checkpoint, não um substituto para o GitHub. Ao retomar o trabalho, conferir primeiro o `main`, os PRs mais recentes e os workflows. Um commit posterior exclusivamente documental pode fazer o SHA de `main` avançar sem alterar o baseline de produção abaixo.

## 2. Último ciclo concluído

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

Conforme `tests/main-kernel-contract.test.js` após o PR #139:

- **1.123.732 bytes**;
- **5.141 linhas**;
- SHA-256:
  `ce0210bf67ff0a69687ee51ab2e6e4a8e8be81f8591178025d06181552a39f2f`;
- **299 funções nomeadas** no núcleo protegido.

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

Conforme `tests/communication-context-utils-contract.test.js`:

- arquivo: `src/timeline/communication-context-utils.js`;
- **9.062 bytes**;
- SHA-256:
  `7a4c48b70057936f71119fb91e6b74408476060143d3daba807987c224243a5d`.

A API pública congelada inclui:

- `internalTransitionDetails`;
- `parseAddresses`;
- `knowledgeEntryDocumentKey`;
- `createCanonicalKnowledgeCode`;
- `createKnowledgeEntryFinder`;
- `createKnowledgeEntriesByCodeFinder`;
- `createKnowledgeDocumentLabeler`;
- `createKnowledgeCategoryLabeler`;
- `create`;
- `createAddressFormatter`;
- `createAddressDisplayFormatter`;
- `createFieldDisplayFormatter`.

### Inventário global

Após o PR #139:

- **743 declarações function nomeadas** entre o HTML e scripts locais;
- **732 nomes únicos**;
- o IIFE principal contém **299 funções nomeadas**;
- `src/core/core-utils.js` contém **12 funções nomeadas**;
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

- PR de contrato #138:
  - workflow **#363** — sucesso;
  - **46 passed**, **0 flaky**, **0 retry**, **0 `SPATIAL_EQ_DIAG`**;
  - pós-merge no `main`: workflow **#364** — sucesso;
  - pós-merge: **46 passed**, **0 flaky**, **0 retry**, **0 `SPATIAL_EQ_DIAG`**.
- PR de extração #139:
  - workflow **#365** no head antigo — **falha de contrato de alias**, sem merge;
  - correção limitada a `tests/object-path-utils-contract.test.js`;
  - novo workflow **#366** no head exato `921154a4c343dba6fbad09ba30a8ef318d706a1a` — sucesso;
  - **46 passed**, **0 flaky**, **0 retry**, **0 `SPATIAL_EQ_DIAG`**;
  - pós-merge no `main`: workflow **#367** no SHA
    `fc1a99b9f1aa36e64ee456ff91f11d94924eae8c` — sucesso;
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

O PR analítico descartável **#137** foi fechado **sem merge** depois de produzir um
remapeamento fresco sobre o `main` pós-#136. Esse ranking agora também é histórico,
porque `normalizeSearchText` já foi extraída no PR #139.

Próximo fluxo seguro:

1. confirmar que `main` ainda aponta para o estado pós-#139 ou identificar alterações posteriores;
2. após o checkpoint documental deste ciclo, remapear novamente no **`main` atual** os candidatos restantes de baixo acoplamento;
3. não considerar novamente como candidatos:
   - `knowledgeCategoryLabel`;
   - `parseAddresses`;
   - `findKnowledgeEntryByKey`;
   - `findKnowledgeEntriesByCode`;
   - `canonicalKnowledgeCode`;
   - `isLocationCode`;
   - `normalizeSearchText`;
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
