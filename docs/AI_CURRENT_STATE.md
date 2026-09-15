# FlightFlow ATS — AI Current State

> Checkpoint operacional para continuidade entre conversas.
>
> Última verificação: **15/09/2026**, após o merge do PR **#218** e a certificação pós-merge do workflow **#540**.
>
> **A rodada contínua de modularização está encerrada. A fase atual é PRODUTO, BUGS, UX/UI e validação com históricos reais.**

## 1. Fonte de verdade

- Repositório: `ricksir/flightflow-ats`.
- Visibilidade: **público**.
- Branch principal: `main`.
- SHA de produção certificado:
  `febadf6cc59a207260fc3522c00cd1a623be7bb2`
  — `fix: expand TAM3774 UZ5 without fabricated timing (#218)`.
- Release estável: **FlightFlow ATS v0.2.0**.
- Tag `v0.2.0`: `e089820456c08eb42df968faa9da59b062a32b6f`.
- Após o merge do #218 não havia PR funcional aberto.

Este arquivo é um checkpoint. Ao retomar, conferir primeiro o SHA real de `main`, PRs abertos e workflows recentes.

## 2. Certificação atual

### PR #218

- Head: `35e4f93255362a339bb8754e77c36cfb04722ebb`.
- Workflow PR **#539**: sucesso.
- Node: **611/611 passed**.
- Playwright: **46 passed**.
- **0 flaky / 0 retry / 0 SPATIAL_EQ_DIAG / 0 failed**.

### Pós-merge

- `main`: `febadf6cc59a207260fc3522c00cd1a623be7bb2`.
- Workflow **#540**: sucesso.
- Node: **611/611 passed**.
- Playwright: **46 passed**.
- **0 flaky / 0 retry / 0 SPATIAL_EQ_DIAG / 0 failed**.

Gates obrigatórios antes e depois de merge:

1. `npm run audit`;
2. `npm run audit:functions`;
3. `npm test`;
4. disponibilidade Chromium;
5. `npx playwright test tests/e2e/ui-navigation.spec.js`.

Nunca fazer merge apenas pelo badge verde. Ler o log bruto do SHA atual.

## 3. Fase de produto concluída até aqui

### PR #216 — TAM3774 / NAVDB offline

Corrigiu a causa dos **14 pontos sem coordenada** do histórico real TAM3774.

Coordenadas oficiais AISWEB/AIP ENR 3.2 incorporadas para:

`KUKOL → SIRUL → VUDOT → EDMIN → UDIGI → MEVIK → ASTOB → VUPOG → UPONA → ISISA → ENPEG → PALCA → ANSOK → IMTBI`.

Foi adicionado contrato de regressão TAM3774.

Merge:
`5414a271cf9e4ecc72fda5d1c0604cff61c65c82`.

Pós-merge #536:
**609/609 Node + 46 Playwright**, sem flaky/retry/SPATIAL_EQ_DIAG/failed.

### PR #217 — refinamento visual da Rota Processada

Refinamento incremental inspirado na organização de WebApps modernos, mantendo a identidade cromática FlightFlow.

Mudanças principais:

- controles agrupados em **Visualização / Dados da rota / Ações / Status**;
- melhor hierarquia de header e superfícies;
- cards, espaçamento e sombras discretas;
- estados hover/focus/active/disabled;
- breakpoints responsivos;
- nenhum parser, ETIM, `goTo()`, timeline, scrubber, teclado ou movimento alterado.

Merge:
`9e6b7b2c08f1bfb2df590ec4d686dc8434622511`.

Pós-merge #538:
**609/609 Node + 46 Playwright**, sem flaky/retry/SPATIAL_EQ_DIAG/failed.

### PR #218 — continuação UZ5 sem fabricar tempo

Removeu a aproximação sintética **IMTBI → SBCT**.

Para a rota declarada `KUKOL UZ5 UMGUL`, a continuação espacial publicada agora é:

`IMTBI → VULRU → UBNID → GIKLU → USVIG → UMGUL`.

Regras:

- pontos posteriores a IMTBI são **rota declarada / sem ETIM**;
- nenhum ETIM, `etimKey` ou CFL é inventado;
- a aeronave não é animada pelos pontos sem ETIM;
- scrubber/autoplay da Rota Processada ficam limitados ao último ETIM real;
- `SBCT` pode aparecer apenas como referência de ADES;
- **não existe linha inventada UMGUL → SBCT**;
- a trajetória terminal só pode ser implementada quando houver fonte real que a determine.

Merge:
`febadf6cc59a207260fc3522c00cd1a623be7bb2`.

## 4. Histórico real TAM3774

Referência funcional atual:

- callsign: `TAM3774`;
- ADEP: `SBBR`;
- ADES: `SBCT`;
- rota declarada: `KUKOL UZ5 UMGUL`;
- quadro processado no histórico de Brasília: **18 pontos**, terminando em `IMTBI`;
- CPL/PCM para Curitiba continua pela `UZ5 UMGUL`;
- não há ETIM no histórico de Brasília para `VULRU/UBNID/GIKLU/USVIG/UMGUL`;
- não há STAR no histórico que permita reconstruir com segurança `UMGUL → SBCT`.

Regra vigente:

> **Geometria publicada pode ser mostrada; movimento temporal só pode usar ETIM real.**

## 5. Regras inegociáveis

Fidelidade temporal e espacial é prioridade absoluta.

Nunca introduzir regressões em:

- não pular fixos;
- aeronave exatamente sobre os fixos;
- ordem correta dos fixos;
- horários corretos;
- DEP como referência temporal;
- Próximo e Anterior equivalentes;
- timeline equivalente;
- scrubber equivalente;
- teclado equivalente;
- autoplay equivalente;
- retrocesso fiel.

### Modularização contínua encerrada

Não:

- criar fresh remap automaticamente;
- extrair funções apenas porque ainda existem no IIFE;
- abrir sequências de PRs de refatoração sem objetivo funcional;
- voltar ao ranking contínuo de candidatos de modularização.

Foco atual:

1. bugs observados em uso real;
2. fidelidade com históricos reais;
3. UX/UI incremental;
4. shell/header/cards/timeline/modais/responsividade;
5. NAVDB/AISWEB e topologia de rota somente com fonte verificável;
6. testes e contratos antes de alterações sensíveis.

## 6. Próximas fronteiras

1. Validar novamente o TAM3774 com o `main` atual em execução local.
2. Confirmar visualmente:
   - todos os 18 pontos processados até IMTBI;
   - continuação declarada UZ5 até UMGUL;
   - ausência de linha inventada até SBCT;
   - aeronave limitada temporalmente ao último ETIM real;
   - Próximo/Anterior/timeline/scrubber/autoplay;
   - STRIP e FPV.
3. Continuar refinamento visual incremental na interface principal, sem redesenho destrutivo.
4. Generalizar expansão de aerovias somente com fonte de topologia confiável e contratos por rota.
5. Para `UMGUL → SBCT`, aguardar evidência de rota terminal/STAR do voo antes de implementar geometria.

## 7. Política de continuidade

Antes de qualquer nova mudança:

1. conferir `main`;
2. conferir PRs abertos;
3. conferir workflows recentes;
4. confirmar que o checkpoint ainda corresponde ao GitHub;
5. criar branch pequena e de objetivo funcional claro;
6. adicionar/ajustar contrato antes de mudança sensível;
7. rodar todos os gates;
8. ler log bruto;
9. merge;
10. repetir gates e log bruto no novo `main`.

O histórico detalhado das antigas rodadas de modularização permanece disponível no histórico Git deste arquivo e não deve comandar a próxima fase de trabalho.
