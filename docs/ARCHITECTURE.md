# Arquitetura — estado atual

## Visão geral

O FlightFlow ATS continua executável diretamente por `index.html`, sem etapa obrigatória de build, mas deixou de ser uma aplicação inteiramente monolítica.

`index.html` mantém a interface, estilos e parte da orquestração principal. Responsabilidades com fronteiras estáveis foram externalizadas para módulos em `src/`.

```text
index.html
│
├── src/ai/          # motor local de IA
├── src/config/      # configuração e validação
├── src/core/        # utilitários e controladores centrais
├── src/data/        # dados locais
├── src/geo/         # geografia e coordenadas
├── src/knowledge/   # conhecimento e apresentação associada
├── src/map/         # mapa, aeronave e movimento
├── src/parser/      # parser de históricos
├── src/route/       # rota processada
├── src/storage/     # persistência
├── src/timeline/    # navegação e estado temporal
└── src/ui/          # controladores e utilitários de interface
```

## Princípios arquiteturais

### Execução simples

A aplicação deve continuar abrindo diretamente no navegador sempre que possível. A estrutura modular não depende de bundler para funcionar.

### Contratos antes de mudança

Fronteiras críticas são protegidas por testes antes de qualquer alteração. O objetivo é evitar regressões silenciosas durante manutenção.

### Fidelidade temporal e espacial

Timeline, rota, movimento e navegação são tratados como núcleo crítico. Formas diferentes de navegação devem convergir para o mesmo estado lógico e espacial.

### Extrações orientadas por necessidade

A rodada contínua de modularização foi encerrada após o PR #211. O projeto não possui mais uma meta automática de “retirar tudo do `index.html`”.

Novas fronteiras só devem ser criadas quando houver benefício funcional, de correção ou de manutenção claramente identificado.

## Fluxo de estado crítico

Em alto nível:

```text
histórico
   ↓
parser
   ↓
eventos / estado
   ↓
timeline + navegação
   ↓
rota / movimento
   ↓
mapa + STRIP + FPV + UI
```

A persistência local e os módulos de conhecimento/IA são serviços adjacentes e não devem alterar a determinismo da navegação.

## Verificação arquitetural

A integridade do sistema é acompanhada por:

- `tools/audit_static.py`;
- `tools/function_inventory.py`;
- contratos Node em `tests/*.test.js`;
- regressões Playwright em `tests/e2e/`;
- workflow `.github/workflows/quality-gates.yml`.

## Referências

- estado atual: `docs/AI_CURRENT_STATE.md`;
- fronteiras e histórico de extrações: `docs/MODULE-BOUNDARIES.md`;
- regressões críticas: `docs/REGRESSION-CHECKLIST.md`;
- release: `docs/RELEASE-READINESS.md`.
