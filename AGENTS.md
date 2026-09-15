# FlightFlow ATS — instruções para agentes de IA

Este arquivo define as regras permanentes para agentes automatizados que trabalhem neste repositório.

## 1. Objetivo

Evoluir o FlightFlow ATS preservando a fidelidade temporal e espacial do plano de voo, a leitura dos históricos ATS e a estabilidade da interface.

## 2. Regras obrigatórias

1. **Entenda antes de editar.** Identifique causa, arquivos afetados e risco de regressão.
2. **Faça mudanças cirúrgicas.** Não refatore áreas adjacentes sem necessidade para o objetivo atual.
3. **Preserve os contratos protegidos.** O baseline lógico é mantido por testes, checksums documentados e `docs/AUDIT-BASELINE.md`; não invente ou recrie um diretório `baseline/`.
4. **Não masque bugs com UI.** Corrija a lógica de dados/estado antes de compensar visualmente.
5. **Timeline e rota são determinísticas.** Avançar, retroceder, clicar em evento e autoplay devem convergir para o mesmo estado no mesmo índice.
6. **Não salte fixos processados.** A transição visual deve respeitar a ordem dos fixos do intervalo.
7. **Troca de histórico limpa estado derivado.** Nenhuma sessão anterior pode contaminar a nova análise.
8. **Persistência deve continuar compatível.** Mudanças em IndexedDB/localStorage exigem migração ou fallback seguro.
9. **Sem segredos no código.** Nunca versionar chaves, tokens, senhas ou credenciais.
10. **Repositório público.** Não adicionar dados pessoais desnecessários nem conteúdo operacional que não tenha sido revisado para publicação.

## 3. Antes de qualquer alteração

- leia `docs/AI_CURRENT_STATE.md`;
- confirme o SHA atual de `main`;
- confira PRs abertos e workflows recentes;
- descreva o comportamento observado e esperado quando houver bug;
- encontre a menor fronteira de correção;
- identifique os testes que protegem a área afetada.

## 4. Quality gates obrigatórios

Mudanças em produção ou documentação relevante devem preservar:

1. **Static audit**;
2. **Function declaration inventory**;
3. **Timeline and route regression tests / Node**;
4. **Browser availability**;
5. **UI navigation regression tests / Playwright**.

Para mudanças de alto risco, o Playwright deve terminar com:

- 46 passed;
- 0 flaky;
- 0 retry;
- 0 `SPATIAL_EQ_DIAG`;
- 0 failed.

## 5. Hotspots de alto risco

Trate com proteção reforçada:

- parser e múltiplas fontes de histórico;
- timeline, scrubber e navegação;
- rota processada e ETIM;
- `goTo()`;
- movimento/interpolação da aeronave;
- fixos, aeródromos e camadas FIR/TMA/ACC/APP/TWR;
- mapa e coordenadas geográficas;
- IndexedDB/localStorage;
- motor de IA e base de conhecimento.

## 6. Regressões prioritárias

Quando a mudança tocar timeline, rota, mapa ou histórico, valide no mínimo:

- Anterior / Próximo;
- clique direto em evento;
- scrubber;
- teclado;
- autoplay;
- avanço e retrocesso pelo mesmo trecho;
- todos os fixos intermediários;
- aeronave sobre o fixo correspondente;
- ordem cronológica dos ETIM;
- último fixo → destino;
- troca de histórico sem resíduos;
- DEP como referência temporal quando aplicável.

Sequência crítica protegida:

`PADIL → IRISO → LIBEC → EGDOD → IBGAM → PMS → ILVES → MASVA`

## 7. Regra de modularização

A rodada contínua de modularização foi encerrada após o PR #211.

**Não criar fresh remap automaticamente.**
**Não extrair funções apenas para reduzir o tamanho do IIFE.**

Novas extrações só são justificadas quando:

- simplificarem uma mudança funcional concreta;
- corrigirem um bug;
- reduzirem risco de manutenção em uma área que precisa ser alterada;
- forem necessárias para uma decisão arquitetural explícita.

Nesses casos, preservar contrato, comportamento e cobertura correspondente.

## 8. Definição de pronto

Uma tarefa só está concluída quando:

- o objetivo está verificavelmente resolvido;
- os gates aplicáveis estão verdes;
- o diff contém apenas mudanças necessárias;
- não há regressão crítica introduzida;
- documentação/changelog foram atualizados quando necessário;
- o estado de `main` está claramente registrado quando a tarefa alterar a continuidade do projeto.
