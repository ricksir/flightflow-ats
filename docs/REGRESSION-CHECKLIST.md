# Checklist de regressão funcional

Use este checklist em qualquer mudança que toque histórico, rota, mapa, timeline ou movimento da aeronave.

## A. Inicialização

- [ ] `index.html` abre sem erro fatal.
- [ ] tema e layout aparecem corretamente.
- [ ] controles principais respondem.
- [ ] aplicação funciona no cenário offline previsto.
- [ ] recursos online falham de forma controlada quando indisponíveis.

## B. Histórico

- [ ] carregar um histórico.
- [ ] carregar uma segunda fonte quando aplicável.
- [ ] trocar para outro histórico limpa rota/eventos derivados da sessão anterior.
- [ ] arquivo/nome da fonte exibido corresponde à fonte ativa.

## C. Timeline

- [ ] Próximo avança exatamente um passo lógico.
- [ ] Anterior retorna de forma determinística.
- [ ] clique em evento sincroniza todos os painéis.
- [ ] scrubber sincroniza todos os painéis.
- [ ] setas do teclado não geram estado diferente dos botões.
- [ ] autoplay percorre a mesma sequência do avanço manual.

## D. Rota processada

- [ ] fixos estão em ordem cronológica.
- [ ] ETIM não aparece fora de sequência.
- [ ] nenhum fixo existente no intervalo entre dois eventos é pulado.
- [ ] aeronave cruza visualmente o ponto do fixo correspondente.
- [ ] avanço e retrocesso usam a mesma geometria.
- [ ] último fixo conecta corretamente ao destino.

## E. DEP e temporização

- [ ] evento/mensagem DEP marca o início efetivo da evolução do voo.
- [ ] horários derivados posteriores são recalculados/atualizados conforme a regra implementada.
- [ ] o reposicionamento temporal não reordena fixos incorretamente.

## F. Geografia

- [ ] origem e destino são localizados.
- [ ] atualização/cadastro de aeródromo altera também o nome exibido quando previsto.
- [ ] fixos usam coordenadas corretas da base ativa.
- [ ] camadas FIR/TMA/ACC/APP/TWR preservam seleção e visibilidade.

## G. Persistência

- [ ] preferências sobrevivem ao reload quando esperado.
- [ ] IndexedDB permanece legível.
- [ ] localStorage legado não quebra a inicialização.
- [ ] exportação/backup continua possível.

## Caso crítico conhecido para manter como teste

Em trechos onde há múltiplos fixos entre dois eventos nativos da timeline, a animação deve criar/usar etapas intermediárias e passar por cada fixo em ordem, sem saltar diretamente para o ponto posterior.
