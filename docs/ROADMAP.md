# Roadmap técnico

## Fase 0 — baseline e proteção

- [x] congelar arquivo recebido;
- [x] registrar checksum;
- [x] criar regras de agente;
- [x] criar auditoria estática;
- [x] criar checklist de regressão;
- [x] criar repositório GitHub privado;
- [ ] executar smoke test visual completo.

## Fase 1 — testes antes da refatoração

- [ ] automatizar carregamento inicial;
- [ ] fixtures de histórico;
- [ ] teste determinístico de timeline;
- [ ] teste de ordenação ETIM/fixos;
- [ ] teste de troca/reset de histórico;
- [ ] teste DEP → estimados.

## Fase 2 — extrações de baixo risco

- [ ] mover base geográfica para arquivo dedicado;
- [ ] mover dados/knowledge estáticos;
- [ ] extrair parser sem alterar API pública;
- [ ] extrair persistência.

## Fase 3 — núcleo temporal e espacial

- [ ] separar timeline/estado;
- [ ] separar rota processada;
- [ ] separar interpolação/movimento da aeronave;
- [ ] adicionar testes de ida/volta/autoplay.

## Fase 4 — UI

- [ ] separar CSS por domínio;
- [ ] remover patches CSS obsoletos apenas após comparação visual;
- [ ] padronizar componentes e acessibilidade.

## Fase 5 — segurança e distribuição

- [ ] sanitizar conteúdo incorporado;
- [ ] remover dados pessoais não necessários;
- [ ] revisar o que pode ser publicado;
- [ ] configurar CI e releases.
