# Changelog

## Unreleased

- corrigida a classificação visual de planos `INATIVO` no strip: passam a usar o tema não controlado (cinza) em vez do tema controlado (preto);
- operações cujo texto contém “Arquivo” deixam de marcar indevidamente um plano `INATIVO` como finalizado;
- preservadas as prioridades de alerta/emergência, RVSM, doador e receptor acima da regra de `INATIVO`;
- adicionada regressão baseada nos 10 eventos `INATIVO` do histórico de demonstração.

## 0.1.0 — 2026-09-04

- importação da versão recebida como baseline imutável;
- criação de `AGENTS.md` com regras para desenvolvimento assistido por IA;
- documentação inicial de arquitetura, riscos e roadmap;
- checklist de regressão funcional;
- auditoria estática de JavaScript;
- nenhuma alteração funcional no FlightFlow nesta fase.
