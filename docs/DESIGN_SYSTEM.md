# FlightFlow ATS — Design System

> Versão 1.0 — reconstrução visual de produto sem alteração da lógica operacional.

## 1. Objetivo

Este documento é a fonte de verdade visual do FlightFlow ATS. O sistema foi estruturado para reduzir deriva de interface, melhorar legibilidade em alta densidade e permitir que novos painéis reutilizem as mesmas regras em vez de criarem estilos isolados.

A implementação principal está em:

- `src/ui/shell-visual-refinement.css`;
- seção `FlightFlow ATS Design System 1.0`.

A camada é deliberadamente visual: não controla parser, timeline, rota, ETIM, `goTo()`, scrubber, teclado ou autoplay.

## 2. Referências e adaptação

Referências de produto:

- Arounda / Velox: https://arounda.agency/works/velox
- Behance / Velox: https://www.behance.net/gallery/247623775/WebApp-UIUX-Design-Mobile-App-Design-Brand-Identity

Princípios aproveitados:

1. dashboard de tela única;
2. zonas funcionais estáveis e conectadas;
3. mapa/conteúdo principal como protagonista;
4. hierarquia por profundidade, bordas, sombra e glow discreto;
5. alta densidade sem perda de contexto;
6. componentes com estados consistentes;
7. responsividade por cartões verticais em telas menores;
8. informação crítica sempre visível durante a navegação.

Não foram copiados logotipo, identidade, paleta emerald ou composição proprietária do Velox. O FlightFlow mantém sua identidade azul/ciano, amarelo operacional e cores semânticas existentes.

## 3. Foundations

### 3.1 Espaçamento

Escala base:

| Token | Valor | Uso |
| --- | ---: | --- |
| `--ffds-space-1` | 4 px | microespaço |
| `--ffds-space-2` | 8 px | gap compacto |
| `--ffds-space-3` | 12 px | padding padrão |
| `--ffds-space-4` | 16 px | separação de grupos |
| `--ffds-space-5` | 24 px | separação estrutural |

Regra: preferir múltiplos da escala e evitar valores novos sem necessidade funcional.

### 3.2 Raios

| Token | Valor |
| --- | ---: |
| `--ffds-radius-xs` | 8 px |
| `--ffds-radius-sm` | 10 px |
| `--ffds-radius-md` | 14 px |
| `--ffds-radius-lg` | 18 px |
| `--ffds-radius-xl` | 22 px |

Cards principais usam 18 px; controles usam 8–10 px. O arredondamento não deve transformar o painel operacional em interface excessivamente “soft”.

### 3.3 Tipografia

Família: a stack já usada pelo FlightFlow, com Inter quando disponível e fallback de sistema.

Escala:

| Token | Valor aproximado | Papel |
| --- | ---: | --- |
| `--ffds-type-micro` | 10 px | metadata/chips |
| `--ffds-type-xs` | 11 px | controles compactos |
| `--ffds-type-sm` | 12 px | texto operacional |
| `--ffds-type-md` | 14 px | títulos de painel |
| `--ffds-type-lg` | 18 px | destaques |
| `--ffds-type-xl` | 24 px | identificação principal |

Diretrizes:

- controles de desktop não devem ficar abaixo de 11 px;
- valores operacionais preferem 12–13,5 px;
- microtexto de 10 px é reservado a metadata secundária;
- labels do mapa seguem contratos próprios de legibilidade da Rota Processada;
- não reduzir fonte para “fazer caber”; primeiro reduzir ruído ou reorganizar.

### 3.4 Cores

Identidade principal:

- ciano: `#35d7ff`;
- ciano forte: `#159dca`;
- azul FlightFlow: `#0e5598`;
- amarelo operacional: `#ffb02e`;
- sucesso: `#22a06b`;
- erro: `#d64a4a`.

O design system não substitui cores semânticas de STRIP/FPV nem a semântica da Rota Processada.

### 3.5 Profundidade

Existem dois níveis principais:

- `--ffds-shadow-1`: barras, controles e superfícies locais;
- `--ffds-shadow-2`: workspace/inspector e janelas de alto nível.

Glow ciano é reservado a foco/atividade. Não usar glow decorativo em todos os cards.

## 4. Estrutura de tela

### Desktop

Fluxo visual:

`Header → Mapa / Workspace → Inspector → Transporte`

