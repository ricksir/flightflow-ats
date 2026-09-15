# Roadmap técnico

> Estado revisado em 15/09/2026. Este roadmap substitui o plano inicial de modularização contínua.

## Concluído

### Base e proteção

- [x] auditoria estática;
- [x] inventário de funções;
- [x] quality gates no GitHub Actions;
- [x] regressões Node;
- [x] regressões E2E/Playwright;
- [x] contratos temporais e espaciais críticos;
- [x] documentação de Release Readiness.

### Release estável

- [x] validação operacional da v0.2.0;
- [x] gates verdes no SHA candidato;
- [x] publicação da tag e release `v0.2.0`;
- [x] changelog de release.

### Modularização

- [x] parser, dados, storage e IA externalizados;
- [x] controladores de timeline e navegação protegidos;
- [x] utilitários geográficos e de UI extraídos quando seguro;
- [x] contratos por fronteira adicionados;
- [x] fresh remap final executado no PR #211;
- [x] critério de parada aplicado: 0 candidatos estritamente puros;
- [x] modularização contínua encerrada.

## Prioridades atuais

### 1. Estabilidade funcional

- corrigir apenas bugs reproduzíveis;
- manter equivalência entre Próximo, Anterior, timeline, scrubber, teclado e autoplay;
- preservar DEP e fidelidade espacial;
- criar regressão automatizada para cada correção crítica.

### 2. Evolução do produto

- priorizar melhorias solicitadas pelo uso real do FlightFlow;
- evitar refatoração sem benefício funcional mensurável;
- documentar mudanças de comportamento no changelog.

### 3. Segurança e publicação

- revisar continuamente novos conteúdos antes de adicioná-los ao repositório público;
- manter segredos e dados locais fora do Git;
- remover dados pessoais desnecessários caso sejam identificados.

### 4. Próxima release

Quando houver conjunto funcional suficiente para nova versão:

- executar o checklist de `docs/RELEASE-READINESS.md`;
- validar todos os gates no mesmo SHA;
- registrar aceitação operacional aplicável;
- atualizar `CHANGELOG.md`;
- publicar tag/release somente após validação final.

## Fora de escopo automático

Não são tarefas automáticas:

- novo fresh remap;
- extração adicional apenas para reduzir `index.html`;
- reescrita completa do frontend;
- reorganização de código sem objetivo funcional.
