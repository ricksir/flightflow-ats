# FlightFlow ATS — AI Current State

> Checkpoint operacional para continuidade entre conversas.
>
> Última verificação: **12/09/2026**, após o merge do PR **#121** e conclusão verde do workflow pós-merge **#332**.

## 1. Fonte de verdade atual

- Repositório: `ricksir/flightflow-ats`.
- Branch principal: `main`.
- Último commit com alteração de produção verificado neste checkpoint:
  `bb18fe2336132080097384d33bad101f989be67d`
  — `refactor: extract parse addresses` (PR #121).
- Release estável publicada: **FlightFlow ATS v0.2.0**.
- Tag `v0.2.0` aponta exatamente para:
  `e089820456c08eb42df968faa9da59b062a32b6f`.
- A refatoração posterior à release continua no ciclo **v0.3.0**, sempre em PRs pequenos e protegidos por contrato.

Este arquivo é um checkpoint, não um substituto para o GitHub. Ao retomar o trabalho, conferir primeiro o `main`, os PRs mais recentes e os workflows. Um commit posterior exclusivamente documental pode fazer o SHA de `main` avançar sem alterar o baseline de produção acima.

## 2. Último ciclo concluído

### PR #120 — congelamento do contrato de endereçamento

O PR **#120 — `test: freeze parse addresses contract for v0.3.0`** congelou `parseAddresses` antes da extração, cobrindo:

- identidade exata de **325 bytes**;
- SHA-256 `6f1b8ab72ae94cae39a38be245f1014cb96e79449353d47ba76abb74eab4a103`;
- pureza e ausência de acoplamento de infraestrutura;
- exatamente **4 consumidores** no núcleo;
- precedência dos endereços AFTN;
- normalização para maiúsculas;
- preservação de ordem e remoção de duplicatas;
- fallback tokenizado;
- preservação de hífen;
- comportamento para entradas vazias.

### PR #121 — extração de `parseAddresses`

O PR **#121 — `refactor: extract parse addresses`** foi mergeado por squash.

A função `parseAddresses` saiu do IIFE principal e passou diretamente para
`src/timeline/communication-context-utils.js` como helper puro exportado pela
API `FlightFlowCommunicationContextUtils`.

Distribuição atual:

- `parseAddresses`: **4 consumidores no núcleo**, sem declaração inline;
- o corpo congelado de 325 bytes foi preservado byte a byte no módulo;
- o núcleo usa o alias explícito:
  `const { parseAddresses } = CommunicationContextUtils;`;
- a injeção de `parseAddresses` em `createAddressDisplayFormatter(...)` foi
  mantida, sem alteração de comportamento.

Nenhum código de rota, DEP, `goTo()`, `renderCurrent()`, planner, interpolação,
mapa ou movimento foi alterado nesse ciclo.

### Ciclo anterior — PRs #117/#118

O PR **#117** congelou `knowledgeCategoryLabel` e o PR **#118** fez sua extração
para `src/timeline/communication-context-utils.js` por meio de
`createKnowledgeCategoryLabeler(...)`.

A função permanece com **4 consumidores no núcleo**, sem declaração inline, e
seu corpo congelado de 119 bytes continua preservado no módulo.

### Ciclo anterior — PRs #114/#115

O PR **#114** congelou `knowledgeEntryDocumentLabel` e o PR **#115** fez sua
extração para o mesmo módulo por meio de `createKnowledgeDocumentLabeler(...)`.

Distribuição atual relevante:

- `knowledgeEntryDocumentLabel`: **5 consumidores no núcleo**, sem declaração inline;
- `knowledgeEntryDocumentKey`: **2 consumidores no total**:
  - 1 no núcleo;
  - 1 no módulo de communication context.

Nenhum desses ciclos alterou rota, DEP, `goTo()`, `renderCurrent()`, planner
ou movimento.

## 3. Baselines atuais protegidos

### Núcleo principal

Conforme `tests/main-kernel-contract.test.js` após o PR #121:

- **1.123.864 bytes**;
- **5.148 linhas**;
- SHA-256:
  `e107d596665b1fdfa76c4b9e3d65c477956aaa80b4b08ad87cd093cedc356b8d`;
- **304 funções nomeadas** no núcleo protegido.

### Communication Context Utils

Conforme `tests/communication-context-utils-contract.test.js`:

- arquivo: `src/timeline/communication-context-utils.js`;
- **7.168 bytes**;
- SHA-256:
  `a981b3474e82938a78851e69255a3ae726de106941bf7c999e92417ceaaa8edd`.

A API pública congelada inclui:

- `internalTransitionDetails`;
- `parseAddresses`;
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

- PR de contrato #120:
  - workflow **#329** — sucesso;
  - **46 passed**, **0 flaky**, **0 retry**, **0 `SPATIAL_EQ_DIAG`**;
  - pós-merge no `main`: workflow **#330** — sucesso;
  - pós-merge: **46 passed**, **0 flaky**, **0 retry**, **0 `SPATIAL_EQ_DIAG`**.
- PR de extração #121:
  - workflow **#331** — sucesso;
  - **46 passed**, **0 flaky**, **0 retry**, **0 `SPATIAL_EQ_DIAG`**;
  - pós-merge no `main`: workflow **#332** — sucesso;
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
2. remapear novamente no **`main` atual** os candidatos restantes de baixo acoplamento; `knowledgeCategoryLabel` e `parseAddresses` já foram extraídas e não devem reaparecer como candidatas;
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

