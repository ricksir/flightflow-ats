# FlightFlow ATS — AI Current State

> Checkpoint operacional para continuidade entre conversas.
>
> Última verificação: **12/09/2026**, após o merge do PR **#118** e conclusão verde do workflow pós-merge **#325**.

## 1. Fonte de verdade atual

- Repositório: `ricksir/flightflow-ats`.
- Branch principal: `main`.
- Último commit com alteração de produção verificado neste checkpoint:
  `becf20008696abb0b77478ca04ed960c28d8bfe5`
  — `refactor: extract knowledge category label (#118)`.
- Release estável publicada: **FlightFlow ATS v0.2.0**.
- Tag `v0.2.0` aponta exatamente para:
  `e089820456c08eb42df968faa9da59b062a32b6f`.
- A refatoração posterior à release continua no ciclo **v0.3.0**, sempre em PRs pequenos e protegidos por contrato.

Este arquivo é um checkpoint, não um substituto para o GitHub. Ao retomar o trabalho, conferir primeiro o `main`, os PRs mais recentes e os workflows. Um commit posterior exclusivamente documental pode fazer o SHA de `main` avançar sem alterar o baseline de produção acima.

## 2. Último ciclo concluído

### PR #117 — congelamento do contrato de categoria

O PR **#117 — `test: freeze knowledge category label contract for v0.3.0`** congelou `knowledgeCategoryLabel` antes da extração, cobrindo:

- identidade exata de **119 bytes**;
- SHA-256 `40eecb777708abf7e0bfcb2a1fbb90a6672ef130ce7a443809da61ca920296c0`;
- pureza e ausência de acoplamento de infraestrutura;
- exatamente quatro consumidores;
- rótulos conhecidos;
- fallback por `humanize` exatamente uma vez.

### PR #118 — extração de categoria

O PR **#118 — `refactor: extract knowledge category label`** foi mergeado por squash.

A função `knowledgeCategoryLabel` saiu do IIFE principal e passou para
`src/timeline/communication-context-utils.js`, por meio da fábrica
`createKnowledgeCategoryLabeler(...)`.

A instanciação permanece no ponto da antiga função inline, depois da criação de
`KNOWLEDGE_CATEGORY_LABELS`, recebendo explicitamente `humanize`.

Distribuição atual:

- `knowledgeCategoryLabel`: **4 consumidores no núcleo**, sem declaração inline;
- corpo congelado de 119 bytes preservado byte a byte no módulo.

Nenhum código de rota, DEP, `goTo()`, `renderCurrent()`, planner, interpolação ou movimento foi alterado nesse ciclo.

### Ciclo anterior — PRs #114/#115

### PR #114 — congelamento do contrato

O PR **#114 — `test: freeze knowledge document label contract for v0.3.0`** congelou `knowledgeEntryDocumentLabel` antes da extração, cobrindo:

- identidade byte a byte;
- pureza e ausência de acoplamento de infraestrutura;
- exatamente cinco consumidores;
- os três rótulos normativos conhecidos;
- fallback `Base normativa ATM`;
- delegação única a `knowledgeEntryDocumentKey`;
- preservação da suíte Playwright com 46 testes.

### PR #115 — extração

O PR **#115 — `refactor: extract knowledge document label`** foi mergeado por squash.

A função `knowledgeEntryDocumentLabel` saiu do IIFE principal e passou para
`src/timeline/communication-context-utils.js`, por meio da fábrica
`createKnowledgeDocumentLabeler(...)`.

A instanciação permanece no ponto da antiga função inline, depois da criação de
`KNOWLEDGE_DOCUMENT_LABELS`. Isso é intencional: inicializar a fábrica no bloco inicial de aliases quebraria a ordem de inicialização.

Distribuição atual relevante:

- `knowledgeEntryDocumentLabel`: **5 consumidores no núcleo**, sem declaração inline;
- `knowledgeEntryDocumentKey`: **2 consumidores no total**:
  - 1 no núcleo;
  - 1 no módulo de communication context.

Nenhum código de rota, DEP, `goTo()`, `renderCurrent()`, planner ou movimento foi alterado nesse ciclo.

## 3. Baselines atuais protegidos

### Núcleo principal

Conforme `tests/main-kernel-contract.test.js` após o PR #118:

- **1.124.136 bytes**;
- **5.155 linhas**;
- SHA-256:
  `dcbd3c8c1ed36260f06fcb1031d54b1d8528da76ebf15a9cf7cb2daf1d53826c`;
- **305 funções nomeadas** no núcleo protegido.

### Communication Context Utils

Conforme `tests/communication-context-utils-contract.test.js`:

- arquivo: `src/timeline/communication-context-utils.js`;
- **6.821 bytes**;
- SHA-256:
  `647ed387c2353bd547a5b3b2730ccbe0f1d6d49b79c033a1d8c21314c9dbfb11`.

A API pública congelada inclui:

- `internalTransitionDetails`;
- `knowledgeEntryDocumentKey`;
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

- workflow do PR #118: **#324** — sucesso;
- Playwright: **46 passed**;
- **0 flaky**;
- **0 retry**;
- **0 `SPATIAL_EQ_DIAG`**;
- workflow pós-merge no `main`: **#325** — sucesso;
- pós-merge: **46 passed**, **0 flaky**, **0 retry**, **0 `SPATIAL_EQ_DIAG`**.

O PR de contrato #117 também foi validado no workflow **#322** e no pós-merge **#323**, ambos verdes.

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
2. remapear novamente no **`main` atual** os candidatos restantes de baixo acoplamento; `knowledgeCategoryLabel` já foi extraída e não deve reaparecer como candidata;
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

