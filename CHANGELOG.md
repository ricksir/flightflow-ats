# Changelog

## Unreleased

## 0.2.0 — 2026-09-11

- corrigida a classificação visual de planos `INATIVO` no strip: passam a usar o tema não controlado (cinza) em vez do tema controlado (preto);
- operações cujo texto contém “Arquivo” deixam de marcar indevidamente um plano `INATIVO` como finalizado;
- preservadas as prioridades de alerta/emergência, RVSM, doador e receptor acima da regra de `INATIVO`;
- adicionada regressão baseada nos 10 eventos `INATIVO` do histórico de demonstração;
- corrigida a resolução prematura do botão Play na extração do controlador: `getPlayBtn` agora preserva o acesso ao DOM somente após `cacheElements()`;
- extraídos `normalizeCoordinateInput`, `validAerodromeCoordinate`, `formatGeoCoord` e `atsCoordinateLabel` para `src/geo/coordinate-utils.js`;
- movidos `getPath` e `setPath` do IIFE principal para a fronteira existente `FlightFlowCoreUtils`, preservando seus corpos e consumidores;
- extraído o controlador de playback (`startPlayback`, `stopPlayback`, `togglePlayback`, `scheduleNext`) para `src/timeline/playback-controller.js`, com dependências explícitas e resolução tardia do botão Play via `getPlayBtn`;
- ampliados os contratos Node/Chrome das fronteiras extraídas e atualizado o baseline estrutural do núcleo, sem reescrever timeline, rota processada, aeronave ou mapa;
- protegida a regressão espacial crítica para impedir salto de fixos no trecho `PADIL → IRISO → LIBEC → EGDOD → IBGAM → PMS → ILVES → MASVA`, incluindo ordem inversa no retrocesso e posicionamento da aeronave sobre os fixos;
- protegida a ordem temporal `ILVES 01:34` antes de `MASVA 01:36` e preservado DEP como referência temporal;
- protegido automaticamente o contrato de endpoint da rota `SBBS → … → MASVA → SBPJ`, com término em 100%;
- concluído o Release Readiness com Static audit, Function declaration inventory, Node tests, Browser availability e Playwright verdes;
- suíte Playwright estabilizada em exatamente 46 testes, com execução final de `46 passed`, zero flaky, zero retry e zero `SPATIAL_EQ_DIAG`;
- concluída a aceitação operacional manual em navegador com os históricos `GLO1762` e `TAM3720`, cobrindo DEP, Próximo/Anterior, timeline, scrubber, teclado, autoplay, STRIP, FPV, Rota Processada, troca de histórico e fechamento/arquivamento da rota;
- publicada a release estável `FlightFlow ATS v0.2.0` na tag `v0.2.0`, apontando para o commit `e089820456c08eb42df968faa9da59b062a32b6f`.

## 0.1.0 — 2026-09-04

- importação da versão recebida como baseline imutável;
- criação de `AGENTS.md` com regras para desenvolvimento assistido por IA;
- documentação inicial de arquitetura, riscos e roadmap;
- checklist de regressão funcional;
- auditoria estática de JavaScript;
- nenhuma alteração funcional no FlightFlow nesta fase.
