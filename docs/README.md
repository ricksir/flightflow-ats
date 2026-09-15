# Documentação

Este diretório reúne documentação operacional, arquitetural, de testes e o histórico técnico do FlightFlow ATS.

## Documentos de referência atual

| Documento | Finalidade |
|---|---|
| `AI_CURRENT_STATE.md` | checkpoint técnico para continuidade entre sessões/agentes |
| `DESIGN_SYSTEM.md` | tokens, tipografia, layout, responsividade e regras visuais do produto |
| `ARCHITECTURE.md` | arquitetura vigente e princípios de manutenção |
| `REGRESSION-CHECKLIST.md` | invariantes e regressões críticas |
| `RELEASE-READINESS.md` | gates e checklist para futuras releases |
| `ROADMAP.md` | prioridades atuais e itens fora de escopo automático |
| `TEST-PLAN-TIMELINE-ROUTE.md` | plano de teste específico de timeline/rota |

## Referência técnica e histórica

| Documento | Finalidade |
|---|---|
| `AUDIT-BASELINE.md` | auditoria da base original e checksums históricos |
| `MODULE-BOUNDARIES.md` | registro das fronteiras extraídas e baselines intermediários |
| `PROMPT-PADRAO.md` | orientação histórica para continuidade assistida |
| `refactor/build-timeline-dependency-map.md` | análise específica de dependências usada durante a refatoração |

## Regra de leitura

Para saber **o que fazer agora**, comece por `AI_CURRENT_STATE.md`.

Para entender **como o sistema está organizado**, use `ARCHITECTURE.md`.

Para modificar uma área crítica, consulte também `REGRESSION-CHECKLIST.md` e os testes correspondentes.

Para criar ou alterar interface, leia `DESIGN_SYSTEM.md` e preserve as fronteiras entre estilo visual e lógica operacional.

Documentos históricos não devem ser usados isoladamente para inferir o estado atual do `main`.

## Governança do repositório

- `../CONTRIBUTING.md` — convenções de contribuição, branches e testes;
- `../SECURITY.md` — política para conteúdo sensível e vulnerabilidades;
- `../AGENTS.md` — regras para agentes automatizados;
- `.github/workflows/branch-housekeeping.yml` — remoção segura de branches temporárias já encerradas.
