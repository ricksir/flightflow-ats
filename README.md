# FlightFlow ATS

Aplicação web para análise e visualização de históricos ATS, ciclo de vida de planos de voo, rota processada, fixos, eventos e coordenação entre órgãos.

## Estado do projeto

- **Release estável:** `v0.2.0`
- **Execução:** aplicação web sem etapa obrigatória de build
- **Branch de referência:** `main`
- **Quality gates:** auditoria estática, inventário de funções, testes Node, disponibilidade do navegador e Playwright
- **Modularização contínua:** encerrada após o PR #211; novas extrações só devem ocorrer quando houver necessidade funcional concreta

O projeto permanece em manutenção evolutiva. A rodada de modularização do ciclo v0.3.0 reduziu o acoplamento do núcleo e consolidou módulos já extraídos em `src/`, sem alterar os contratos temporais e espaciais protegidos.

## Executar

Forma recomendada:

```bash
npm install
npm start
```

Depois, abra no navegador:

```text
http://127.0.0.1:4173
```

O servidor local usa apenas recursos nativos do Node.js e não adiciona dependências de runtime.

Como alternativa, a aplicação também pode ser aberta diretamente pelo arquivo `index.html` em Chrome, Edge ou Firefox.

Depois de abrir a aplicação:

1. carregue o histórico desejado;
2. utilize timeline, mapa, Rota Processada, STRIP, FPV e demais ferramentas normalmente.

Alguns recursos cartográficos e consultas externas dependem de conectividade, mas o projeto também mantém dados e recursos locais.

## Desenvolvimento e verificação

Requisitos:

- Node.js 22+
- Python 3
- dependências do projeto instaladas com `npm install`

Verificação completa:

```bash
npm install
npm run check
```

O comando executa, em sequência:

1. **Static audit**
2. **Function declaration inventory**
3. testes de regressão Node
4. testes de interface Playwright

Os mesmos gates são exigidos pelo GitHub Actions em pull requests e pushes para `main`.

## Contratos críticos protegidos

Mudanças não podem introduzir regressões em:

- DEP como referência temporal;
- passagem por todos os fixos intermediários;
- aeronave exatamente sobre os checkpoints correspondentes;
- equivalência entre avanço e retrocesso;
- equivalência entre Próximo, Anterior, timeline, scrubber, teclado e autoplay;
- sequência crítica `PADIL → IRISO → LIBEC → EGDOD → IBGAM → PMS → ILVES → MASVA`;
- `ILVES 01:34` antes de `MASVA 01:36`;
- fechamento do perfil de rota no destino esperado.

Consulte `docs/REGRESSION-CHECKLIST.md` e `docs/RELEASE-READINESS.md`.

## Estrutura do repositório

```text
.
├── index.html              # aplicação e orquestração principal
├── src/                    # módulos por domínio
├── tests/                  # contratos Node e regressões E2E/Playwright
├── docs/                   # arquitetura, operação, regressão e histórico técnico
├── tools/                  # auditoria estática e inventário
├── .github/                # workflow e template de pull request
├── AGENTS.md               # regras para agentes automatizados
├── CHANGELOG.md            # histórico de versões
├── package.json            # scripts e dependências de desenvolvimento
└── playwright.config.js    # configuração E2E
```

Um mapa da documentação está disponível em `docs/README.md`.

## Princípio de desenvolvimento

Toda mudança deve seguir:

**entender → reproduzir → alterar minimamente → verificar → revisar → registrar**

Não abrir novas rodadas de remapeamento/refatoração automaticamente. O trabalho futuro deve ser motivado por bug, melhoria funcional, manutenção necessária ou preparação de release.

## Contribuição e segurança

Consulte `CONTRIBUTING.md` antes de abrir mudanças e `SECURITY.md` para orientações sobre conteúdo sensível e relato de vulnerabilidades.

Branches temporárias encerradas são higienizadas automaticamente pelo workflow de housekeeping; branches `release/*`, protegidas, abertas ou sem histórico de PR fechado são preservadas.

## Release Readiness

Para qualquer nova versão estável:

1. todos os quality gates devem estar verdes no mesmo SHA;
2. o Playwright deve terminar sem `flaky`, retry ou `SPATIAL_EQ_DIAG`;
3. a aceitação operacional aplicável deve estar registrada;
4. não pode haver regressão crítica conhecida aberta;
5. documentação e changelog devem refletir o comportamento entregue.

## Segurança e publicação

O repositório é público. Portanto:

- não versionar credenciais, tokens, chaves ou segredos;
- não adicionar dados pessoais desnecessários;
- revisar qualquer novo conteúdo operacional antes do commit;
- manter arquivos locais sensíveis fora do Git e cobertos por `.gitignore`.

## Histórico

A release `v0.2.0` e o histórico de evolução estão documentados em `CHANGELOG.md`. O estado técnico mais recente para continuidade assistida por IA fica em `docs/AI_CURRENT_STATE.md`.
