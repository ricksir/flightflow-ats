# Release Readiness — FlightFlow ATS

Este documento define quando o FlightFlow ATS pode ser considerado pronto para uma versão estável.

## Estado de referência

- Branch de referência: `main`.
- Baseline arquitetural protegido pelo teste `tests/main-kernel-contract.test.js`.
- A aplicação continua executável diretamente por `index.html`, sem etapa de build.
- Os módulos extraídos vivem em `src/` e são carregados explicitamente antes do núcleo principal.
- Toda mudança em `main` deve passar pelos quality gates do GitHub Actions.

## Gates obrigatórios

Um commit candidato a release só pode ser aceito quando todos os gates abaixo estiverem verdes:

1. **Static audit** — `npm run audit`.
2. **Function declaration inventory** — `npm run inventory`.
3. **Node regression tests** — `npm test`.
4. **Browser availability** — Google Chrome disponível no runner.
5. **Playwright UI regression tests** — `npm run test:ui`.

Além do status verde do workflow, o log bruto do Playwright deve terminar sem `flaky`, sem retry e sem `SPATIAL_EQ_DIAG`.

## Invariantes de voo protegidos

A release não pode alterar estes contratos sem uma decisão explícita e novos testes equivalentes:

- DEP permanece como referência temporal do perfil de movimento.
- Nenhum fixo intermediário pode ser pulado.
- A aeronave deve ser renderizada sobre o fixo correspondente quando esse checkpoint é cruzado.
- Avanço e retrocesso devem percorrer a mesma geometria em sentidos opostos.
- Próximo, Anterior, timeline, scrubber, teclado e autoplay devem convergir para o mesmo estado lógico/espacial.
- O trecho crítico 78 → 79 preserva, nesta ordem:

`PADIL → IRISO → LIBEC → EGDOD → IBGAM → PMS → ILVES → MASVA`

- `ILVES 01:34` deve permanecer antes de `MASVA 01:36`.
- O retrocesso 79 → 78 deve usar a sequência inversa.

## Evidência automatizada atual

Os contratos acima são cobertos, entre outros, por:

- `tests/route-regression.test.js`;
- `tests/e2e/aircraft-fix-spatial-regression.spec.js`;
- `tests/e2e/navigation-spatial-equivalence.spec.js`;
- `tests/e2e/ui-navigation.spec.js`;
- `tests/e2e/keyboard-navigation-contract.spec.js`;
- `tests/e2e/playback-controller.spec.js`;
- `tests/e2e/transport-navigation-contract.spec.js`;
- `tests/go-to-transition-contract.test.js`;
- `tests/render-current-orchestration-contract.test.js`.

A troca real de arquivo também é exercitada em `tests/e2e/ui-navigation.spec.js`: o cenário injeta estado derivado da sessão anterior, seleciona um segundo histórico, confirma o reset `pending`, carrega o novo arquivo e verifica que a nova sessão começa no evento 1 sem snapshots, perfil de movimento ou rota processada marcados como resíduos da sessão anterior.

O mesmo arquivo E2E também cobre o uso normal dos painéis operacionais STRIP e FPV: abertura pelos toggles, preenchimento com callsign/origem/destino, reconhecimento de alterações da STRIP, minimização/restauração e atualização dos painéis durante Próximo/Anterior.

Também existem regressões baseadas em históricos operacionais representativos para:

- rota multilinha GLO7634;
- passagem de data/meia-noite TAM3774;
- atualização de IDPLANO PSFBU.

Esses casos estão em `tests/real-plan-route-regressions.test.js` e testes relacionados.

## Aceitação manual antes da versão estável

A automação não substitui a validação do produto com históricos representativos. Antes de criar a versão estável, executar e registrar:

- [ ] carregar pelo menos um histórico real representativo sem erro fatal;
- [ ] validar DEP e evolução temporal;
- [ ] validar Próximo e Anterior em um trecho com vários fixos;
- [ ] validar timeline e scrubber no mesmo instante;
- [ ] validar teclado;
- [ ] validar autoplay;
- [ ] confirmar que a aeronave passa pelos fixos esperados;
- [ ] trocar de histórico e confirmar que não há resíduo de rota/eventos anteriores;
- [ ] validar origem, destino e último fixo;
- [ ] validar STRIP e painéis operacionais usados no fluxo normal;
- [ ] executar `npm run check` no commit candidato;
- [ ] revisar o log bruto do Playwright.

## Critérios para declarar a fase concluída

A fase Release Readiness termina quando:

1. os gates automatizados estão verdes no mesmo SHA candidato;
2. a aceitação manual acima está registrada como concluída;
3. não existe regressão crítica conhecida aberta;
4. a documentação de execução/testes está coerente com o estado atual;
5. o commit candidato é marcado como versão estável.

A modularização adicional do `index.html` pode continuar depois disso como manutenção arquitetural. Ela não é, por si só, requisito para bloquear uma versão funcional quando os contratos acima estiverem protegidos.
