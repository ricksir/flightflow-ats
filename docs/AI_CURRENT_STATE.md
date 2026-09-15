# FlightFlow ATS — AI Current State

> Checkpoint operacional para continuidade entre conversas.
>
> Última verificação: **15/09/2026**, após o merge do PR **#209** e conclusão verde do workflow pós-merge **#521**.

## 1. Fonte de verdade atual

- Repositório: `ricksir/flightflow-ats`.
- Visibilidade atual: **público**.
- Branch principal: `main`.
- Último commit com alteração de produção verificado neste checkpoint:
  `98384510f1ae62ce1d33b55aee23bb80accdef7e`
  — `refactor: extract typography step controller` (PR #209).
- Release estável publicada: **FlightFlow ATS v0.2.0**.
- Tag `v0.2.0` aponta exatamente para:
  `e089820456c08eb42df968faa9da59b062a32b6f`.
- A refatoração posterior à release continua no ciclo **v0.3.0**, sempre em PRs pequenos e protegidos por contrato.

Este arquivo é um checkpoint, não um substituto para o GitHub. Ao retomar o trabalho, conferir primeiro o `main`, os PRs mais recentes e os workflows. Um commit posterior exclusivamente documental pode fazer o SHA de `main` avançar sem alterar o baseline de produção abaixo.

## 2. Último ciclo concluído

### PR #206 — checkpoint documental após `hideKnowledgePopover`

O PR **#206 — `docs: update AI current state after PR 205`** consolidou o ciclo anterior e foi mergeado por squash em:

`ce070275fad13d1c9c110441401035d110943000`

Workflows:

- PR: **#515** — sucesso;
- pós-merge: **#516** — sucesso;
- ambos com os cinco gates verdes e **46 passed / 0 flaky / 0 retry / 0 `SPATIAL_EQ_DIAG` / 0 failed**.

### PR #207 — remapeamento analítico descartável após #206

O PR **#207 — `chore: fresh kernel remap after PR 206`** recalculou o ranking do zero sobre o `main` documental `ce070275fad13d1c9c110441401035d110943000`.

Resultado:

- **0 candidatos estritamente puros**;
- melhor near-miss infra-only: `stepTypography`;
- corpo exato: **130 bytes**;
- SHA-256:
  `a9fdef5d62eea60e5f3ea207a99f78bc26f83897da68384d5ce5eedec0914afd`;
- dependência funcional única: `applyTypography`;
- leitura de estado restrita a `state.config.fontScale`;
- exatamente **2 consumidores funcionais**:
  1. botão de reduzir fonte com `stepTypography(-0.05)`;
  2. botão de aumentar fonte com `stepTypography(0.05)`;
- delegação preservada com `{ persist: true, notify: false }`;
- ausência de rota, DEP, `goTo`, `renderCurrent`, `currentEvent`, timeline, scrubber, autoplay, planner, interpolação, mapa, movimento, ground e geometria.

Head analítico final:

`1ee1b803a073eed7f1dfca2e46e1e3a209ef9a3d`

Workflow **#517** — sucesso, **46 passed / 0 flaky / 0 retry / 0 `SPATIAL_EQ_DIAG` / 0 failed**.

O PR foi fechado **sem merge**.

### PR #208 — congelamento de `stepTypography`

O PR **#208 — `test: freeze step typography contract`** congelou a fronteira antes da extração:

- corpo exato: **130 bytes**;
- SHA-256:
  `a9fdef5d62eea60e5f3ea207a99f78bc26f83897da68384d5ce5eedec0914afd`;
- exatamente **2 consumidores funcionais**;
- dependência funcional única: `applyTypography`;
- leitura de `state.config.fontScale`;
- fallback `fontScale || 1`;
- delegação com `{ persist: true, notify: false }`;
- não mutação direta e propagação de erro protegidas;
- nenhum acoplamento temporal, espacial, cartográfico, de rota ou transporte introduzido.

Head final validado:

`dd0d2792d67a8ab8aa1727ba756d55e9374d1d5f`

Merge por squash:

`e10f677fd2d9ba4a3717afb2779969417a6f82f7`

Workflows:

- PR: **#518** — sucesso, **46/0/0/0/0**;
- pós-merge: **#519** — sucesso, **46/0/0/0/0**.

### PR #209 — extração de `stepTypography`

O PR **#209 — `refactor: extract typography step controller`** moveu mecanicamente `stepTypography` do IIFE principal para:

`src/ui/typography-step-controller.js`

A extração preservou:

- corpo congelado: **130 bytes**;
- SHA-256:
  `a9fdef5d62eea60e5f3ea207a99f78bc26f83897da68384d5ce5eedec0914afd`;
- wiring explícito por
  `FlightFlowTypographyStepController.create({ state, applyTypography })`;
- dependências injetadas:
  - `state`;
  - `applyTypography`;
- API pública congelada:
  - `create`;
- retorno congelado:
  - `stepTypography`;
- 0 declarações inline de `stepTypography` no núcleo;
- os mesmos dois consumidores funcionais.

Baselines resultantes:

- kernel: **1.114.852 bytes**;
- **5.007 linhas**;
- **282 funções nomeadas**;
- SHA-256 do kernel:
  `1bf973317ac5f0447cabaf91a28a1b041ec220f62ed82b68f7a53d404396204b`;
- inventário global: **759 declarações function nomeadas / 748 nomes únicos / 9 nomes repetidos conhecidos**;
- módulo Typography Step Controller: **22 linhas / 2 funções nomeadas**.

Head final validado:

`71ed7bcdf8d2e083ea5b1df7e8ad7dc498350bfc`

Merge por squash no `main`:

`98384510f1ae62ce1d33b55aee23bb80accdef7e`

Workflows:

- PR: **#520** — sucesso, **46 passed / 0 flaky / 0 retry / 0 `SPATIAL_EQ_DIAG` / 0 failed**;
- pós-merge: **#521** — sucesso, **46 passed (3.0m) / 0 flaky / 0 retry / 0 `SPATIAL_EQ_DIAG` / 0 failed**.

Nenhum código de rota, DEP, `goTo()`, `renderCurrent()`, planner, interpolação, mapa, movimento, ground, timeline, scrubber, teclado ou autoplay foi alterado.

### PR #202 — checkpoint documental após `minimizeStrip`

O PR **#202 — `docs: update AI current state after PR 201`** consolidou o ciclo anterior e foi mergeado por squash em:

`ce2b8ae9ceb9662b33891051ff33338099d1f914`

Workflows:

- PR: **#508** — sucesso;
- pós-merge: **#509** — sucesso;
- ambos com os cinco gates verdes e **46 passed / 0 flaky / 0 retry / 0 `SPATIAL_EQ_DIAG` / 0 failed**.

### PR #203 — remapeamento analítico descartável após #202

O PR **#203 — `chore: fresh kernel remap after PR 202`** recalculou o ranking do zero sobre o `main` documental `ce2b8ae9ceb9662b33891051ff33338099d1f914`.

Resultado:

- **0 candidatos estritamente puros**;
- melhor near-miss infra-only: `hideKnowledgePopover`;
- corpo exato: **156 bytes**;
- SHA-256:
  `57adc4878279173c3b09aefef808da7eb213d614219e579479970315061003cc`;
- exatamente **2 consumidores funcionais**:
  1. handler global de `pointerdown` para clique fora do popover;
  2. `openActiveKnowledgeDetail`;
- nenhuma chamada funcional externa;
- efeitos restritos a:
  - `els.knowledgePopover.hidden = true`;
  - `state.activeKnowledgeAnchor = null`;
- retorno antecipado antes de qualquer mutação quando `els.knowledgePopover` não existe;
- ausência de rota, DEP, `goTo`, `renderCurrent`, `currentEvent`, timeline, scrubber, autoplay, planner, interpolação, mapa, movimento, ground e geometria.

Head analítico final:

`6254c5eb27dba834a586e2944ed2325850fc890d`

Workflow **#510** — sucesso, **46 passed / 0 flaky / 0 retry / 0 `SPATIAL_EQ_DIAG` / 0 failed**.

O PR foi fechado **sem merge**.

### PR #204 — congelamento de `hideKnowledgePopover`

O PR **#204 — `test: freeze hide knowledge popover contract`** congelou a fronteira antes da extração:

- corpo exato: **156 bytes**;
- SHA-256:
  `57adc4878279173c3b09aefef808da7eb213d614219e579479970315061003cc`;
- exatamente **2 consumidores funcionais**;
- retorno antecipado sem mutação quando o popover não existe;
- ordem protegida:
  1. `els.knowledgePopover.hidden = true`;
  2. `state.activeKnowledgeAnchor = null`;
- propagação de erro e estados parciais preservados conforme a ordem original;
- nenhum acoplamento temporal, espacial, cartográfico, de rota ou transporte introduzido.

Head final validado:

`a65de124f487c75349bb044dd344ed51ec917727`

Merge por squash:

`0c79643f1b6172a31e7cf6d0e2222b287f8447ef`

Workflows:

- PR: **#511** — sucesso, **46/0/0/0/0**;
- pós-merge: **#512** — sucesso, **46/0/0/0/0**.

### PR #205 — extração de `hideKnowledgePopover`

O PR **#205 — `refactor: extract knowledge popover hider`** moveu mecanicamente `hideKnowledgePopover` do IIFE principal para:

`src/knowledge/knowledge-popover-controller.js`

A extração preservou:

- corpo congelado: **156 bytes**;
- SHA-256:
  `57adc4878279173c3b09aefef808da7eb213d614219e579479970315061003cc`;
- wiring explícito por
  `FlightFlowKnowledgePopoverController.create({ els, state })`;
- dependências injetadas:
  - `els`;
  - `state`;
- API pública congelada:
  - `create`;
- retorno congelado:
  - `hideKnowledgePopover`;
- 0 declarações inline de `hideKnowledgePopover` no núcleo;
- os mesmos dois consumidores funcionais;
- estados parciais e propagação de erro mantidos pelo contrato prévio.

Baselines resultantes:

- kernel: **1.114.709 bytes**;
- **5.007 linhas**;
- **283 funções nomeadas**;
- SHA-256 do kernel:
  `eae54fca21828ce37968ed072a07dab69b6d4182afe58c7f3cb575a02c5f46dd`;
- inventário global: **758 declarações function nomeadas / 747 nomes únicos / 9 nomes repetidos conhecidos**;
- módulo Knowledge Popover Controller: **24 linhas / 2 funções nomeadas**.

Head final validado:

`22b4b335d4536da8000bb8c4ead6d0abe29a0199`

Merge por squash no `main`:

`2b82578017150a94d946e44f8e143fd4b094ff89`

Workflows:

- PR: **#513** — sucesso, **46 passed / 0 flaky / 0 retry / 0 `SPATIAL_EQ_DIAG` / 0 failed**;
- pós-merge: **#514** — sucesso, **46 passed (3.0m) / 0 flaky / 0 retry / 0 `SPATIAL_EQ_DIAG` / 0 failed**.

Nenhum código de rota, DEP, `goTo()`, `renderCurrent()`, planner, interpolação, mapa, movimento, ground, timeline, scrubber, teclado ou autoplay foi alterado.

### PR #198 — checkpoint documental após `minimizeFpv`

O PR **#198 — `docs: update AI current state after PR 197`** consolidou o ciclo anterior e foi mergeado por squash em:

`868cce90804ee6f394c8a490b8c22abc69ef0dce`

Workflows:

- PR: **#500** — sucesso;
- pós-merge: **#501** — sucesso;
- ambos com os cinco gates verdes e **46 passed / 0 flaky / 0 retry / 0 `SPATIAL_EQ_DIAG` / 0 failed**.

### PR #199 — remapeamento analítico descartável após #198

O PR **#199 — `chore: fresh kernel remap after PR 198`** refez o ranking do zero sobre o `main` documental `868cce90804ee6f394c8a490b8c22abc69ef0dce`.

O primeiro ranking ainda expôs candidatos ligados ao domínio `ground`/geometria espacial, incluindo `nearestGraphKey`, `dedupeGroundPoints` e `groundDistance`. Esses candidatos foram rejeitados e o filtro foi endurecido para `ground`.

Resultado refinado:

- **0 candidatos estritamente puros**;
- melhor near-miss infra-only: `minimizeStrip`;
- corpo exato: **92 bytes**;
- SHA-256:
  `b773e96b5cc2f540ecb2133459cfacb176b2ff3ee1a88be1f3c9a6f0f8fac048`;
- dependência funcional única: `setStripVisible`;
- escrita de estado restrita a `state.stripMinimized=true`;
- exatamente **2 consumidores funcionais**:
  - botão de fechar da Strip;
  - `toggleStrip`;
- ausência direta de rota, DEP, `goTo`, `renderCurrent`, `currentEvent`, mapa, planner, interpolação, movimento, ground, geometria, timeline, scrubber ou autoplay.

Head analítico final:

`d9253338e0404c794ed07d5dce272d533f35fe90`

Workflow **#503** — sucesso, **46 passed / 0 flaky / 0 retry / 0 `SPATIAL_EQ_DIAG` / 0 failed**.

O PR foi fechado **sem merge**.

### PR #200 — congelamento de `minimizeStrip`

O PR **#200 — `test: freeze minimize strip contract`** congelou a fronteira antes da extração:

- corpo exato: **92 bytes**;
- SHA-256:
  `b773e96b5cc2f540ecb2133459cfacb176b2ff3ee1a88be1f3c9a6f0f8fac048`;
- exatamente dois consumidores funcionais protegidos;
- dependência funcional única: `setStripVisible`;
- ordem protegida:
  1. `state.stripMinimized=true`;
  2. `setStripVisible(false,{minimized:true})`;
- repetição da operação quando já minimizada preservada;
- propagação de erro da dependência preservada;
- ausência de acoplamento temporal, espacial, cartográfico ou externo direto.

Head final validado:

`112e935bc8263808d0b251309d4feb4b6b1176a7`

Merge por squash:

`c404b82b499cf89cad20122838cae4c8422712b3`

Workflows:

- PR: **#504** — sucesso, **46/0/0/0/0**;
- pós-merge: **#505** — sucesso, **46/0/0/0/0**.

### PR #201 — extração de `minimizeStrip`

O PR **#201 — `refactor: extract Strip minimizer`** moveu mecanicamente `minimizeStrip` do IIFE principal para:

`src/ui/strip-window-controller.js`

A extração preservou exatamente:

- corpo congelado: **92 bytes**;
- SHA-256:
  `b773e96b5cc2f540ecb2133459cfacb176b2ff3ee1a88be1f3c9a6f0f8fac048`;
- wiring explícito por
  `FlightFlowStripWindowController.create({ state, setStripVisible })`;
- dependências injetadas:
  - `state`;
  - `setStripVisible`;
- API pública congelada:
  - `create`;
- retorno congelado:
  - `minimizeStrip`;
- 0 declarações inline de `minimizeStrip` no núcleo;
- os mesmos dois consumidores funcionais.

Baselines resultantes:

- kernel: **1.114.588 bytes**;
- **5.009 linhas**;
- **284 funções nomeadas**;
- SHA-256 do kernel:
  `d27d411aa139443463a8229a78ac9b691e573056f13b246a7227e40e682c29b6`;
- inventário global: **757 declarações function nomeadas / 746 nomes únicos / 9 nomes repetidos conhecidos**;
- módulo Strip: **20 linhas / 2 funções nomeadas**.

Head final validado:

`5452061076d7412b4e4a2557409c7999bb90d9a3`

Merge por squash no `main`:

`f8c50a056b8e73c5dded1dc9ac8caf74b7241cd4`

Workflows:

- PR: **#506** — sucesso, **46 passed / 0 flaky / 0 retry / 0 `SPATIAL_EQ_DIAG` / 0 failed**;
- pós-merge: **#507** — sucesso, **46 passed (2.9m) / 0 flaky / 0 retry / 0 `SPATIAL_EQ_DIAG` / 0 failed**.

Nenhum código de rota, DEP, `goTo()`, `renderCurrent()`, planner, interpolação, mapa, movimento, ground, timeline, scrubber, teclado ou autoplay foi alterado.

### PR #177 — checkpoint documental após `entryMatchesToken`

O PR **#177 — `docs: update AI current state after PR 176`** consolidou o ciclo anterior e foi mergeado por squash em:

`fc519b836b2e057496dde36fe0397f41c77513db`

Workflows:

- PR: **#449** — sucesso;
- pós-merge: **#450** — sucesso;
- ambos em **46 passed / 0 flaky / 0 retry / 0 `SPATIAL_EQ_DIAG`**.

### PR #178 — remapeamento analítico descartável

O PR **#178 — `chore: fresh kernel remap after PR 177`** remapeou o kernel sobre o `main` documental `fc519b836b2e057496dde36fe0397f41c77513db`.

O primeiro resultado bruto, `activateGoogleMapsMode`, foi rejeitado manualmente por acoplamento direto com o mapa real. O filtro foi endurecido para `realmap`/`googlemap`, e a primeira fronteira limpa restante passou a ser `relatedKnowledgeButtons`:

- corpo exato: **630 bytes**;
- SHA-256: `61ea15f4014d7872d74c62b4d2fcf8fc2079f7adc462c3f4959394db69a03c31`;
- exatamente **1 consumidor funcional**, em `knowledgeDetailMarkup`;
- dependências externas funcionais restritas a:
  - `findKnowledgeEntriesByCode`;
  - `escapeHtml`;
- sem estado, DOM, storage, rede, timers, `currentEvent`, rota, DEP, mapa, movimento, timeline, scrubber ou autoplay;
- deduplicação por `item.key`, exclusão da própria entrada, ordem de encontro e limite de 12 botões preservados.

Head analítico final:

`ee92a1ec4e5d505a3a1e4e4a1768c2c1486aadf9`

O workflow **#452** terminou verde em **46 passed (2.9m) / 0 flaky / 0 retry / 0 `SPATIAL_EQ_DIAG`**. O PR foi fechado **sem merge**.

### PR #179 — congelamento de `relatedKnowledgeButtons`

O PR **#179 — `test: freeze related knowledge buttons contract`** congelou a fronteira antes da extração:

- corpo exato: **630 bytes**;
- SHA-256: `61ea15f4014d7872d74c62b4d2fcf8fc2079f7adc462c3f4959394db69a03c31`;
- único consumidor funcional: `knowledgeDetailMarkup`;
- dependências limitadas a `findKnowledgeEntriesByCode` e `escapeHtml`;
- ausência de acoplamento temporal, espacial ou de infraestrutura;
- exclusão da própria entrada, deduplicação, ordem, limite de 12, markup, não mutação e propagação de erros protegidos.

Head final do PR:

`1b684e8534da0d2f438c0f373368ce60d2ad819f`

Merge por squash:

`70c7b0fa6b7a9b14ca19581e66994d877895f700`

Workflows:

- PR: **#454** — sucesso, **46/0/0/0**;
- pós-merge: **#455** — sucesso, **46/0/0/0**.

### PR #180 — preparação da factory modular

O PR **#180 — `refactor: prepare related knowledge buttons factory`** preparou a fronteira no módulo `src/timeline/communication-context-utils.js` antes do wiring final.

A etapa foi deliberadamente intermediária:

- adicionou `createRelatedKnowledgeButtons({ findKnowledgeEntriesByCode, escapeHtml })`;
- manteve o consumidor inline do kernel intacto;
- usou temporariamente função anônima interna para não criar declaração nomeada duplicada antes da remoção do original;
- não alterou rota, DEP, `goTo()`, planner, interpolação, mapa, movimento, timeline, scrubber, teclado ou autoplay.

Head final do PR:

`d5172db36ef5428c5f5881f60f01dd0ce9e9530e`

Merge por squash:

`4f634edfd5960bbe91f3a853cee527f106131607`

Workflows:

- PR: **#460** — sucesso, **46 passed (3.0m) / 0 flaky / 0 retry / 0 `SPATIAL_EQ_DIAG`**;
- pós-merge: **#461** — sucesso, **46 passed (2.3m) / 0 flaky / 0 retry / 0 `SPATIAL_EQ_DIAG`**.

### PR #181 — extração de `relatedKnowledgeButtons`

O PR **#181 — `refactor: extract related knowledge buttons`** concluiu o wiring e removeu a declaração inline do IIFE principal.

A extração preservou exatamente:

- corpo de `relatedKnowledgeButtons`: **630 bytes**;
- SHA-256:
  `61ea15f4014d7872d74c62b4d2fcf8fc2079f7adc462c3f4959394db69a03c31`;
- único consumidor funcional em `knowledgeDetailMarkup`;
- injeção explícita de:
  - `findKnowledgeEntriesByCode`;
  - `escapeHtml`;
- wiring por:
  `CommunicationContextUtils.createRelatedKnowledgeButtons({ findKnowledgeEntriesByCode, escapeHtml })`;
- 0 declarações inline de `relatedKnowledgeButtons` no IIFE principal.

Baselines resultantes:

- kernel: **1.121.283 bytes**, **5.116 linhas**, **289 funções nomeadas**;
- SHA-256 do kernel:
  `649f12177da2df98d4f3e5ad378eaa26869dce6379c774764fe0cc898cadc91c`;
- `src/timeline/communication-context-utils.js`: **11.896 bytes**, **26 funções nomeadas**;
- SHA-256 do módulo:
  `8e658223f1f1f788bdb7fd553efb76c0f52733ac4b40f8595433d3fb468f6e90`;
- inventário global: **752 declarações function nomeadas / 741 nomes únicos**.

Head final do PR:

`e1235544ff48946eef976ab6f6c4747d5f0b1d1b`

Merge por squash no `main`:

`0eb8fe5101520219bed036c6a9aef8fc62fdeb97`

Workflows:

- PR: **#462** — sucesso, **46 passed (2.9m) / 0 flaky / 0 retry / 0 `SPATIAL_EQ_DIAG`**;
- pós-merge: **#463** — sucesso, **46 passed (3.1m) / 0 flaky / 0 retry / 0 `SPATIAL_EQ_DIAG`**.

Nenhum código de rota, DEP, `goTo()`, `renderCurrent()`, planner, interpolação, mapa, movimento, timeline, scrubber, teclado ou autoplay foi alterado.

### PR #182 — checkpoint documental após `relatedKnowledgeButtons`

O PR **#182 — `docs: update AI current state after PR 181`** consolidou o ciclo anterior e foi mergeado por squash em:

`05368d5e752415467f74e87358e74a7e0a09f519`

Workflows:

- PR: **#464** — sucesso, **46/0/0/0**;
- pós-merge: **#465** — sucesso, **46/0/0/0**.

### PR #183 — remapeamento analítico descartável

O PR **#183 — `chore: fresh kernel remap after PR 182`** recalculou do zero o ranking sobre o `main` documental `05368d5e752415467f74e87358e74a7e0a09f519`, sem reutilizar o ranking anterior.

Após filtragem automática e inspeção manual, restaram três fronteiras de baixo acoplamento:

1. `knowledgeDetailMarkup` — **1.739 bytes**;
2. `resolveKnowledgeEntry` — **1.907 bytes**;
3. `inferCommunicationContext` — **3.994 bytes**.

`knowledgeDetailMarkup` foi selecionada por ser a menor fronteira de renderização pura restante:

- SHA-256: `3a516046ca6d13484c3cb8ad157285cb05566e83a05d434887cee03b82c24285`;
- exatamente **3 consumidores executáveis**:
  - `openKnowledgeDetail`;
  - `handleKnowledgeRelatedClick`;
  - `renderKnowledgeBrowserDetail`;
- dependências restritas a:
  - `escapeHtml`;
  - `knowledgeEntryDocumentLabel`;
  - `knowledgeCategoryLabel`;
  - `relatedKnowledgeButtons`;
  - `KNOWLEDGE_DISCLAIMER`;
- sem estado, DOM, storage, rede, timers, rota, DEP, mapa, movimento, timeline, scrubber ou autoplay.

Head analítico final:

`594b65e36196738bd0a0f784b82dacca611588b1`

Workflow **#467** — sucesso, **46 passed (2.9m) / 0 flaky / 0 retry / 0 `SPATIAL_EQ_DIAG`**.

O PR foi fechado **sem merge**.

### PR #184 — congelamento de `knowledgeDetailMarkup`

O PR **#184 — `test: freeze knowledge detail markup contract`** congelou a fronteira antes da extração:

- corpo exato: **1.739 bytes**;
- SHA-256: `3a516046ca6d13484c3cb8ad157285cb05566e83a05d434887cee03b82c24285`;
- três consumidores executáveis preservados;
- fallback sem entrada, filtragem de fatos vazios, contexto de evento/horário, marcador `COMPLEMENTAR`, referência, escaping e fallback `short || definition` protegidos;
- não mutação e propagação de erros das dependências protegidas;
- ausência de acoplamento temporal, espacial ou de infraestrutura.

Head final:

`2f6d3aeb04a18556dafd99a2e3a5a432e0c6f517`

O primeiro job do workflow **#468** encontrou uma falha isolada no teste já existente de scroll da timeline. O rerun no **mesmo SHA**, sem alteração de código, terminou limpo em **46 passed / 0 flaky / 0 retry / 0 `SPATIAL_EQ_DIAG`**.

Merge por squash:

`ddc0ea7c7c8915de7df920f02d32e50564716060`

Pós-merge **#469** — sucesso, **46 passed (2.8m) / 0 flaky / 0 retry / 0 `SPATIAL_EQ_DIAG`**.

### PR #185 — extração de `knowledgeDetailMarkup`

O PR **#185 — `refactor: extract knowledge detail markup`** moveu mecanicamente a função do IIFE principal para a factory `createKnowledgeDetailMarkup` em `src/timeline/communication-context-utils.js`.

A extração preservou:

- corpo protegido: **1.739 bytes**;
- SHA-256 do corpo:
  `3a516046ca6d13484c3cb8ad157285cb05566e83a05d434887cee03b82c24285`;
- exatamente três consumidores executáveis no núcleo;
- 0 declarações inline de `knowledgeDetailMarkup`;
- injeção explícita de:
  - `escapeHtml`;
  - `knowledgeEntryDocumentLabel`;
  - `knowledgeCategoryLabel`;
  - `relatedKnowledgeButtons`;
  - `KNOWLEDGE_DISCLAIMER` via `knowledgeDisclaimer`.

O primeiro head de extração, `b59551ccbc158ca5f1d63ee36a917207095483a5`, fez Static audit e inventário passarem, mas o gate Node identificou somente contratos/baselines que ainda refletiam a fronteira anterior. Esses contratos foram adaptados sem relaxar comportamento.

Head final validado:

`d1ef97be101c0596959198f0ec63513c4c5a7c57`

Baselines resultantes:

- kernel: **1.119.792 bytes**, **5.100 linhas**, **288 funções nomeadas**;
- SHA-256 do kernel:
  `e738156ed16c67a9a6c33f407346ba3c46578cc79a7151a605faab0fffc0364b`;
- `src/timeline/communication-context-utils.js`: **14.828 bytes**, **325 linhas**, **28 funções nomeadas**;
- SHA-256 do módulo:
  `071667faa0ee75b44354a9ecee4a3c284dc13fe1753fa26b899a9bc5ce666718`;
- inventário global: **753 declarações function nomeadas / 742 nomes únicos**.

Workflows:

- PR: **#471** — sucesso, **46 passed (2.9m) / 0 flaky / 0 retry / 0 `SPATIAL_EQ_DIAG`**;
- merge por squash no `main`:
  `bfb2fd3ab36432531a081351cb459258cc10db30`;
- pós-merge: **#472** — sucesso, **46 passed (2.8m) / 0 flaky / 0 retry / 0 `SPATIAL_EQ_DIAG`**.

Nenhum código de rota, DEP, `goTo()`, `renderCurrent()`, planner, interpolação, mapa, movimento, timeline, scrubber, teclado ou autoplay foi alterado.

### PR #186 — checkpoint documental após `knowledgeDetailMarkup`

O PR **#186 — `docs: update AI current state after PR 185`** consolidou o ciclo anterior e foi mergeado por squash em:

`2699e06cc192c8e5050638ccb47b9bac071c561c`

Workflows:

- PR: **#473** — sucesso, **46 passed (2.6m) / 0 flaky / 0 retry / 0 `SPATIAL_EQ_DIAG`**;
- pós-merge: **#474** — sucesso, **46 passed (2.8m) / 0 flaky / 0 retry / 0 `SPATIAL_EQ_DIAG`**.

### PR #187 — remapeamento analítico descartável

O PR **#187 — `chore: fresh kernel remap after PR 186`** recalculou do zero o ranking sobre o `main` documental `2699e06cc192c8e5050638ccb47b9bac071c561c`, sem reutilizar o ranking anterior.

Após exclusão das fronteiras já extraídas e dos candidatos temporal/espacialmente sensíveis, restaram:

1. `resolveKnowledgeEntry` — **1.907 bytes**;
2. `inferCommunicationContext` — **3.994 bytes**.

A inspeção manual selecionou `resolveKnowledgeEntry`:

- SHA-256: `95ca385afde918ceb769218088baaacfe7f146b4334666989846333e24590cc2`;
- exatamente **1 consumidor funcional**, `renderKnowledgeFieldLabel`;
- dependências restritas a:
  - `normalizeKnowledgeText`;
  - `knowledgeEntries`;
  - `canonicalKnowledgeCode`;
  - `entryMatchesToken`;
- regras de prioridade por campo, preferência canônica, aliases e ordenação por comprimento de código identificadas como parte do comportamento a congelar;
- sem estado global, DOM, storage, rede, timers, rota, DEP, mapa, movimento, timeline, scrubber ou autoplay.

Head analítico:

`76f49ed41ac832cebf5b0c45f448214ea14404a0`

Workflow **#475** — sucesso, **46 passed (3.2m) / 0 flaky / 0 retry / 0 `SPATIAL_EQ_DIAG`**.

O PR foi fechado **sem merge**.

### PR #188 — congelamento de `resolveKnowledgeEntry`

O PR **#188 — `test: freeze resolve knowledge entry contract`** congelou a fronteira antes da extração:

- corpo exato: **1.907 bytes**;
- SHA-256: `95ca385afde918ceb769218088baaacfe7f146b4334666989846333e24590cc2`;
- único consumidor funcional em `renderKnowledgeFieldLabel`;
- normalização vazia com retorno antecipado;
- enriquecimento de `operation` e `protocol` com dados do evento;
- prioridades distintas para campos de mensagem, status e demais campos;
- preferência canônica por mensagem normativa, fallback MCA/mensagem e aliases canônicos;
- ordenação de uma cópia do catálogo por comprimento de código, sem mutar catálogo/entradas;
- propagação de erros das quatro dependências;
- ausência de acoplamento temporal, espacial ou de infraestrutura.

Head final:

`1640171a627d1a35efe3f14fd5aa6a084dd605ad`

Merge por squash:

`57fb4c32c6d477326b196561cf22b7de580bf8cb`

Workflows:

- PR: **#476** — sucesso, **46 passed (2.8m) / 0 flaky / 0 retry / 0 `SPATIAL_EQ_DIAG`**;
- pós-merge: **#477** — sucesso, **46 passed (3.1m) / 0 flaky / 0 retry / 0 `SPATIAL_EQ_DIAG`**.

### PR #189 — extração de `resolveKnowledgeEntry`

O PR **#189 — `refactor: extract resolve knowledge entry`** moveu mecanicamente a fronteira do IIFE principal para a factory `createResolveKnowledgeEntry` em `src/timeline/communication-context-utils.js`.

A extração preservou exatamente:

- corpo de `resolveKnowledgeEntry`: **1.907 bytes**;
- SHA-256 do corpo:
  `95ca385afde918ceb769218088baaacfe7f146b4334666989846333e24590cc2`;
- único consumidor funcional em `renderKnowledgeFieldLabel`;
- 0 declarações inline no IIFE principal;
- injeção explícita de:
  - `normalizeKnowledgeText`;
  - `knowledgeEntries`;
  - `canonicalKnowledgeCode`;
  - `entryMatchesToken`.

Os contratos de `normalizeKnowledgeText`, `knowledgeEntries`, `canonicalKnowledgeCode` e `entryMatchesToken` foram ajustados apenas para refletir a mudança de localização do consumidor, sem relaxar comportamento.

Head final validado:

`6683b6dab9f9f15cc892499b4c2d86b40eedf249`

Merge por squash no `main`:

`1eb4cf0ffb0d711ff8e8f1504e2c86bcb645c34e`

Baselines resultantes:

- kernel: **1.118.081 bytes**, **5.081 linhas**, **287 funções nomeadas**;
- SHA-256 do kernel:
  `8fb75716e25a8fc65abf05521e503165ce7695cc5c0522cf29cac9d2b09489a2`;
- `src/timeline/communication-context-utils.js`: **17.838 bytes**, **373 linhas**, **30 funções nomeadas**;
- SHA-256 do módulo:
  `7b1954d8f776fcc549d551727ef1af88cae4685a6a28a0251f652baf9c91d285`;
- inventário global: **754 declarações function nomeadas / 743 nomes únicos**.

Workflows:

- PR: **#478** — sucesso, **46 passed (2.8m) / 0 flaky / 0 retry / 0 `SPATIAL_EQ_DIAG`**;
- pós-merge: **#479** — sucesso, **46 passed (2.8m) / 0 flaky / 0 retry / 0 `SPATIAL_EQ_DIAG`**.

Nenhum código de rota, DEP, `goTo()`, `renderCurrent()`, planner, interpolação, mapa, movimento, timeline, scrubber, teclado ou autoplay foi alterado.

### PR #190 — checkpoint documental após `resolveKnowledgeEntry`

O PR **#190 — `docs: update AI current state after PR 189`** consolidou o ciclo anterior e foi mergeado por squash em:

`2925c3478640cf2efb0e0e419b1ae1c7eb8c85cf`

Workflows:

- PR: **#480** — sucesso, **46 passed (2.4m) / 0 flaky / 0 retry / 0 `SPATIAL_EQ_DIAG`**;
- pós-merge: **#481** — sucesso, **46 passed (3.0m) / 0 flaky / 0 retry / 0 `SPATIAL_EQ_DIAG`**.

### PR #191 — remapeamento analítico descartável

O PR **#191 — `chore: fresh kernel remap after PR 190`** recalculou do zero o ranking sobre o `main` documental `2925c3478640cf2efb0e0e419b1ae1c7eb8c85cf`.

Após excluir todas as fronteiras já extraídas e os candidatos temporal/espacialmente sensíveis, restou uma única fronteira elegível:

- `inferCommunicationContext`;
- corpo exato: **3.994 bytes**;
- SHA-256:
  `3aba0a949b32d9e8e42494686d581831ac920ae302e43b4782479fa4fa85cbe9`;
- exatamente **1 consumidor funcional**, `renderCommunication`;
- dependências funcionais restritas a:
  - `parseAddresses`;
  - `formatAddressCode`;
  - `internalTransitionDetails`;
- sem acesso direto a estado global, DOM, storage, rede, timers, rota, DEP, mapa, movimento, timeline, scrubber ou autoplay.

A inspeção manual confirmou que a função apenas deriva, a partir do `event`, o contexto de comunicação para:

- fluxo ATS externo;
- transição interna de estados;
- criação/RPL;
- correlação;
- estimados;
- SSR;
- arquivamento.

Head analítico:

`eca799569484735b4e17923294afb293d2aee98e`

Workflow **#482** — sucesso, **46 passed (2.9m) / 0 flaky / 0 retry / 0 `SPATIAL_EQ_DIAG`**.

O PR foi fechado **sem merge**.

### PR #192 — congelamento de `inferCommunicationContext`

O PR **#192 — `test: freeze infer communication context contract`** congelou a fronteira antes da extração:

- corpo exato: **3.994 bytes**;
- SHA-256:
  `3aba0a949b32d9e8e42494686d581831ac920ae302e43b4782479fa4fa85cbe9`;
- único consumidor funcional: `renderCommunication`;
- dependências:
  - `parseAddresses`;
  - `formatAddressCode`;
  - `internalTransitionDetails`;
- fluxo externo, fallbacks de origem/destino/formato, evento interno padrão, transição, criação/RPL, correlação, estimados, SSR e arquivamento protegidos;
- precedência de dados do evento sobre snapshot, não mutação e propagação de erros protegidas;
- ausência de acoplamento temporal, espacial ou de infraestrutura.

Durante a construção do contrato, os primeiros runs encontraram exclusivamente problemas nas próprias fixtures/regex do teste novo; nenhum código de produção foi alterado. O head final validado foi:

`2bf68f8236a13ea5d1edde24c7c4fcd2b0a64b76`

Merge por squash:

`4f5bdccb5993b27a40d8106bb0385e2c0c21033b`

Workflows aceitos:

- PR: **#486** — sucesso, **46/0/0/0**;
- pós-merge: **#487** — sucesso, **46/0/0/0**.

### PR #193 — extração de `inferCommunicationContext`

O PR **#193 — `refactor: extract communication context inferer`** moveu mecanicamente a função do IIFE principal para a factory `createCommunicationContextInferer` em `src/timeline/communication-context-utils.js`.

A extração preservou:

- corpo protegido: **3.994 bytes**;
- SHA-256 do corpo:
  `3aba0a949b32d9e8e42494686d581831ac920ae302e43b4782479fa4fa85cbe9`;
- único consumidor funcional em `renderCommunication`;
- 0 declarações inline no IIFE principal;
- injeção explícita de:
  - `parseAddresses`;
  - `formatAddressCode`;
  - `internalTransitionDetails`;
- wiring por:
  `CommunicationContextUtils.createCommunicationContextInferer({ parseAddresses, formatAddressCode, internalTransitionDetails })`.

Os contratos de `parseAddresses`, `formatAddressCode` e `internalTransitionDetails` foram ajustados somente para refletir a nova localização do consumidor.

Head final validado:

`f82993cf292ef463b65eb46bb8ca37aa32f2bb73`

Merge por squash no `main`:

`3e49497c336ff215c5c5b5aa9b26bda89301417f`

Baselines resultantes:

- kernel: **1.114.266 bytes**, **5.005 linhas**, **286 funções nomeadas**;
- SHA-256 do kernel:
  `fda04cb84151bbb90e4e9d0619f15007f930ecc322ab7f70c543d09c416b4ed6`;
- `src/timeline/communication-context-utils.js`: **22.691 bytes**, **473 linhas**, **32 funções nomeadas**;
- SHA-256 do módulo:
  `3d6e6f787a296194a651037bc80bf1050473a266f578712893064b66a8e2d68c`;
- inventário global: **755 declarações function nomeadas / 744 nomes únicos**.

Workflows:

- PR: **#488** — sucesso, **46 passed (3.0m) / 0 flaky / 0 retry / 0 `SPATIAL_EQ_DIAG`**;
- pós-merge: **#489** — sucesso, **46 passed (2.8m) / 0 flaky / 0 retry / 0 `SPATIAL_EQ_DIAG`**.

Nenhum código de rota, DEP, `goTo()`, `renderCurrent()`, planner, interpolação, mapa, movimento, timeline, scrubber, teclado ou autoplay foi alterado.

### PR #194 — checkpoint documental após `inferCommunicationContext`

O PR **#194 — `docs: update AI current state after PR 193`** consolidou o ciclo anterior e foi mergeado por squash em:

`356ec5056e7b2fbc6b7ca46c91937321453184c0`

Workflows:

- PR: **#490** — sucesso;
- pós-merge: **#491** — sucesso;
- ambos com os cinco gates verdes e **46/0/0/0**.

### PR #195 — remapeamento analítico descartável após #194

O PR **#195 — `chore: fresh kernel remap after PR 194`** refez o ranking sobre o `main` documental `356ec5056e7b2fbc6b7ca46c91937321453184c0`.

Resultado refinado:

- **0 candidatos estritamente puros** após excluir todas as fronteiras já extraídas;
- melhor near-miss infra-only: `minimizeFpv`;
- corpo exato: **86 bytes**;
- SHA-256:
  `37103f3e8cde8970f15adb8a89be34cf4aee6fd827f93c606872f3403138a482`;
- dependência funcional: `setFpvVisible`;
- escrita de estado restrita a `state.fpvMinimized=true`;
- dois consumidores funcionais:
  - botão de fechar da FPV;
  - `toggleFpv`;
- ausência de rota, DEP, timeline, scrubber, autoplay, planner, interpolação, mapa, movimento, geometria ou `currentEvent`.

Head analítico final:

`7b79a4425420d5522e05a1db9355afa0f4723b32`

O workflow **#494** terminou verde em **46/0/0/0**. O PR foi fechado **sem merge**.

### PR #196 — congelamento de `minimizeFpv`

O PR **#196 — `test: freeze minimize fpv contract`** congelou a fronteira antes da extração:

- corpo exato: **86 bytes**;
- SHA-256:
  `37103f3e8cde8970f15adb8a89be34cf4aee6fd827f93c606872f3403138a482`;
- ordem protegida:
  1. `state.fpvMinimized=true`;
  2. `setFpvVisible(false,{minimized:true})`;
- dois consumidores funcionais protegidos;
- repetição da minimização preservada;
- propagação de erro de `setFpvVisible` preservada;
- nenhum acoplamento temporal/espacial introduzido.

Head final validado:

`1241ffb036d0de22be64b2dd3e7013ce924d8315`

Merge por squash:

`969112a3cd096359abb5afbfcc4b6eb78d02de7f`

Workflows:

- PR: **#495** — sucesso, **46/0/0/0**;
- pós-merge: **#496** — sucesso, **46/0/0/0**.

### PR #197 — extração de `minimizeFpv`

O PR **#197 — `refactor: extract FPV minimizer`** moveu `minimizeFpv` do IIFE principal para o novo módulo:

`src/ui/fpv-window-controller.js`

A extração preservou:

- corpo congelado: **86 bytes**;
- SHA-256:
  `37103f3e8cde8970f15adb8a89be34cf4aee6fd827f93c606872f3403138a482`;
- wiring explícito por `FlightFlowFpvWindowController.create({ state, setFpvVisible })`;
- API pública do módulo: `create`;
- retorno congelado: `minimizeFpv`;
- 0 declarações inline de `minimizeFpv` no núcleo;
- os mesmos dois consumidores funcionais.

O primeiro head do PR foi bloqueado corretamente pelo inventário por criar uma nova repetição do nome `create`. A declaração interna da factory foi então renomeada para `createFpvWindowController`, mantendo a API pública `create` e restaurando o inventário sem novas repetições.

Head final validado:

`af1ad7de76fc4c9c019ac53dd354a59dcc6d2fc5`

Merge por squash no `main`:

`175912b2736288b31318985c908e5cbec2276387`

Baselines resultantes:

- kernel: **1.114.423 bytes**, **5.007 linhas**, **285 funções nomeadas**;
- SHA-256 do kernel:
  `7a0f27c620c72f7b96f4a2cf4d478283d663598c148d0c6bd9daa5d0c3818ac7`;
- inventário global: **756 declarações function nomeadas / 745 nomes únicos / 9 nomes repetidos conhecidos**;
- novo módulo FPV: ~**20 linhas / 2 funções nomeadas**.

Workflows:

- tentativa inicial #497: bloqueada no inventário antes dos testes de regressão;
- head corrigido: workflow **#498** — sucesso, **46 passed (3.0m) / 0 flaky / 0 retry / 0 `SPATIAL_EQ_DIAG`**;
- pós-merge: workflow **#499** — sucesso, **46 passed (3.0m) / 0 flaky / 0 retry / 0 `SPATIAL_EQ_DIAG`**.

Nenhum código de rota, DEP, `goTo()`, `renderCurrent()`, planner, interpolação, mapa, movimento, timeline, scrubber, teclado ou autoplay foi alterado.

### PR #173 — checkpoint documental após `mergeConfig`

O PR **#173 — `docs: update AI current state after PR 172`** consolidou o ciclo anterior e foi mergeado por squash em:

`cd92cca1ac67583bf1e142aa06c78b83bbfe4570`

Workflows:

- PR: **#431** — sucesso;
- pós-merge: **#432** — sucesso;
- ambos em **46 passed / 0 flaky / 0 retry / 0 `SPATIAL_EQ_DIAG`**.

### PR #174 — remapeamento analítico descartável

O PR **#174 — `chore: fresh kernel remap after PR 173`** remapeou o kernel sobre o `main` documental `cd92cca1ac67583bf1e142aa06c78b83bbfe4570`.

O ranking automático inicialmente descartou `entryMatchesToken` por um falso positivo textual de `.map()`, que na função é apenas `Array.map()` e não acoplamento cartográfico. A revisão manual confirmou a fronteira como candidata menor e limpa:

- corpo: **703 bytes**;
- SHA-256: `1786277e616ee1668872e61de46c48ebf4e3405961bcc11b912eb02e48fa8c9c`;
- exatamente **1 consumidor executável**, dentro de `resolveKnowledgeEntry`;
- dependências diretas restritas a:
  - `normalizeKnowledgeText`;
  - `canonicalKnowledgeCode`;
- ausência de estado, DOM, storage, rede, timers e núcleo temporal/espacial.

Head analítico final:

`bd612c2f3bdeb3cc8cc9469873eaec86e9e1ac07`

O workflow **#435** terminou verde em **46/0/0/0**. O PR foi fechado **sem merge**.

### PR #175 — congelamento de `entryMatchesToken`

O PR **#175 — `test: freeze entry token matcher contract`** congelou a fronteira antes da extração:

- corpo exato: **703 bytes**;
- SHA-256: `1786277e616ee1668872e61de46c48ebf4e3405961bcc11b912eb02e48fa8c9c`;
- exatamente **1 consumidor executável**;
- dependências limitadas a `normalizeKnowledgeText` e `canonicalKnowledgeCode`;
- correspondência exata, aliases e equivalência canônica protegidas;
- fallback flexível entre espaço, hífen e barra protegido;
- fronteiras alfanuméricas protegidas;
- não mutação da entrada e propagação de erros das dependências protegidas;
- ausência de acoplamento direto com estado, DOM, storage, rede, timers ou núcleo temporal/espacial.

Head final do PR:

`5036edbd0132e7b523f483bd3b67a851d3769f35`

Merge por squash:

`0a64bccbeb2d5977e9873fe3ab305d41a4100a81`

Workflows:

- PR: **#437** — sucesso, **46/0/0/0**;
- pós-merge: **#438** — sucesso, **46/0/0/0**.

### PR #176 — extração de `entryMatchesToken`

O PR **#176 — `refactor: extract entry token matcher`** moveu mecanicamente a fronteira do IIFE principal para:

`src/timeline/communication-context-utils.js`

A extração preservou exatamente:

- corpo de `entryMatchesToken`: **703 bytes**;
- SHA-256 do corpo:
  `1786277e616ee1668872e61de46c48ebf4e3405961bcc11b912eb02e48fa8c9c`;
- exatamente **1 consumidor executável** em `resolveKnowledgeEntry`;
- 0 declarações inline de `entryMatchesToken` no IIFE principal;
- injeção explícita de:
  - `normalizeKnowledgeText`;
  - `canonicalKnowledgeCode`;
- wiring por:
  `CommunicationContextUtils.createEntryMatchesToken({ normalizeKnowledgeText, canonicalKnowledgeCode })`.

Durante a adaptação dos contratos, consumidores de `canonicalKnowledgeCode` e `normalizeKnowledgeText` passaram a ser contabilizados também dentro do módulo, sem relaxar os contratos existentes. Um diagnóstico temporário de identidade do módulo foi removido antes do head final.

Head final do PR:

`9bd515a10eea286c438fe5b075e65327c99688ae`

Merge por squash no `main`:

`2f5a3d291597c77a0b414f812d078c6ccc4b6bd0`

Workflows:

- PR: **#447** — sucesso, **46 passed (2.4m)**, **0 flaky**, **0 retry**, **0 `SPATIAL_EQ_DIAG`**;
- pós-merge: **#448** — sucesso, **46 passed (2.9m)**, **0 flaky**, **0 retry**, **0 `SPATIAL_EQ_DIAG`**.

Nenhum código de rota, DEP, `goTo()`, `renderCurrent()`, planner, interpolação, mapa, movimento, timeline, scrubber, teclado ou autoplay foi alterado.

### PR #169 — checkpoint documental após `stripCell`

O PR **#169 — `docs: update AI current state after PR 168`** consolidou o estado após o ciclo de `stripCell` e foi mergeado por squash em:

`d54f5cc4a9058685ebe89633d52940aaa57d9c52`

O workflow pós-merge **#420** terminou verde no SHA exato acima, com **46 passed**, **0 flaky**, **0 retry** e **0 `SPATIAL_EQ_DIAG`**.

### PR #170 — remapeamento analítico descartável

O PR **#170 — `chore: fresh kernel remap after PR 169`** remapeou o kernel sobre o `main` documental `d54f5cc4a9058685ebe89633d52940aaa57d9c52`.

A janela inicial de até 800 bytes voltou a apresentar apenas fronteiras já adiadas pela política de segurança, como helpers de refresh, handlers de clique, `clamp`/`clamp01` e `normalizeLocalityCode`. A janela de inspeção foi ampliada para até 1.600 bytes e apontou `mergeConfig` como primeira fronteira limpa restante.

Dados congelados pelo remapeamento:

- `mergeConfig`: **1.074 bytes**;
- SHA-256: `ab55d30859ab0b89d96fb17c23703600ee4f34192e597729b0909e7556aaaefd`;
- exatamente **2 consumidores executáveis**;
- dependências diretas:
  - `DEFAULT_CONFIG`;
  - `FIELD_DEFS`;
  - `clone`;
  - `normalizeFontScale`;
  - `normalizeFieldLayout`;
- ausência de acesso direto a estado, DOM, storage, rede, timers e núcleo temporal/espacial.

`stripValueMeaning` foi rejeitada porque alcança `currentEvent()` e contexto de conhecimento/evento.

O head analítico final foi `ce9f3fcfc117811cef2102275faf2c8fe3792eda`. O workflow **#423** terminou verde em **46/0/0/0**. O PR foi fechado **sem merge**.

### PR #171 — congelamento de `mergeConfig`

O PR **#171 — `test: freeze merge config contract`** congelou a fronteira antes da extração:

- corpo exato: **1.074 bytes**;
- SHA-256: `ab55d30859ab0b89d96fb17c23703600ee4f34192e597729b0909e7556aaaefd`;
- exatamente **2 consumidores executáveis**;
- dependências explicitamente limitadas a `DEFAULT_CONFIG`, `FIELD_DEFS`, `clone`, `normalizeFontScale` e `normalizeFieldLayout`;
- sem acoplamento direto com estado, DOM, storage, rede, timers ou núcleo temporal/espacial;
- regras de tema, escala tipográfica, campos visíveis, inserção de `idPlano`/`etn`, `customFields`, `fieldLayout` e `addressPatterns` protegidas;
- não mutação da entrada e propagação de erros das dependências protegidas.

Head do PR: `648b581da39ecdc6592bbf3d345e3d5762d9e654`.

Workflows:

- PR: **#424** — sucesso, **46 passed / 0 flaky / 0 retry / 0 `SPATIAL_EQ_DIAG`**;
- merge por squash: `37d67b61c3d44fef0d5f4387863dcf69d1267309`;
- pós-merge: **#425** — sucesso, **46/0/0/0**.

### PR #172 — extração de `mergeConfig`

O PR **#172 — `refactor: extract merge config module`** moveu mecanicamente a fronteira para:

`src/config/config-merger.js`

A extração preservou exatamente:

- corpo de `mergeConfig`: **1.074 bytes**;
- SHA-256 do corpo:
  `ab55d30859ab0b89d96fb17c23703600ee4f34192e597729b0909e7556aaaefd`;
- exatamente **2 consumidores executáveis**:
  - `applyAdvancedConfig`;
  - `loadConfig`;
- 0 declarações inline de `mergeConfig` no IIFE principal;
- injeção explícita de:
  - `DEFAULT_CONFIG`;
  - `FIELD_DEFS`;
  - `clone`;
  - `normalizeFontScale`;
  - `normalizeFieldLayout`.

O wiring foi colocado depois da inicialização de `DEFAULT_CONFIG` e antes de `state.config = loadConfig()`, preservando a ordem de inicialização e evitando TDZ.

Novo módulo:

- arquivo: `src/config/config-merger.js`;
- **2.078 bytes**;
- SHA-256:
  `a8e5658ad3b3e77534cf71035f3985a96b5ae4f42d1e19fb81ec673d3ac26ec6`;
- 2 funções nomeadas:
  - `createConfigMerger`;
  - `mergeConfig`.

Durante o primeiro run do PR, contratos antigos ainda esperavam `mergeConfig` e um consumidor de `normalizeFieldLayout` dentro do kernel. Esses contratos foram atualizados para refletir a nova fronteira, sem relaxar comportamento. Também foi eliminado um falso negativo de `deepStrictEqual` causado por valores criados em outro realm de `vm`, mantendo os testes comportamentais do corpo congelado no realm hospedeiro.

Head final do PR: `cde8aec6fc127da9028500629f71e92b1d8d25d2`.

Workflows:

- PR: **#429** — sucesso, **46 passed (2.8m)**, **0 flaky**, **0 retry**, **0 `SPATIAL_EQ_DIAG`**;
- merge por squash no `main`: `913d87b4573e75e79af4393f3a895cbe001e1fca`;
- pós-merge: **#430** — sucesso, **46 passed (2.9m)**, **0 flaky**, **0 retry**, **0 `SPATIAL_EQ_DIAG`**.

Nenhum código de rota, DEP, `goTo()`, `renderCurrent()`, planner, interpolação, mapa, movimento, timeline, scrubber, teclado ou autoplay foi alterado.


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

Conforme `tests/main-kernel-contract.test.js` após o PR #209:

- **1.114.852 bytes**;
- **5.007 linhas**;
- SHA-256:
  `1bf973317ac5f0447cabaf91a28a1b041ec220f62ed82b68f7a53d404396204b`;
- **282 funções nomeadas** no núcleo protegido.

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

### Typography Step Controller

Após o PR #209:

- arquivo: `src/ui/typography-step-controller.js`;
- **22 linhas / 2 funções nomeadas**;
- carregado pelo script `flightflow-typography-step-controller` antes do núcleo;
- API pública congelada:
  - `create`;
- factory interna nomeada `createTypographyStepController`;
- dependências injetadas:
  - `state`;
  - `applyTypography`;
- retorno congelado:
  - `stepTypography`;
- corpo de `stepTypography`: **130 bytes**;
- SHA-256:
  `a9fdef5d62eea60e5f3ea207a99f78bc26f83897da68384d5ce5eedec0914afd`;
- exatamente dois consumidores funcionais preservados;
- declaração inline no IIFE principal: **0**.

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

### FPV Window Controller

Após o PR #197:

- arquivo: `src/ui/fpv-window-controller.js`;
- carregado pelo script `flightflow-fpv-window-controller` antes do núcleo;
- API pública congelada:
  - `create`;
- factory interna nomeada `createFpvWindowController` para não criar repetição no inventário;
- dependências injetadas:
  - `state`;
  - `setFpvVisible`;
- retorno congelado:
  - `minimizeFpv`;
- corpo de `minimizeFpv`: **86 bytes**;
- SHA-256:
  `37103f3e8cde8970f15adb8a89be34cf4aee6fd827f93c606872f3403138a482`.

### Strip Window Controller

Após o PR #201:

- arquivo: `src/ui/strip-window-controller.js`;
- carregado pelo script `flightflow-strip-window-controller` antes do núcleo;
- API pública congelada:
  - `create`;
- factory interna nomeada `createStripWindowController`;
- dependências injetadas:
  - `state`;
  - `setStripVisible`;
- retorno congelado:
  - `minimizeStrip`;
- corpo de `minimizeStrip`: **92 bytes**;
- SHA-256:
  `b773e96b5cc2f540ecb2133459cfacb176b2ff3ee1a88be1f3c9a6f0f8fac048`;
- exatamente dois consumidores funcionais preservados;
- declaração inline no IIFE principal: **0**.

### Knowledge Popover Controller

Após o PR #205:

- arquivo: `src/knowledge/knowledge-popover-controller.js`;
- **24 linhas / 2 funções nomeadas**;
- carregado pelo script `flightflow-knowledge-popover-controller` antes do núcleo;
- API pública congelada:
  - `create`;
- factory interna nomeada `createKnowledgePopoverController`;
- dependências injetadas:
  - `els`;
  - `state`;
- retorno congelado:
  - `hideKnowledgePopover`;
- corpo de `hideKnowledgePopover`: **156 bytes**;
- SHA-256:
  `57adc4878279173c3b09aefef808da7eb213d614219e579479970315061003cc`;
- dois consumidores funcionais preservados;
- declaração inline no IIFE principal: **0**.

### Communication Context Utils

Conforme `tests/communication-context-utils-contract.test.js` após o PR #193:

- arquivo: `src/timeline/communication-context-utils.js`;
- **22.691 bytes**;
- **473 linhas**;
- SHA-256:
  `3d6e6f787a296194a651037bc80bf1050473a266f578712893064b66a8e2d68c`;
- **32 funções nomeadas**.

A API pública congelada inclui:

- `internalTransitionDetails`;
- `parseAddresses`;
- `knowledgeEntryDocumentKey`;
- `normalizeKnowledgeText`;
- `createCommunicationContextInferer`;
- `createCanonicalKnowledgeCode`;
- `createEntryMatchesToken`;
- `createResolveKnowledgeEntry`;
- `createKnowledgeEntryFinder`;
- `createKnowledgeEntriesByCodeFinder`;
- `createRelatedKnowledgeButtons`;
- `createKnowledgeDetailMarkup`;
- `createKnowledgeDocumentLabeler`;
- `createKnowledgeCategoryLabeler`;
- `create`;
- `createAddressFormatter`;
- `createAddressDisplayFormatter`;
- `createFieldDisplayFormatter`.

`entryMatchesToken` permanece congelada dentro do módulo com:

- corpo: **703 bytes**;
- SHA-256:
  `1786277e616ee1668872e61de46c48ebf4e3405961bcc11b912eb02e48fa8c9c`;
- fábrica:
  `createEntryMatchesToken({ normalizeKnowledgeText, canonicalKnowledgeCode })`;
- declaração inline no IIFE principal: **0**.

`relatedKnowledgeButtons` permanece congelada dentro do módulo com:

- corpo: **630 bytes**;
- SHA-256:
  `61ea15f4014d7872d74c62b4d2fcf8fc2079f7adc462c3f4959394db69a03c31`;
- fábrica:
  `createRelatedKnowledgeButtons({ findKnowledgeEntriesByCode, escapeHtml })`;
- declaração inline no IIFE principal: **0**.

`knowledgeDetailMarkup` permanece congelada dentro do módulo com:

- corpo: **1.739 bytes**;
- SHA-256:
  `3a516046ca6d13484c3cb8ad157285cb05566e83a05d434887cee03b82c24285`;
- fábrica:
  `createKnowledgeDetailMarkup({ escapeHtml, knowledgeEntryDocumentLabel, knowledgeCategoryLabel, relatedKnowledgeButtons, knowledgeDisclaimer })`;
- declaração inline no IIFE principal: **0**.

`resolveKnowledgeEntry` permanece congelada dentro do módulo com:

- corpo: **1.907 bytes**;
- SHA-256:
  `95ca385afde918ceb769218088baaacfe7f146b4334666989846333e24590cc2`;
- fábrica:
  `createResolveKnowledgeEntry({ normalizeKnowledgeText, knowledgeEntries, canonicalKnowledgeCode, entryMatchesToken })`;
- único consumidor funcional em `renderKnowledgeFieldLabel`;
- declaração inline no IIFE principal: **0**.

`inferCommunicationContext` permanece congelada dentro do módulo com:

- corpo: **3.994 bytes**;
- SHA-256:
  `3aba0a949b32d9e8e42494686d581831ac920ae302e43b4782479fa4fa85cbe9`;
- fábrica:
  `createCommunicationContextInferer({ parseAddresses, formatAddressCode, internalTransitionDetails })`;
- retorno congelado:
  `inferCommunicationContext`;
- único consumidor funcional no núcleo: **1**, em `renderCommunication`;
- declaração inline no IIFE principal: **0**.

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

### Config Merger

Conforme `tests/merge-config-contract.test.js` após o PR #172:

- arquivo: `src/config/config-merger.js`;
- **2.078 bytes**;
- SHA-256:
  `a8e5658ad3b3e77534cf71035f3985a96b5ae4f42d1e19fb81ec673d3ac26ec6`;
- API pública congelada:
  - `create`;
- fábrica:
  - `create({ defaultConfig, fieldDefs, clone, normalizeFontScale, normalizeFieldLayout })`;
- retorno congelado:
  - `mergeConfig`;
- corpo de `mergeConfig`: **1.074 bytes**;
- SHA-256 do corpo:
  `ab55d30859ab0b89d96fb17c23703600ee4f34192e597729b0909e7556aaaefd`;
- consumidores executáveis no núcleo: **2**;
- declaração inline no IIFE principal: **0**.

### Inventário global

Após o PR #209, confirmado pelo workflow pós-merge #521:

- **759 declarações function nomeadas** entre o HTML e scripts locais;
- **748 nomes únicos**;
- **9 nomes repetidos conhecidos**;
- o IIFE principal contém **282 funções nomeadas**;
- `src/core/core-utils.js` contém **12 funções nomeadas**;
- `src/timeline/communication-context-utils.js` contém **32 funções nomeadas**;
- `src/ui/source-manager-controller.js` contém **2 funções nomeadas**;
- `src/ui/field-layout-utils.js` contém **2 funções nomeadas**;
- `src/ui/field-card-renderer.js` contém **2 funções nomeadas**;
- `src/ui/strip-cell-renderer.js` contém **2 funções nomeadas**;
- `src/ui/typography-step-controller.js` contém **2 funções nomeadas**;
- `src/config/config-merger.js` contém **2 funções nomeadas**;
- `src/knowledge/knowledge-entries.js` contém **2 funções nomeadas**;
- `src/knowledge/knowledge-field-label-renderer.js` contém **2 funções nomeadas**;
- `src/knowledge/knowledge-popover-controller.js` contém **2 funções nomeadas**;
- o inventário não introduziu nova colisão de nomes;
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

Referência do ciclo mais recente (`stepTypography`):

- checkpoint documental #206:
  - workflow **#515** no head exato `4a3b01e46052e55c7ed353ed268dfafdc3305fe7` — sucesso;
  - pós-merge: workflow **#516** no SHA `ce070275fad13d1c9c110441401035d110943000` — sucesso;
  - ambos em **46/0/0/0/0**.
- remapeamento descartável #207:
  - workflow **#517** no head exato `1ee1b803a073eed7f1dfca2e46e1e3a209ef9a3d` — sucesso;
  - **46/0/0/0/0**;
  - fechado sem merge.
- PR de contrato #208:
  - workflow **#518** no head exato `dd0d2792d67a8ab8aa1727ba756d55e9374d1d5f` — sucesso;
  - pós-merge: workflow **#519** no SHA `e10f677fd2d9ba4a3717afb2779969417a6f82f7` — sucesso;
  - ambos em **46/0/0/0/0**.
- PR de extração #209:
  - workflow **#520** no head exato `71ed7bcdf8d2e083ea5b1df7e8ad7dc498350bfc` — sucesso;
  - pós-merge: workflow **#521** no SHA `98384510f1ae62ce1d33b55aee23bb80accdef7e` — sucesso;
  - ambos em **46/0/0/0/0**.

Referência do ciclo mais recente (`hideKnowledgePopover`):

- checkpoint documental #202:
  - workflow **#508** no head exato `3f41c32205cd7908831f4c21a0006fb7d6fd0f61` — sucesso;
  - pós-merge: workflow **#509** no SHA `ce2b8ae9ceb9662b33891051ff33338099d1f914` — sucesso;
  - ambos em **46/0/0/0/0**.
- remapeamento descartável #203:
  - workflow **#510** no head exato `6254c5eb27dba834a586e2944ed2325850fc890d` — sucesso;
  - **46/0/0/0/0**;
  - fechado sem merge.
- PR de contrato #204:
  - workflow **#511** no head exato `a65de124f487c75349bb044dd344ed51ec917727` — sucesso;
  - pós-merge: workflow **#512** no SHA `0c79643f1b6172a31e7cf6d0e2222b287f8447ef` — sucesso;
  - ambos em **46/0/0/0/0**.
- PR de extração #205:
  - workflow **#513** no head exato `22b4b335d4536da8000bb8c4ead6d0abe29a0199` — sucesso;
  - pós-merge: workflow **#514** no SHA `2b82578017150a94d946e44f8e143fd4b094ff89` — sucesso;
  - ambos em **46/0/0/0/0**.

Referência do ciclo mais recente (`minimizeStrip`):

- checkpoint documental #198:
  - workflow **#500** no head exato `f045000bef661fd648e2c2043f28e12f210a2799` — sucesso;
  - pós-merge: workflow **#501** no SHA `868cce90804ee6f394c8a490b8c22abc69ef0dce` — sucesso;
  - ambos em **46/0/0/0/0**.
- remapeamento descartável #199:
  - workflow final **#503** no head exato `d9253338e0404c794ed07d5dce272d533f35fe90` — sucesso;
  - **46/0/0/0/0**;
  - fechado sem merge.
- PR de contrato #200:
  - workflow **#504** no head exato `112e935bc8263808d0b251309d4feb4b6b1176a7` — sucesso;
  - pós-merge: workflow **#505** no SHA `c404b82b499cf89cad20122838cae4c8422712b3` — sucesso;
  - ambos em **46/0/0/0/0**.
- PR de extração #201:
  - workflow **#506** no head exato `5452061076d7412b4e4a2557409c7999bb90d9a3` — sucesso;
  - pós-merge: workflow **#507** no SHA `f8c50a056b8e73c5dded1dc9ac8caf74b7241cd4` — sucesso;
  - ambos em **46/0/0/0/0**.

Referência do ciclo mais recente (`inferCommunicationContext`):

- checkpoint documental #190:
  - workflow **#480** no head exato `117aafc4e68fc9b1c87fbb314a0bed513d76eba8` — sucesso;
  - pós-merge: workflow **#481** no SHA `2925c3478640cf2efb0e0e419b1ae1c7eb8c85cf` — sucesso;
  - ambos em **46/0/0/0**.
- remapeamento descartável #191:
  - workflow **#482** no head exato `eca799569484735b4e17923294afb293d2aee98e` — sucesso;
  - **46/0/0/0**;
  - fechado sem merge.
- PR de contrato #192:
  - workflow final **#486** no head exato `2bf68f8236a13ea5d1edde24c7c4fcd2b0a64b76` — sucesso;
  - pós-merge: workflow **#487** no SHA `4f5bdccb5993b27a40d8106bb0385e2c0c21033b` — sucesso;
  - ambos em **46/0/0/0**.
- PR de extração #193:
  - workflow **#488** no head exato `f82993cf292ef463b65eb46bb8ca37aa32f2bb73` — sucesso;
  - pós-merge: workflow **#489** no SHA `3e49497c336ff215c5c5b5aa9b26bda89301417f` — sucesso;
  - ambos em **46/0/0/0**.

Referência de ciclo anterior (`knowledgeDetailMarkup`):

- checkpoint documental #182:
  - workflow **#464** no head exato `acee789dfbeaf8b3fe7351df543c0f5fe60c7ea5` — sucesso;
  - pós-merge: workflow **#465** no SHA `05368d5e752415467f74e87358e74a7e0a09f519` — sucesso;
  - ambos em **46/0/0/0**.
- remapeamento descartável #183:
  - workflow **#467** no head exato `594b65e36196738bd0a0f784b82dacca611588b1` — sucesso;
  - **46/0/0/0**;
  - fechado sem merge.
- PR de contrato #184:
  - workflow **#468** no head exato `2f6d3aeb04a18556dafd99a2e3a5a432e0c6f517` — rerun final limpo;
  - pós-merge: workflow **#469** no SHA `ddc0ea7c7c8915de7df920f02d32e50564716060` — sucesso;
  - ambos em **46/0/0/0** no resultado aceito.
- PR de extração #185:
  - workflow **#471** no head exato `d1ef97be101c0596959198f0ec63513c4c5a7c57` — sucesso;
  - pós-merge: workflow **#472** no SHA `bfb2fd3ab36432531a081351cb459258cc10db30` — sucesso;
  - ambos em **46/0/0/0**.

Referência do ciclo anterior (`relatedKnowledgeButtons`):

- remapeamento descartável #178:
  - workflow **#452** no head exato `ee92a1ec4e5d505a3a1e4e4a1768c2c1486aadf9` — sucesso;
  - **46/0/0/0**;
  - fechado sem merge.
- PR de contrato #179:
  - workflow **#454** no head exato `1b684e8534da0d2f438c0f373368ce60d2ad819f` — sucesso;
  - pós-merge: workflow **#455** no SHA `70c7b0fa6b7a9b14ca19581e66994d877895f700` — sucesso;
  - ambos em **46/0/0/0**.
- PR preparatório #180:
  - workflow **#460** no head exato `d5172db36ef5428c5f5881f60f01dd0ce9e9530e` — sucesso;
  - pós-merge: workflow **#461** no SHA `4f634edfd5960bbe91f3a853cee527f106131607` — sucesso;
  - ambos em **46/0/0/0**.
- PR de extração #181:
  - workflow **#462** no head exato `e1235544ff48946eef976ab6f6c4747d5f0b1d1b` — sucesso;
  - pós-merge: workflow **#463** no SHA `0eb8fe5101520219bed036c6a9aef8fc62fdeb97` — sucesso;
  - ambos em **46/0/0/0**.

Referência do ciclo anterior (`entryMatchesToken`):

- remapeamento descartável #174:
  - workflow **#435** no head exato `bd612c2f3bdeb3cc8cc9469873eaec86e9e1ac07` — sucesso;
  - **46/0/0/0**;
  - fechado sem merge.
- PR de contrato #175:
  - workflow **#437** no head exato `5036edbd0132e7b523f483bd3b67a851d3769f35` — sucesso;
  - pós-merge: workflow **#438** no SHA `0a64bccbeb2d5977e9873fe3ab305d41a4100a81` — sucesso;
  - ambos em **46/0/0/0**.
- PR de extração #176:
  - workflow **#447** no head exato `9bd515a10eea286c438fe5b075e65327c99688ae` — sucesso;
  - pós-merge: workflow **#448** no SHA `2f5a3d291597c77a0b414f812d078c6ccc4b6bd0` — sucesso;
  - ambos em **46/0/0/0**.

Referência do ciclo anterior (`mergeConfig`):

- PR de contrato #171:
  - workflow **#424** no head exato `648b581da39ecdc6592bbf3d345e3d5762d9e654` — sucesso;
  - pós-merge: workflow **#425** no SHA `37d67b61c3d44fef0d5f4387863dcf69d1267309` — sucesso;
  - ambos em **46/0/0/0**.
- PR de extração #172:
  - workflow **#429** no head exato `cde8aec6fc127da9028500629f71e92b1d8d25d2` — sucesso;
  - pós-merge: workflow **#430** no SHA `913d87b4573e75e79af4393f3a895cbe001e1fca` — sucesso;
  - ambos em **46/0/0/0**.

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

O ciclo `stepTypography` está concluído em produção e validado no SHA exato:

`98384510f1ae62ce1d33b55aee23bb80accdef7e`

Workflow pós-merge correspondente: **#521**, verde em **46 passed / 0 flaky / 0 retry / 0 `SPATIAL_EQ_DIAG` / 0 failed**.

O corpo protegido permanece no módulo `src/ui/typography-step-controller.js` com **130 bytes** e SHA-256:

`a9fdef5d62eea60e5f3ea207a99f78bc26f83897da68384d5ce5eedec0914afd`

Baseline atual do núcleo:

- **1.114.852 bytes**;
- **5.007 linhas**;
- **282 funções nomeadas**;
- SHA-256:
  `1bf973317ac5f0447cabaf91a28a1b041ec220f62ed82b68f7a53d404396204b`.

Inventário global atual:

- **759 declarações function nomeadas**;
- **748 nomes únicos**;
- **9 nomes repetidos conhecidos**.

**Não reutilizar o ranking do PR #207**, porque o kernel mudou com a extração do PR #209.

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
   - `mergeConfig`;
   - `entryMatchesToken`;
   - `relatedKnowledgeButtons`;
   - `knowledgeDetailMarkup`;
   - `resolveKnowledgeEntry`;
   - `inferCommunicationContext`;
   - `minimizeFpv`;
   - `minimizeStrip`;
   - `hideKnowledgePopover`;
   - `stepTypography`;
5. manter a separação entre candidatos estritamente puros e near-misses infra-only;
6. excluir novamente candidatos ligados a `goTo`, rota, DEP, timeline, scrubber, autoplay,
   planner, interpolação, mapa, movimento, ground, geometria e outras fronteiras de alto blast radius;
7. inspecionar manualmente o melhor candidato restante;
8. abrir primeiro PR **somente de contrato**;
9. validar no SHA exato e exigir **46 passed / 0 flaky / 0 retry / 0 `SPATIAL_EQ_DIAG` / 0 failed**;
10. só depois iniciar a extração mecânica em PR separado.

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
