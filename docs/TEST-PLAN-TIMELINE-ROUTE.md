# Plano de testes — timeline, rota processada e movimento da aeronave

Branch: `test/timeline-route-regression`

## Objetivo

Transformar os bugs já observados no FlightFlow em contratos de regressão antes de alterar o núcleo temporal/espacial.

## Invariantes principais

1. Para o mesmo histórico e o mesmo índice lógico, Próximo, Anterior, clique, scrubber e autoplay devem convergir para o mesmo estado.
2. Fixos processados devem permanecer em ordem cronológica de ETIM.
3. Nenhum fixo cujo ETIM esteja entre dois eventos nativos pode ser omitido da trajetória visual.
4. Ao atingir o instante de um fixo, a posição renderizada da aeronave deve coincidir com as coordenadas desse fixo dentro da tolerância definida.
5. Retroceder pelo mesmo trecho deve reconstruir a mesma geometria em ordem inversa, sem saltos adicionais.
6. O último fixo da rota deve conectar ao aeródromo de destino.
7. A mensagem DEP deve estabelecer/recalibrar a referência temporal usada pelos estimados posteriores quando essa regra estiver ativa.
8. Trocar de histórico deve invalidar todos os estados derivados da rota/timeline anterior.

## Caso crítico — eventos 78 → 79

Manter como fixture permanente o cenário no qual a transição entre eventos nativos contém diversos fixos intermediários. O teste deve provar que a aeronave não salta do trecho anterior a PADIL para o trecho posterior a MASVA.

Validar também a ordenação de horários, inclusive o caso observado em que ILVES 01:34 não pode aparecer depois de MASVA 01:36.

## Formas de navegação a comparar

Para a mesma transição:

- botão Próximo;
- botão Anterior;
- clique direto no evento;
- scrubber;
- setas do teclado;
- autoplay.

O estado final correspondente ao mesmo instante/índice deve ser equivalente.

## Dados a capturar por snapshot

- índice lógico;
- índice/evento nativo de origem;
- timestamp do evento;
- callsign/ID do plano;
- posição da aeronave;
- fixo atual/anterior/próximo;
- ETIM associado;
- sequência de fixos da rota processada;
- origem/destino;
- estado do autoplay;
- estado derivado após DEP.

## Critério de aprovação inicial

A Fase 1 só termina quando os testes conseguem detectar automaticamente pelo menos:

- reordenação de ETIM;
- salto de fixo intermediário;
- divergência Próximo × clique × scrubber;
- divergência avanço × retrocesso;
- resíduo de estado após troca de histórico;
- quebra do vínculo último fixo → destino.
