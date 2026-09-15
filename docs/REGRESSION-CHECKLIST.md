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

- [ ] fixos históricos permanecem na ordem original do histórico.
- [ ] ETIM não aparece fora de sequência.
- [ ] nenhum fixo existente no intervalo entre dois eventos é pulado.
- [ ] aeronave cruza visualmente o ponto do fixo correspondente.
- [ ] avanço e retrocesso usam a mesma geometria.
- [ ] pontos de continuação declarada sem ETIM permanecem sem tempo inventado.
- [ ] sem Ordem TER, não existe fechamento espacial sintético até o ADES.
- [ ] com Ordem TER, o fechamento até o ADES é explicitamente marcado como derivado/não histórico.
- [ ] o fechamento por Ordem TER não cria ETIM, CFL, STAR nem fixos intermediários.
- [ ] Anterior a partir da Ordem TER retorna ao estado espacial imediatamente anterior.
- [ ] o ADES derivado por Ordem TER não vira checkpoint ETIM histórico.
- [ ] a conexão ao destino só ocorre quando existir evidência operacional aplicável ou a regra explícita de fechamento por Ordem TER.

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

## Casos críticos conhecidos para manter como teste

Em trechos onde há múltiplos fixos entre dois eventos nativos da timeline, a animação deve criar/usar etapas intermediárias e passar por cada fixo em ordem, sem saltar diretamente para o ponto posterior.

Para o TAM3774:

- [ ] preservar os 18 pontos históricos de SBBR até IMTBI;
- [ ] preservar a continuação declarada UZ5 `VULRU → UBNID → GIKLU → USVIG → UMGUL` sem ETIM inventado;
- [ ] sem Ordem TER, não movimentar a aeronave sinteticamente até SBCT;
- [ ] na Ordem TER, permitir somente o fechamento derivado direto até SBCT, claramente identificado como não histórico;
- [ ] Próximo até TER termina no ADES e Anterior a partir de TER restaura o estado pré-TER.
