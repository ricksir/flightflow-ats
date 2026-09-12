# FlightFlow ATS — AI Current State

> Checkpoint operacional para continuidade entre conversas.
>
> Última verificação: **12/09/2026**, após o merge do PR **#127** e conclusão verde do workflow pós-merge **#344**.

## 1. Fonte de verdade atual

- Repositório: `ricksir/flightflow-ats`.
- Branch principal: `main`.
- Último commit com alteração de produção verificado neste checkpoint:
  `880c99d207569af5e9fe873dc96e5304d8c665c3`
  — `refactor: extract knowledge entries by code lookup` (PR #127).
- Release estável publicada: **FlightFlow ATS v0.2.0**.
- Tag `v0.2.0` aponta exatamente para:
  `e089820456c08eb42df968faa9da59b062a32b6f`.
- A refatoração posterior à release continua no ciclo **v0.3.0**, sempre em PRs pequenos e protegidos por contrato.

Este arquivo é um checkpoint, não um substituto para o GitHub. Ao retomar o trabalho, conferir primeiro o `main`, os PRs mais recentes e os workflows. Um commit posterior exclusivamente documental pode fazer o SHA de `main` avançar sem alterar o baseline de produção acima.

## 2. Último ciclo concluído

### PR #126 — congelamento do contrato de busca por código

O PR **#126 — `test: freeze knowledge entries by code contract`** congelou
`findKnowledgeEntriesByCode` antes da extração, cobrindo:

- identidade exata de **285 bytes**;
- SHA-256 `7166b261151e266666ff3fbfb9c88f64f988eeb401b1b7cd92cd632c062564bb`;
- pureza e ausência de acoplamento de infraestrutura;
- exatamente **2 consumidores** no núcleo;
- uma única consulta a `knowledgeEntries()` por busca;
- normalização por `canonicalKnowledgeCode`;
- correspondência por código principal e aliases;
- preservação da ordem original da base;
- retorno de novo array sem mutar a base;
- fallback para lista vazia quando não há correspondência.

### PR #127 — extração de `findKnowledgeEntriesByCode`

O PR **#127 — `refactor: extract knowledge entries by code lookup`** foi mergeado por squash.

A função `findKnowledgeEntriesByCode` saiu do IIFE principal e passou para
`src/timeline/communication-context-utils.js`, encapsulada pela fábrica
`createKnowledgeEntriesByCodeFinder({ knowledgeEntries, canonicalKnowledgeCode })`.

Distribuição atual:

- `findKnowledgeEntriesByCode`: **2 consumidores no núcleo**, sem declaração inline;
- corpo congelado de 285 bytes preservado byte a byte no módulo;
- `knowledgeEntries` e `canonicalKnowledgeCode` são injetados explicitamente;
- o objeto retornado pela fábrica permanece congelado;
- os dois consumidores originais permaneceram inalterados.

Nenhum código de rota, DEP, `goTo()`, `renderCurrent()`, planner, interpolação,
mapa, movimento, timeline, scrubber, teclado ou autoplay foi alterado nesse ciclo.

### Ciclo anterior — PRs #123/#124

O PR **#123** congelou `findKnowledgeEntryByKey` e o PR **#124** fez sua
extração por meio de `createKnowledgeEntryFinder({ knowledgeEntries })`.

Distribuição atual relevante:

- `findKnowledgeEntryByKey`: **5 consumidores no núcleo**, sem declaração inline;
- corpo congelado de 117 bytes preservado no módulo.

### Ciclo anterior — PRs #120/#121

O PR **#120** congelou `parseAddresses` e o PR **#121** fez sua extração direta
para `src/timeline/communication-context-utils.js`.

Distribuição atual relevante:

- `parseAddresses`: **4 consumidores no núcleo**, sem declaração inline;
- corpo congelado de 325 bytes preservado no módulo.

### Ciclos anteriores — PRs #117/#118 e #114/#115

- `knowledgeCategoryLabel`: **4 consumidores no núcleo**, sem declaração inline,
  extraída por `createKnowledgeCategoryLabeler(...)`;
- `knowledgeEntryDocumentLabel`: **5 consumidores no núcleo**, sem declaração inline,
  extraída por `createKnowledgeDocumentLabeler(...)`;
- `knowledgeEntryDocumentKey`: **2 consumidores no total**:
  - 1 no núcleo;
  - 1 no módulo de communication context.

## 3. Baselines atuais protegidos

### Núcleo principal

Conforme `tests/main-kernel-contract.test.js` após o PR #127:

- **1.123.741 bytes**;
- **5.148 linhas**;
- SHA-256:
  `4d09a30b104bf56c49bf18606fe7c127453f39c716b79142260bc821ae7f4a9d`;
- **302 funções nomeadas** no núcleo protegido.

### Communication Context Utils

Conforme `tests/communication-context-utils-contract.test.js`:

- arquivo: `src/timeline/communication-context-utils.js`;
- **8.551 bytes**;
- SHA-256:
  `69c2761d51785ccb49547e2065ddba2fa63f0ab336c279cf324eac21ab2bfed1`.

A API pública congelada inclui:

- `internalTransitionDetails`;
- `parseAddresses`;
- `knowledgeEntryDocumentKey`;
- `createKnowledgeEntryFinder`;
- `createKnowledgeEntriesByCodeFinder`;
- `createKnowledgeDocumentLabeler`;
- `createKnowledgeCategoryLabeler`;
- `create`;
- `createAddressFormatter`;
- `createAddressDisplayFormatter`;
- `createFieldDisplayFormatter`.

## 4. Gates de segurança obrigatórios

Nenhum PR de produção pode ser mergeado sem todos os gates verdes:

1. **Static audit**;
2. **Function declaration inventory**;
3. **Timeline and route regression tests / Node**;
4. **Browser availability**;
5. **UI navigation regression tests / Playwright**.

Referência do último ciclo:

- PR de contrato #126:
  - workflow **#341** — sucesso;
  - **46 passed**, **0 flaky**, **0 retry**, **0 `SPATIAL_EQ_DIAG`**;
  - pós-merge no `main`: workflow **#342** — sucesso;
  - pós-merge: **46 passed**, **0 flaky**, **0 retry**, **0 `SPATIAL_EQ_DIAG`**.
- PR de extração #127:
  - workflow **#343** — sucesso;
  - **46 passed**, **0 flaky**, **0 retry**, **0 `SPATIAL_EQ_DIAG`**;
  - pós-merge no `main`: workflow **#344** — sucesso;
  - pós-merge: **46 passed**, **0 flaky**, **0 retry**, **0 `SPATIAL_EQ_DIAG`**.

Só fazer merge depois de conferir o workflow correspondente ao **SHA atual do head do PR**.

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

**Não iniciar outra extração a partir de uma branch antiga de análise.**

As branches `analysis/*` existentes foram criadas em estados anteriores do kernel e podem conter métricas ou rankings já superados pelos PRs recentes.

Próximo fluxo seguro:

1. confirmar que `main` ainda contém o baseline acima ou identificar alterações posteriores;
2. remapear novamente no **`main` atual** os candidatos restantes de baixo acoplamento; `knowledgeCategoryLabel`, `parseAddresses`, `findKnowledgeEntryByKey` e `findKnowledgeEntriesByCode` já foram extraídas e não devem reaparecer como candidatas;
3. escolher apenas uma fronteira pequena, sem tocar o núcleo temporal/espacial;
4. abrir primeiro um PR **somente de contrato**, congelando:
   - corpo/bytes/SHA quando aplicável;
   - consumidores;
   - comportamento;
   - pureza/acoplamentos;
5. executar todos os gates e mergear o contrato somente se estiver tudo verde;
6. abrir um segundo PR separado para a **extração mecânica**;
7. atualizar os contratos afetados sem relaxar expectativas;
8. executar todos os gates novamente;
9. somente depois do merge validar também o workflow de `main`.

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

