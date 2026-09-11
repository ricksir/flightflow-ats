# FlightFlow ATS

Ambiente interativo para análise e visualização do ciclo de vida de planos de voo, históricos ATS, rota processada, fixos, eventos e coordenação entre órgãos.

> **Status do repositório:** fase de **Release Readiness**. O núcleo temporal/espacial, a navegação e as regressões críticas possuem cobertura automatizada; a modularização do antigo monólito segue incremental e não deve alterar os contratos funcionais protegidos.

## Executar

A aplicação continua sem build obrigatório:

1. abra `index.html` no Chrome/Edge/Firefox;
2. carregue o histórico desejado;
3. use timeline, mapa, Rota Processada e ferramentas normalmente.

Alguns recursos cartográficos e consultas dependem de acesso à internet; a aplicação também possui dados e recursos locais/offline.

## Verificação completa

Com Node.js 22+ e dependências instaladas:

```bash
npm install
npm run check
```

O comando executa:

- auditoria estática;
- inventário de funções;
- testes Node;
- testes de interface com Playwright.

Os mesmos gates são exigidos pelo GitHub Actions para pull requests e pushes em `main`.

## Contratos críticos protegidos

A evolução do FlightFlow deve preservar, entre outros:

- DEP como referência temporal;
- nenhum fixo intermediário pulado;
- aeronave renderizada sobre os checkpoints da rota;
- equivalência entre avanço e retrocesso;
- equivalência entre Próximo, Anterior, timeline, scrubber, teclado e autoplay;
- sequência crítica `PADIL → IRISO → LIBEC → EGDOD → IBGAM → PMS → ILVES → MASVA`;
- ILVES 01:34 antes de MASVA 01:36.

Veja `docs/RELEASE-READINESS.md` e `docs/REGRESSION-CHECKLIST.md`.

## Estrutura

- `index.html` — aplicação executável e núcleo ainda em modularização progressiva;
- `src/` — módulos já extraídos por domínio, incluindo core, timeline, rota, mapa, geografia, storage e UI;
- `tests/` — contratos Node e regressões E2E/Playwright;
- `docs/` — arquitetura, auditorias, planos de teste, regressões e critérios de release;
- `tools/` — auditoria estática, inventário e utilitários de manutenção;
- `baseline/` — referência congelada da versão original;
- `AGENTS.md` — regras para agentes automatizados trabalharem no projeto sem mudanças destrutivas.

## Princípio de desenvolvimento

Toda mudança deve seguir:

**entender → reproduzir → planejar → alterar minimamente → verificar → revisar → registrar**.

Correções de bugs devem gerar um caso de regressão correspondente. Mudanças em navegação, rota processada, movimento ou `goTo()` exigem cobertura adequada antes do merge.

## Release Readiness

A versão estável só deve ser marcada quando:

1. todos os quality gates estiverem verdes no mesmo SHA;
2. o log bruto do Playwright estiver sem `flaky`, retry ou `SPATIAL_EQ_DIAG`;
3. a aceitação manual descrita em `docs/RELEASE-READINESS.md` estiver concluída;
4. não houver regressão crítica conhecida aberta;
5. a documentação corresponder ao comportamento efetivamente entregue.

A modularização adicional pode continuar depois da versão estável como manutenção arquitetural.

## Segurança

Este projeto contém dados e conhecimento operacional ATS embutidos. **Mantenha o repositório privado** até concluir a sanitização e uma revisão específica de conteúdo publicável.

## Baseline original

Arquivo de origem: `FlightFlow_TIOP_CINDACTA1_NOVO.html`

SHA-256 da versão recebida:

`1a4ec449abd99ac34ffd5eeec91baa2c9975058b9459bf1952309c2fe0eac96f`

Veja `docs/AUDIT-BASELINE.md` para a auditoria inicial.
