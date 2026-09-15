# Prompt padrão para pedir mudanças no FlightFlow

Use este formato ao solicitar uma correção ou melhoria a um agente de IA.

```text
TAREFA
[descreva uma única mudança]

PROBLEMA OBSERVADO
[o que acontece hoje]

COMPORTAMENTO ESPERADO
[o que deveria acontecer]

REPRODUÇÃO
1. ...
2. ...
3. ...

RESTRIÇÕES
- Não alterar funcionalidades não relacionadas.
- Preservar os contratos, checksums e regressões protegidos.
- Não apagar persistência do usuário.
- Não introduzir dependência de rede sem fallback.

ANTES DE CODIFICAR
0. leia `docs/AI_CURRENT_STATE.md` e confirme o estado atual do GitHub;
1. encontre a causa raiz;
2. identifique os blocos/arquivos afetados;
3. proponha a menor correção;
4. defina os testes que provarão a correção.

TESTES OBRIGATÓRIOS
- caso principal;
- avanço;
- retrocesso;
- autoplay, se aplicável;
- troca de histórico, se aplicável;
- regressões diretamente relacionadas.

ENTREGA
- explique a causa;
- descreva a alteração;
- liste os testes executados;
- informe qualquer risco residual.
```

## Exemplo: salto de fixos

```text
TAREFA
Corrigir salto de fixos durante a transição entre eventos da timeline.

PROBLEMA OBSERVADO
A aeronave avança do estado anterior para um ponto posterior sem passar visualmente pelos fixos intermediários existentes na rota processada.

COMPORTAMENTO ESPERADO
A transição deve respeitar todos os fixos cujo ETIM esteja entre os dois eventos, na ordem cronológica, e a aeronave deve passar sobre suas coordenadas.

ANTES DE CODIFICAR
Verifique separadamente: ordenação dos snapshots, ETIM, construção da rota, interpolação e sincronização do evento nativo.

TESTES
Executar a mesma transição por Próximo, Anterior, clique, scrubber e autoplay.
```
