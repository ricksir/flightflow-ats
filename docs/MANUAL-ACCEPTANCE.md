# Aceitação Manual — `main` / FlightFlow ATS 0.2.1-dev

Este roteiro valida, em navegador real, as mudanças que estão no `main` e ainda não fazem parte da release estável `v0.2.0`.

## 1. Versão correta

Antes do teste:

- confirme que o código foi baixado da branch **`main`**;
- não use o ZIP da release/tag `v0.2.0` para avaliar as mudanças recentes;
- execute preferencialmente com `npm start`;
- abra `http://127.0.0.1:4173`;
- se já havia aberto uma cópia anterior, use **Ctrl+F5** para eliminar cache visual.

A versão de desenvolvimento esperada é **0.2.1-dev**.

## 2. Identidade e aparência

- [ ] O título/cabeçalho identifica o produto como **FlightFlow ATS**.
- [ ] Não aparece a identificação legada **`FlightFlow ATS - TIOP Cindacta1`**.
- [ ] Em **Configurações → Aparência** existem as opções claro, escuro e **Dashboard moderno**.
- [ ] Ao escolher **Dashboard moderno**, a alteração é visualmente perceptível no shell, topbar, workspace, inspector, tabs, timeline e transporte.
- [ ] Fechar/recarregar a página preserva a aparência escolhida.
- [ ] O mapa continua sendo a área visual dominante.

## 3. Rota Processada

Com um histórico representativo carregado:

- [ ] Abrir **Rota Processada** não cobre a rota com a faixa explicativa.
- [ ] A faixa explicativa aparece fora da área cartográfica.
- [ ] A sidebar é compacta e não domina a janela.
- [ ] O mapa ocupa a maior parte da largura disponível.
- [ ] A legenda permanece recolhível.
- [ ] O Modo foco reduz ruído visual sem ocultar o ponto atual/origem/destino/transferências relevantes.
- [ ] Mouse e teclado continuam selecionando pontos sem alterar a ordem da rota.

## 4. TAM3774 — histórico protegido

Para o histórico TAM3774, preservar a sequência processada:

`SBBR → UMSUB → KUKOL → SIRUL → VUDOT → EDMIN → 1853S04832W → UDIGI → MEVIK → ASTOB → VUPOG → UPONA → 2127S04856W → ISISA → ENPEG → PALCA → ANSOK → IMTBI`

A continuação espacial publicada, sem ETIM histórico, deve permanecer:

`VULRU → UBNID → GIKLU → USVIG → UMGUL`

Validar:

- [ ] nenhum dos 18 pontos processados é removido, pulado ou reordenado;
- [ ] a aeronave passa pelos checkpoints esperados;
- [ ] DEP permanece a referência temporal;
- [ ] Próximo, Anterior, timeline, scrubber, teclado e autoplay convergem para o mesmo estado espacial.

## 5. Trecho terminal UMGUL → SBCT

Antes da **Ordem TER**:

- [ ] o trecho `UMGUL → SBCT` pode aparecer como referência espacial **tracejada/preview**;
- [ ] a aeronave **não** é antecipada até SBCT;
- [ ] nenhum ETIM, CFL, STAR ou fixo intermediário é inventado;
- [ ] o endpoint visual coincide com o marcador do ADES SBCT.

No evento **Ordem TER**:

- [ ] o mesmo trecho muda semanticamente para fechamento **active**;
- [ ] a aeronave chega ao ADES SBCT;
- [ ] continua sem ETIM/CFL/STAR/fixos intermediários fabricados;
- [ ] há exatamente um segmento terminal;
- [ ] não existe pisca/frame intermediário em que a linha desapareça ou duplique.

Ao usar **Anterior** a partir do TER:

- [ ] a aeronave retorna ao estado espacial pré-TER;
- [ ] o fechamento volta ao estado de preview;
- [ ] avançar novamente ao TER reproduz exatamente a mesma geometria.

## 6. Regressões críticas adicionais

- [ ] `PADIL → IRISO → LIBEC → EGDOD → IBGAM → PMS → ILVES → MASVA` mantém a ordem.
- [ ] `ILVES 01:34` permanece antes de `MASVA 01:36`.
- [ ] Retrocesso percorre os mesmos fixos em ordem inversa.
- [ ] Trocar de histórico limpa rota/eventos derivados da sessão anterior.
- [ ] STRIP e FPV continuam abrindo, minimizando/restaurando e acompanhando Próximo/Anterior.

## 7. Como registrar um problema

Ao encontrar qualquer divergência, registrar:

1. histórico/arquivo usado;
2. evento atual e anterior;
3. ação que provocou o problema — Próximo, Anterior, timeline, scrubber, teclado ou autoplay;
4. screenshot da tela inteira;
5. se possível, vídeo curto mostrando a transição;
6. se o problema ocorre em claro, escuro, Dashboard moderno ou em todos;
7. navegador e resolução da tela.

Não corrigir um problema observado alterando o baseline temporal/espacial sem primeiro reproduzi-lo e criar um contrato específico.
