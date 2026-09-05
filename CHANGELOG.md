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

## Engenharia incremental — 2026-09-05

- corrigida a classificação visual de planos `INATIVO` para tema não controlado/cinza, preservando prioridades especiais;
- extraídos `normalizeCoordinateInput`, `validAerodromeCoordinate`, `formatGeoCoord` e `atsCoordinateLabel` para `src/geo/coordinate-utils.js`;
- adicionados contratos Node e Chrome para a nova fronteira `FlightFlowCoordinateUtils`;
- nenhuma lógica de timeline, rota processada, aeronave ou mapa foi reescrita durante a extração.

- movidos `getPath` e `setPath` do IIFE principal para a fronteira existente `FlightFlowCoreUtils`, preservando seus corpos e consumidores;
- ampliados os contratos Node e Chrome de `CoreUtils` para 11 utilitários e atualizado o baseline estrutural do núcleo.
- Extraído o controlador de playback (`startPlayback`, `stopPlayback`, `togglePlayback`, `scheduleNext`) para `src/timeline/playback-controller.js`, com fábrica de dependências explícitas e regressões Node/Chrome.
