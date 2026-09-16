# FlightFlow ATS — AI Current State

> Checkpoint operacional para continuidade entre conversas/agentes.
>
> Última verificação: **16/09/2026**, após o merge do PR **#232**, certificação pós-merge do workflow **#592** e housekeeping **#19**.
>
> **A modularização contínua continua encerrada. A fase atual é PRODUTO, VALIDAÇÃO OPERACIONAL e preparação de release.**

## 1. Fonte de verdade

- Repositório: `ricksir/flightflow-ats`.
- Visibilidade: **público**.
- Branch principal: `main`.
- SHA funcional certificado:
  `69be39c5da551ebad7f49bf6f74fbb7094b509a0`
  — `fix: complete visual acceptance and terminal route preview (#232)`.
- Commits exclusivamente documentais podem ficar acima desse SHA em `main`; para continuidade funcional, usar o SHA certificado acima como referência e conferir o topo real de `main` antes de qualquer nova alteração.
- Release estável publicada: **FlightFlow ATS v0.2.0**.
- Tag `v0.2.0`: `e089820456c08eb42df968faa9da59b062a32b6f`.
- As mudanças dos PRs #225–#232 estão em **Unreleased** até nova decisão de release.
- O PR **#233** foi fechado sem merge por ter ficado divergente e conter uma linha incompleta/sem ligação efetiva ao `index.html`; foi substituído pelo #232.
- Após a certificação do #232 e o housekeeping #19: nenhum PR funcional aberto deve ser considerado pendente; conferir sempre o estado real antes de nova alteração.

Este arquivo é um checkpoint. Ao retomar, conferir primeiro o SHA real de `main`, PRs abertos e workflows recentes.

## 2. Certificação atual

### PR #232 — aceitação visual, identidade e rota terminal

- Head certificado: `0bfa9201efe89d644a117d6fe69983bb823fecfb`.
- Workflow PR **#591**: sucesso.
- Node: **637/637 passed**.
- Playwright: **53/53 passed**.
- Log bruto: **0 failed / 0 flaky / 0 retry / 0 SPATIAL_EQ_DIAG / 0 not ok / 0 AssertionError**.

### Pós-merge

- SHA funcional certificado em `main`: `69be39c5da551ebad7f49bf6f74fbb7094b509a0`.
- Workflow **#592**: sucesso.
- Node: **637/637 passed**.
- Playwright: **53/53 passed**.
- Log bruto: **0 failed / 0 flaky / 0 retry / 0 SPATIAL_EQ_DIAG / 0 not ok / 0 AssertionError**.
- Housekeeping **#19**: sucesso; remoção de branches temporárias seguras.

Gates obrigatórios antes e depois de merge:

1. `npm run audit`;
2. inventário de funções;
3. `npm test`;
4. disponibilidade Chromium;
5. `npm run test:ui`;
6. leitura do log bruto do SHA efetivamente validado.

Nunca fazer merge apenas pelo badge verde.

## 3. Rodada de produto e aceitação concluída até 16/09/2026

### PR #225 — Rota Processada: foco operacional e redução de densidade

Merge:
`e54ca332ce37e6f7bb82cc1aecfe7f96a685d5a0`.

Certificação pós-merge **#555**:

- **619/619 Node**;
- **47/47 Playwright**;
- zero failed/flaky/retry/SPATIAL_EQ_DIAG.

Entregas:

- legenda operacional recolhível;
- faixa explicativa separada do palco do mapa;
- tipografia operacional ampliada;
- Modo foco;
- redução de labels permanentes;
- prioridade visual para origem, último ponto, ponto atual, transferências e seleção;
- detalhes secundários por hover/click;
- seleção por mouse e teclado;
- mesma política aplicada à camada Leaflet e ao fallback SVG;
- mapa preservado como protagonista.

Nenhuma mudança em `goTo()` ou no contrato temporal protegido.

### PR #226 — Ordem TER: fechamento terminal derivado no ADES

Merge:
`453aa2f5bb0c132689621944973741cd8e65ca46`.

Certificação pós-merge **#559**:

- **622/622 Node**;
- **47/47 Playwright**;
- zero failed/flaky/retry/SPATIAL_EQ_DIAG.

Comportamento vigente:

- `movementPoints()` continua reservado ao histórico + continuação declarada;
- a existência de **Ordem TER** habilita um perfil espacial de fechamento separado;
- no evento TER, a posição-alvo chega a 100% no ADES;
- o trecho terminal é exibido como **derivado / não histórico**;
- representação: linha amarela tracejada;
- nenhum ETIM, `etimKey`, CFL, STAR ou fixo intermediário é inventado;
- antes da Ordem TER, a posição continua limitada pelas evidências temporais reais;
- sem Ordem TER, o ADES não é inserido como fechamento sintético;
- Próximo até TER chega ao ADES;
- Anterior a partir do TER retorna ao estado pré-TER;
- o ADES derivado não vira checkpoint ETIM.

Também foi incorporado o ARP oficial de **SBCT** à base offline mínima:

