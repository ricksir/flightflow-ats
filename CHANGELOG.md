# Changelog

## Unreleased

- documentação do repositório reorganizada e alinhada ao estado atual;
- adicionadas políticas de contribuição e segurança;
- adicionado housekeeping de branches temporárias encerradas para evitar novo acúmulo no GitHub;
- refinada a **Rota Processada** para alta densidade: legenda recolhível, faixa explicativa separada, Modo foco, labels prioritários e seleção por mouse/teclado, sem alteração de `goTo()` ou da lógica temporal;
- implementado o **fechamento terminal derivado por Ordem TER**: o ADES pode encerrar visualmente o perfil somente após o evento TER, com trecho explicitamente não histórico e sem fabricar ETIM, CFL, STAR ou fixos intermediários;
- incorporado o ARP oficial de **SBCT** à base offline mínima para permitir o encerramento terminal do TAM3774 sem depender de WFS/proxy;
- alinhado o fechamento terminal ao ADES oficial e suprimida a rota legada concorrente durante a Rota Processada, evitando endpoint divergente por coordenada customizada/stale;
- consolidado o **FlightFlow ATS Design System 1.0**, com tokens de spacing/tipografia/radius, temas claro/escuro, hierarquia de shell, mapa dominante, inspector/timeline, transporte, responsividade e focus-visible;
- adicionada `docs/DESIGN_SYSTEM.md` e contratos Node/Playwright para estrutura visual, legibilidade, dark theme, foco por teclado e layout vertical abaixo de 900 px;
- corrigido o **pisca da linha terminal da Ordem TER** na Rota Processada: o SVG agora é montado fora do DOM observado e substituído atomicamente, evitando frame intermediário sem `UMGUL → SBCT`;
- adicionados contratos Node/Playwright específicos para pré-TER → TER → pós-TER → retrocesso → TER, endpoint oficial do ADES, segmento único e ausência de ETIM/CFL/STAR inventados;
- sincronização da Rota Processada após Próximo/Anterior, scrubber e setas movida para microtask do mesmo evento, eliminando a defasagem entre índice nativo e geometria terminal sem alterar `goTo()`;
- certificação final do PR #230 e pós-merge workflow #579: **635/635 testes Node + 52/52 Playwright**, com zero failed, flaky, retry e `SPATIAL_EQ_DIAG`;

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
