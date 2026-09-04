# FlightFlow ATS

Ambiente interativo para análise e visualização do ciclo de vida de planos de voo, históricos ATS, rota processada, fixos, eventos e coordenação entre órgãos.

> **Status do repositório:** baseline preservado. A primeira etapa não altera a lógica do programa; ela cria uma base segura para evolução, testes e refatoração incremental.

## Executar

O programa atual continua sem build e sem instalação:

1. abra `index.html` no Chrome/Edge/Firefox;
2. carregue o histórico desejado;
3. use a timeline, mapa e ferramentas normalmente.

Alguns recursos cartográficos e consultas dependem de acesso à internet; a aplicação também possui dados e recursos locais/offline.

## Estrutura

- `index.html` — versão executável atual, inicialmente idêntica ao arquivo recebido;
- `baseline/` — cóia congelada da versão original para comparação/regressão;
- `docs/` — arquitetura, auditoria, roadmap e checklist funcional;
- `tools/` — verificações estáticas e utilitários de manutenção;
- `tests/` — testes automatizados e casos de regressão a serem ampliados;
- `src/` — destino da modularização futura; nesta fase ainda não substitui o monólito;
- `AGENTS.md` — regras para ChatGPT/Codex/Claude e outros agentes trabalharem no projeto sem alterações destrutivas.

## Princípio de desenvolvimento

Toda mudança deve seguir:

**entender → reproduzir → planejar → alterar minimamente → verificar → revisar → registrar**.

Correções de bugs devem gerar um caso de regressão correspondente.

## Segurança

Este projeto contém dados e conhecimento operacional ATS embutidos. **Mantenha o repositório privado** até concluir a sanitização e uma revisão específica de conteúdo publicável.

## Baseline

Arquivo de origem: `FlightFlow_TIOP_CINDACTA1_NOVO.html`

SHA-256 da versão recebida:

`1a4ec449abd99ac34ffd5eeec91baa2c9975058b9459bf1952309c2fe0eac96f`

Veja `docs/AUDIT-BASELINE.md` para a auditoria inicial.
