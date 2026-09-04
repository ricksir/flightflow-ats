# Fronteiras atuais de módulos JavaScript

Este documento registra a estrutura **existente** do `index.html` antes da primeira extração para `src/`. Ele não propõe uma reescrita; serve como mapa para que cada movimento de código seja pequeno, verificável e reversível.

## Inventário estrutural

A auditoria automática (`python3 tools/function_inventory.py index.html --check`) identifica atualmente:

- **8 blocos `<script>`**;
- **724 declarações `function nomeada(...)`**;
- **711 nomes únicos**;
- **11 nomes de função repetidos** em mais de uma declaração.

Esses números são um **guardrail de arquitetura**, não uma métrica de qualidade isolada. Uma repetição pode ser legítima quando as declarações vivem em IIFEs diferentes.

## Os 8 blocos atuais

| Bloco | Papel observado no código | Situação | Prioridade de extração |
|---|---|---|---|
| 1 | `FlightParser` em formato UMD (`window.FlightParser`) | já possui fronteira/API própria | **1** |
| 2 | `window.__SAMPLE_HISTORY__` com histórico de demonstração | dado/fixture embutido, sem funções nomeadas | posterior |
| 3 | `window.__FLIGHTFLOW_GEO_DATA__` | grande base geográfica serializada, sem funções nomeadas | posterior |
| 4 | IIFE principal da aplicação (`FlightFlow ATS - TIOP Cindacta1`) | maior núcleo: estado, UI, timeline, mapa e integrações | **por último** |
| 5 | motor de IA/governança (`AI_ENGINE_VERSION`) | IIFE relativamente independente | após módulos já isolados |
| 6 | `flightflow-secure-storage-module` | IIFE identificado e especializado em armazenamento | **3** |
| 7 | camada FIR v7.3.5, ligada a `window.__FlightFlowFirBridge` | extensão especializada sobre a ponte do mapa | **4** |
| 8 | `flightflow-route-processed-v7412` / `window.FlightFlowRouteProcessedV7412` | IIFE com API pública e suíte de regressão dedicada | **2** |

## Nomes repetidos catalogados

A lista abaixo é a baseline conhecida. O CI falha se surgir **um novo nome repetido não catalogado**.

- `buildTimeline`
- `describeEvent`
- `escapeHtml`
- `exportNormalized`
- `getSourceClass`
- `init`
- `normalizeSearchText`
- `openDb`
- `parseHistory`
- `stageForProgress`
- `toast`

### Como interpretar

Há dois casos diferentes que não devem ser confundidos:

1. **repetição entre módulos/IIFEs diferentes** — pode ser perfeitamente legítima, como `init` ou `openDb` em módulos especializados;
2. **repetição dentro do mesmo bloco principal** — merece inspeção prioritária, porque pode representar gerações de implementação acumuladas ou sobresposição lógica.

O inventário é propositalmente conservador: ele não chama essas ocorrências de “bugs” ou “colisões” sem análise de escopo.

## Ordem segura de modularização

### 1. FlightParser

Por que primeiro:

- já é encapsulado em UMD;
- expõe `window.FlightParser`;
- o IIFE principal já o consome como dependência (`const Parser = window.FlightParser`);
- retirar o bloco para um arquivo externo exige pouca mudança conceitual.

Objetivo da primeira extração: mover o conteúdo, **sem refatorar sua lógica**.

### 2. Rota Processada v7.4.12

Por que em seguida:

- possui `id` próprio no `<script>`;
- impede dupla inicialização com `window.FlightFlowRouteProcessedV7412`;
- já expõe API pública;
- a suíte `tests/route-regression.test.js` cobre a lógica mais sensível de DEP, ETIM, progressão e evento 78→79.

A extração só deve trocar o local físico do código; a API pública e o comportamento devem permanecer idênticos.

### 3. Secure Storage

O bloco `flightflow-secure-storage-module` já tem responsabilidade específica, nome próprio e fronteira clara. Deve ser extraído depois que o padrão de carregamento externo estiver comprovado nos dois primeiros módulos.

### 4. FIR

A camada FIR depende explicitamente de `window.__FlightFlowFirBridge`. Antes da extração, a ponte precisa ser documentada como contrato de entrada.

### 5. IIFE principal

Somente depois das extrações de baixo risco. O bloco principal concentra responsabilidades demais para ser dividido por corte mecânico. A decomposição deve acontecer por domínio, com testes antes de cada movimento:

- `timeline/`;
- `navigation/`;
- `map/`;
- `flightplan/`;
- `ats/`;
- `ui/`;
- integrações/bridges.

## Regras para cada PR de extração

1. **Não misturar extração e melhoria funcional.**
2. O diff deve mostrar principalmente “mover código + alterar referência de carregamento”.
3. `npm run audit` deve permanecer verde.
4. `npm run inventory` não pode introduzir nova repetição de nome.
5. Os 9 testes do núcleo devem permanecer verdes.
6. Os testes Playwright de navegação devem permanecer verdes.
7. Se um módulo já possui objeto global/API pública, o contrato externo deve ser preservado durante a primeira extração.
8. Refatorações internas ficam para um PR posterior, depois que a equivalência comportamental da extração estiver comprovada.

## Próximo candidato concreto

A primeira extração recomendada é **FlightParser → `src/parser/flight-parser.js`**, preservando literalmente o corpo atual e mantendo `window.FlightParser` como contrato. Só depois de esse PR ficar verde deve ser considerada qualquer limpeza interna do parser.
