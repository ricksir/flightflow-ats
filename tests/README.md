# Testes

O FlightFlow ATS possui cobertura automatizada em duas camadas principais:

- **Node.js** — contratos de módulos, parser, rota, timeline, navegação, storage e regressões de históricos representativos;
- **Playwright** — comportamento real da interface, equivalência espacial, teclado, timeline, transporte, autoplay e integração dos módulos no navegador.

## Executar

Testes Node:

```bash
npm test
```

Testes de interface:

```bash
npm run test:ui
```

Auditoria estática:

```bash
npm run audit
```

Inventário de funções:

```bash
npm run inventory
```

Verificação completa:

```bash
npm run check
```

## Regressão crítica protegida

O conjunto automatizado protege o trecho:

`PADIL → IRISO → LIBEC → EGDOD → IBGAM → PMS → ILVES → MASVA`

incluindo:

- ILVES 01:34 antes de MASVA 01:36;
- avanço 78 → 79 sem pular fixos;
- retrocesso 79 → 78 pela sequência inversa;
- aeronave exatamente sobre os checkpoints;
- equivalência entre Próximo, timeline, scrubber, teclado e autoplay;
- DEP como referência temporal do perfil de movimento;
- troca real de arquivo limpando a sessão anterior antes de carregar o novo histórico.

## Históricos representativos

Os testes Node também cobrem regressões observadas em históricos representativos, incluindo:

- GLO7634 — rota quebrada em continuação multilinha;
- TAM3774 — ETIM atravessando meia-noite e fixos com mesmo horário;
- PSFBU — atualização posterior do IDPLANO.

## Critério de release

O conjunto automatizado é obrigatório, mas não substitui a aceitação manual de produto. Os critérios completos estão em:

`docs/RELEASE-READINESS.md`
