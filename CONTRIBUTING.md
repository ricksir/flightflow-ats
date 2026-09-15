# Contribuindo com o FlightFlow ATS

Obrigado por contribuir. O projeto prioriza estabilidade operacional, mudanças pequenas e regressões reproduzíveis.

## Antes de começar

1. leia `README.md`;
2. leia `AGENTS.md` se estiver usando assistência automatizada;
3. consulte `docs/AI_CURRENT_STATE.md` para o estado técnico atual;
4. identifique os testes que protegem a área que será alterada.

## Branches

Use branches curtas e orientadas ao objetivo:

- `fix/<descricao>`
- `feat/<descricao>`
- `docs/<descricao>`
- `test/<descricao>`
- `chore/<descricao>`

Branches temporárias fechadas são removidas automaticamente quando pertencem aos prefixos de manutenção configurados no workflow de housekeeping. Branches `release/*` são preservadas.

## Mudanças

Prefira alterações cirúrgicas. Não faça refatorações adjacentes apenas por estética.

Áreas de alto risco incluem:

- timeline e scrubber;
- `goTo()`;
- rota processada e ETIM;
- movimento da aeronave;
- mapa e coordenadas;
- parser de históricos;
- persistência.

A rodada contínua de modularização já foi encerrada. Uma nova extração precisa estar ligada a uma necessidade funcional, correção ou decisão arquitetural explícita.

## Testes

Antes de abrir um PR, execute:

```bash
npm install
npm run check
```

Para mudanças críticas, confirme no log:

- 46 passed;
- 0 flaky;
- 0 retry;
- 0 `SPATIAL_EQ_DIAG`;
- 0 failed.

## Pull requests

O PR deve registrar:

- objetivo;
- causa/motivação;
- escopo;
- testes executados;
- risco residual.

Correções de bugs devem incluir regressão automatizada quando possível.

## Segurança

Não versione credenciais, tokens, chaves, senhas ou dados pessoais desnecessários. Consulte `SECURITY.md`.
