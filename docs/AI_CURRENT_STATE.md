# FlightFlow ATS — AI Current State

> Checkpoint operacional para continuidade entre conversas.
>
> Última verificação: **12/09/2026**, após o merge do PR **#131** e conclusão verde do workflow pós-merge **#352**.

## 1. Fonte de verdade atual

- Repositório: `ricksir/flightflow-ats`.
- Branch principal: `main`.
- Último commit com alteração de produção verificado neste checkpoint:
  `2acd64d4e27637c39dede914471dea2bb8caff7c`
  — `refactor: extract canonical knowledge code` (PR #131).
- Release estável publicada: **FlightFlow ATS v0.2.0**.
- Tag `v0.2.0` aponta exatamente para:
  `e089820456c08eb42df968faa9da59b062a32b6f`.
- A refatoração posterior à release continua no ciclo **v0.3.0**, sempre em PRs pequenos e protegidos por contrato.

Este arquivo é um checkpoint, não um substituto para o GitHub. Ao retomar o trabalho, conferir primeiro o `main`, os PRs mais recentes e os workflows. Um commit posterior exclusivamente documental pode fazer o SHA de `main` avançar sem alterar o baseline de produção abaixo.

## 2. Último ciclo concluído

### PR #130 — congelamento de `canonicalKnowledgeCode`

O PR **#130 — `test: freeze canonical knowledge code contract`** congelou
`canonicalKnowledgeCode` antes da extração, cobrindo:

- identidade exata de **114 bytes**;
- SHA-256 `2758c3035fc2ce162a5470d7da91e4695f979636cae2499426ce178bd98ac229`;
- pureza e ausência de acoplamento de infraestrutura;
- dependência única de `normalizeKnowledgeText`;
- exatamente **9 consumidores** no núcleo;
- exatamente uma normalização por chamada;
- remoção de caracteres que não sejam `A-Z` ou `0-9` após a normalização;
- preservação da saída alfanumérica da dependência.

### PR #131 — extração de `canonicalKnowledgeCode`

O PR **#131 — `refactor: extract canonical knowledge code`** foi mergeado por squash.

A função saiu do IIFE principal e passou para
`src/timeline/communication-context-utils.js`, encapsulada pela fábrica:

`createCanonicalKnowledgeCode({ normalizeKnowledgeText })`

Distribuição atual:

- `canonicalKnowledgeCode`: **9 consumidores no núcleo**, sem declaração inline;
- corpo congelado de 114 bytes preservado byte a byte no módulo;
- `normalizeKnowledgeText` é injetada explicitamente;
- o objeto retornado pela fábrica permanece congelado;
- o wiring foi colocado no bloco inicial de `CommunicationContextUtils`, preservando a disponibilidade que antes era garantida pelo hoisting da function declaration.

Nenhum código de rota, DEP, `goTo()`, `renderCurrent()`, planner, interpolação,
mapa, movimento, timeline, scrubber, teclado ou autoplay foi alterado nesse ciclo.

### Ciclo anterior — PRs #126/#127

- PR **#126** congelou `findKnowledgeEntriesByCode`:
  - 285 bytes;
  - SHA-256 `7166b261151e266666ff3fbfb9c88f64f988eeb401b1b7cd92cd632c062564bb`;
  - 2 consumidores.
- PR **#127** extraiu a função por
  `createKnowledgeEntriesByCodeFinder({ knowledgeEntries, canonicalKnowledgeCode })`.

### Ciclo anterior — PRs #123/#124

- `findKnowledgeEntryByKey`: **5 consumidores no núcleo**, sem declaração inline;
- corpo congelado de 117 bytes preservado no módulo;
- extração por `createKnowledgeEntryFinder({ knowledgeEntries })`.

### Ciclo anterior — PRs #120/#121

- `parseAddresses`: **4 consumidores no núcleo**, sem declaração inline;
- corpo congelado de 325 bytes preservado no módulo.

### Ciclos anteriores — PRs #117/#118 e #114/#115

- `knowledgeCategoryLabel`: **4 consumidores no núcleo**, sem declaração inline,
  extraída por `createKnowledgeCategoryLabeler(...)`;
- `knowledgeEntryDocumentLabel`: **5 consumidores no núcleo**, sem declaração inline,
  extraída por `createKnowledgeDocumentLabeler(...)`;
- `knowledgeEntryDocumentKey`: 1 consumidor no núcleo e 1 no módulo.

## 3. Baselines atuais protegidos

### Núcleo principal

Conforme `tests/main-kernel-contract.test.js` após o PR #131:

- **1.123.746 bytes**;
- **5.145 linhas**;
- SHA-256:
  `46faecca9864bc9895ca1f7dd8135eb8e01304d639078580aab8d343119e9132`;
- **301 funções nomeadas** no núcleo protegido.

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

O inventário global após a extração registra **742 declarações function nomeadas** entre o HTML e os módulos locais; o núcleo principal permanece com 301.

## 4. Gates de segurança obrigatórios

Nenhum PR de produção ou documentação deve ser mergeado sem todos os gates verdes:

1. **Static audit**;
2. **Function declaration inventory**;
3. **Timeline and route regression tests / Node**;
4. **Browser availability**;
5. **UI navigation regression tests / Playwright**.

Referência do último ciclo:

- PR de contrato #130:
  - workflow **#349** — sucesso;
  - **46 passed**, **0 flaky**, **0 retry**, **0 `SPATIAL_EQ_DIAG`**;
  - pós-merge no `main`: workflow **#350** — sucesso;
  - pós-merge: **46 passed**, **0 flaky**, **0 retry**, **0 `SPATIAL_EQ_DIAG`**.
- PR de extração #131:
  - workflow **#351** — sucesso;
  - **46 passed**, **0 flaky**, **0 retry**, **0 `SPATIAL_EQ_DIAG`**;
  - pós-merge no `main`: workflow **#352** — sucesso;
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

O PR analítico descartável **#129** foi fechado sem merge após produzir o remapeamento que levou ao ciclo #130/#131.

Próximo fluxo seguro:

1. confirmar que `main` ainda contém o baseline acima ou identificar alterações posteriores;
2. remapear novamente no **`main` atual** os candidatos restantes de baixo acoplamento;
3. não considerar novamente como candidatos:
   - `knowledgeCategoryLabel`;
   - `parseAddresses`;
   - `findKnowledgeEntryByKey`;
   - `findKnowledgeEntriesByCode`;
   - `canonicalKnowledgeCode`;
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