O conteúdo central mantém duas zonas:

- mapa/workspace: área dominante;
- inspector: coluna estável de aproximadamente 350–380 px.

O mapa deve ocupar a maior parte da largura disponível e não pode ser sacrificado para aumentar cards laterais.

### 1260 px

Inspector reduz para aproximadamente 340–360 px.

### 1080 px

Header pode quebrar em linhas; tabs passam para duas colunas quando necessário.

### 900 px ou menos

Workspace e inspector tornam-se cartões verticais. A legenda/contexto do mapa e o status deixam de disputar horizontalmente o mesmo espaço.

### 620 px ou menos

Controles são compactados, mas continuam operáveis. Tipografia crítica não é reduzida abaixo do limite definido para controles compactos.

## 5. Componentes

### Header

Funções diferentes devem permanecer visualmente separadas:

- identidade;
- entrada de arquivo;
- status ATS;
- ações globais.

O header é uma superfície elevada, não uma faixa plana ocupando a tela.

### Workspace / mapa

O mapa é o protagonista.

Regras:

- controles superiores compactos;
- contexto da cena no canto inferior esquerdo;
- status cartográfico no canto inferior direito;
- overlays não devem cobrir a rota central sem necessidade;
- painel de protocolo abre abaixo dos controles, evitando colisão visual.

### Inspector

Tabs funcionam como navegação segmentada.

Cards:

- label pequeno e estável;
- valor mais forte;
- alterações ganham amarelo sem apagar o valor anterior;
- hover apenas reforça affordance;
- dados largos usam a largura completa.

### Timeline

A timeline usa um trilho contínuo com nós.

Estados:

- normal: nó neutro;
- hover: ciano suave;
- ativo: ciano + glow controlado;
- alterado: marcador amarelo separado do estado ativo.

A forma visual não altera a equivalência entre clique, Próximo/Anterior, scrubber, teclado ou autoplay.

### Transporte

Barra única e persistente com:

- navegação à esquerda;
- scrubber no centro;
- velocidade e toggles à direita.

Em telas menores os grupos podem empilhar, preservando a ordem de uso.

### Rota Processada

O Design System apenas integra shell, cards e tipografia.

Semântica espacial permanece:

- histórico processado: vermelho;
- rota declarada sem ETIM: azul tracejado;
- fechamento terminal derivado por Ordem TER: amarelo tracejado;
- transferências: semântica própria já existente.

Nunca usar estilo para esconder a distinção entre dado histórico e dado derivado.

### FPV e STRIP

Somente chrome externo, sombra, borda e barra de janela podem seguir o Design System.

As cores internas regulamentares/semânticas não devem ser “modernizadas” por estética.

## 6. Estados de interação

Todo componente interativo deve ter, quando aplicável:

- default;
- hover;
- focus-visible;
- active/pressed;
- disabled.

Foco de teclado: outline ciano de 2 px com offset.

Hover não pode ser a única indicação de estado.

`prefers-reduced-motion: reduce` desativa transições decorativas relevantes.

## 7. Densidade e anti-clutter

Antes de adicionar informação permanente à tela:

1. é necessária para decisão imediata?
2. já existe em outro painel?
3. pode aparecer por hover/click/foco?
4. cobre o mapa ou outra informação mais importante?

Na Rota Processada, labels permanentes são reservados a pontos prioritários. No shell, metadata secundária usa chips ou texto discreto.

## 8. Regras para novas telas

Ao criar componente novo:

1. reutilizar tokens `--ffds-*`;
2. reutilizar raio e spacing existentes;
3. definir estados de interação;
4. testar tema claro e escuro;
5. testar 1600 px, 1080 px, 900 px e 620 px;
6. não inserir tamanho de fonte menor para contornar layout;
7. não criar nova cor sem significado;
8. não alterar semântica ATS para combinar com estética;
9. acrescentar contrato de teste se o componente for estrutural.

## 9. Gates

Qualquer alteração relevante do Design System deve preservar:

- Static audit;
- Function declaration inventory;
- Node regression;
- Chromium availability;
- Playwright/UI navigation;
- 0 failed;
- 0 flaky;
- 0 retry;
- 0 `SPATIAL_EQ_DIAG`.

O log bruto continua sendo a fonte de certificação, não apenas o badge do workflow.