- `253154S 0491034W`;
- fonte registrada no código: AISWEB AIP AD 2 SBCT.

`pseudoDestinationTail()` permanece desativado.

### PR #227 — FlightFlow ATS Design System

Merge:
`bb46d863236f5e1edd3d3ce81aa660e16e79623d`.

Foi criada uma camada visual consistente em:

`src/ui/shell-visual-refinement.css`

e a documentação:

`docs/DESIGN_SYSTEM.md`.

Referências de design adaptadas:

- Arounda / Velox — dashboard de tela única;
- Behance / Velox — UI/UX e componentes de aviação.

Princípios aplicados sem copiar a identidade Velox:

- azul/ciano FlightFlow preservado;
- amarelo operacional preservado;
- dark/light coerentes;
- zonas funcionais estáveis;
- mapa dominante;
- inspector com largura controlada;
- tipografia/spacing/radius por tokens;
- sombras em níveis;
- glow somente para foco/atividade;
- estados hover/focus/active/disabled;
- layout vertical responsivo abaixo de 900 px;
- integração visual de Rota Processada, FPV e STRIP sem mudar semântica interna.

Contratos novos de navegador validam:

- dominância do mapa em desktop;
- legibilidade mínima de controles;
- tema escuro;
- foco explícito por teclado;
- fluxo vertical abaixo de 900 px.

### PR #229 — alinhamento do trecho terminal com o ADES

Merge:
`4f871f3202b2b9f4b2b9df0604582d44cbef79eb`.

Entregas relevantes:

- a rota legada deixa de competir visualmente com a Rota Processada quando `ffrpProcessed=true`;
- o ARP oficial de SBCT passa a prevalecer no fechamento terminal, evitando divergência com coordenada customizada/stale;
- underlay e linha terminal usam os mesmos endpoints;
- nenhuma alteração em `goTo()` ou no motor temporal.

### PR #230 — eliminação do pisca da Ordem TER

Merge funcional certificado:
`1d69d7b6711a80cd4021e922a57c4fb8bd58c8cb`.

Correção:

- `renderMap()` monta o próximo SVG fora do DOM observado e troca os filhos de forma atômica com `replaceChildren(...)`;
- a sincronização da Rota Processada após Próximo/Anterior, scrubber e setas usa microtask do mesmo evento, depois do estado nativo ser atualizado e antes do próximo frame;
- desaparece a janela em que o índice já estava em TER sem a linha terminal, bem como a janela inversa no retrocesso;
- `goTo()` permanece inalterado;
- o motor temporal e a semântica histórica permanecem inalterados.

Regressão específica:

- pré-TER → TER → evento seguinte → TER → pré-TER → TER;
- exatamente um fechamento `UMGUL → SBCT` quando ativo;
- nenhum fechamento antes do TER;
- endpoint coincidente com o marcador ADES;
- nenhum frame intermediário ausente, duplicado ou desalinhado;
- nenhum ETIM, CFL, STAR ou fixo intermediário inventado.

Certificação:

- PR workflow **#578**: **635/635 Node + 52/52 Playwright**;
- pós-merge workflow **#579**: **635/635 Node + 52/52 Playwright**;
- zero failed/flaky/retry/`SPATIAL_EQ_DIAG` em ambos.

### PR #232 — fechamento da aceitação manual de dashboard, identidade e rota terminal

Merge funcional certificado:
`69be39c5da551ebad7f49bf6f74fbb7094b509a0`.

Entregas:

- identidade inicial e runtime unificadas em **FlightFlow ATS**;
- versão de desenvolvimento coerente com `package.json`: **0.2.1-dev**;
- remoção da identificação inicial legada `TIOP Cindacta1` do título/header/Sobre;
- terceiro preset de aparência **Velox / referência** disponível nas Configurações, mantendo os modos claro e escuro do FlightFlow;
- persistência do preset `velox` corrigida no carregamento/aplicação de configuração;
- Rota Processada com sidebar reduzida para preservar dominância do mapa;
- no fallback vetorial/offline do mapa principal, a camada processada passa a desenhar a rota histórica, a continuação declarada e o trecho terminal previsto/ativo;
- no Leaflet, o trecho terminal possui classes próprias para inspeção e testes;
- antes da Ordem TER, `UMGUL → SBCT` permanece referência espacial derivada e tracejada, sem movimentar antecipadamente a aeronave;
- no TER, a mesma geometria torna-se fechamento ativo;
- nenhum ETIM, CFL, STAR ou fixo intermediário é inventado;
- `goTo()`, o motor temporal e as garantias do PR #230 permanecem inalterados.

Certificação:

- PR workflow **#591**: **637/637 Node + 53/53 Playwright**;
- pós-merge workflow **#592**: **637/637 Node + 53/53 Playwright**;
- zero `failed`, `flaky`, `retry`, `SPATIAL_EQ_DIAG`, `not ok` e `AssertionError` no log bruto de ambos;
- housekeeping **#19** concluído com sucesso;
- PR **#233** fechado sem merge por ter ficado divergente e não representar uma linha segura de continuidade.

## 4. Histórico real TAM3774 — contrato atual

Referência:

- callsign: `TAM3774`;
- ADEP: `SBBR`;
- ADES: `SBCT`;
- rota declarada: `KUKOL UZ5 UMGUL`;
- quadro processado no histórico de Brasília: **18 pontos**, terminando em `IMTBI`.

Sequência histórica protegida:

`SBBR → UMSUB → KUKOL → SIRUL → VUDOT → EDMIN → 1853S04832W → UDIGI → MEVIK → ASTOB → VUPOG → UPONA → 2127S04856W → ISISA → ENPEG → PALCA → ANSOK → IMTBI`.

Continuação espacial publicada, sem ETIM no histórico:

`VULRU → UBNID → GIKLU → USVIG → UMGUL`.

Regras:

1. nenhum dos 18 pontos processados pode ser removido, pulado ou reordenado;
2. `VULRU/UBNID/GIKLU/USVIG/UMGUL` continuam sem ETIM inventado;
3. sem Ordem TER, não existe movimento sintético até SBCT;
4. na Ordem TER, o FlightFlow pode encerrar visualmente o plano em SBCT por um trecho direto **explicitamente derivado/não histórico**;
5. esse fechamento não cria STAR, ETIM, CFL ou fixos intermediários;
6. retroceder da Ordem TER restaura o estado espacial anterior;
7. `pseudoDestinationTail()` continua `null`.

Regra de produto:

> **Geometria publicada pode ser mostrada; movimento temporal usa evidência real. O fechamento de Ordem TER é uma exceção espacial explícita, derivada e identificada como não histórica.**

## 5. Regras inegociáveis

Fidelidade temporal e espacial continua sendo prioridade absoluta.

Nunca introduzir regressões em:

- não pular fixos;
- aeronave exatamente sobre os fixos/checkpoints;
- ordem correta dos fixos;
- horários corretos;
- DEP como referência temporal;
- Próximo e Anterior equivalentes;
- timeline equivalente;
- scrubber equivalente;
- teclado equivalente;
- autoplay equivalente;
- retrocesso fiel;
- transição da Ordem TER sem frame intermediário com fechamento ausente, duplicado ou desalinhado;
- distinção entre histórico, rota declarada sem ETIM e fechamento terminal derivado;
- sequência crítica `PADIL → IRISO → LIBEC → EGDOD → IBGAM → PMS → ILVES → MASVA`;
- `ILVES 01:34` antes de `MASVA 01:36`.

### `goTo()`

Não alterar `goTo()` sem:

1. necessidade funcional concreta;
2. testes dedicados;
3. comparação explícita de Próximo/Anterior/timeline/scrubber/teclado/autoplay;
4. certificação completa antes e depois do merge.

## 6. Modularização

A rodada contínua de modularização está encerrada.

Não:

- iniciar fresh remap automaticamente;
- extrair funções apenas porque ainda existem no IIFE;
- abrir sequências de PRs de refatoração sem objetivo funcional;
- usar contagem de funções como meta de produto.

Foco permitido:

1. bug observado;
2. fidelidade com histórico real;
3. produto/UX/UI;
4. desempenho e acessibilidade;
5. NAVDB/AISWEB com fonte verificável;
6. testes e contratos;
7. preparação de release.

## 7. Design System

Fonte de verdade:

`docs/DESIGN_SYSTEM.md`.

Ao criar ou alterar interface:

- reutilizar tokens `--ffds-*`;
- não reduzir fonte para resolver overflow;
- não criar cores sem significado;
- preservar semântica ATS;
- testar claro/escuro;
- testar desktop e breakpoints;
- incluir focus-visible;
- respeitar `prefers-reduced-motion`;
- adicionar teste se a mudança for estrutural.

O Design System é uma camada visual. Não deve passar a controlar navegação ou estado de domínio.

## 8. Próximas fronteiras

A reconstrução A/B/C está concluída. Próximas atividades devem ser decididas por evidência de uso.

Prioridades possíveis:

1. aceitação visual manual com históricos reais e vídeos do operador;
2. validar Rota Processada/Ordem TER em diferentes ADES além de SBCT;
3. validar responsividade em máquinas/monitores operacionais reais;
4. preparar uma próxima release quando houver decisão de versionamento;
5. registrar novos bugs de produto antes de qualquer refatoração adicional.

Não há nova rodada automática de reconstrução ou modularização pendente neste checkpoint.

## 9. Política de continuidade

Antes de qualquer nova mudança:

1. conferir `main`;
2. conferir PRs abertos;
3. conferir workflows recentes;
4. conferir `docs/AI_CURRENT_STATE.md`;
5. reproduzir o problema ou objetivo;
6. criar branch pequena;
7. criar/ajustar contrato;
8. rodar todos os gates;
9. ler log bruto;
10. merge;
11. repetir gates no novo `main`;
12. confirmar housekeeping.

O histórico detalhado das rodadas anteriores permanece no Git e não deve substituir este checkpoint.
