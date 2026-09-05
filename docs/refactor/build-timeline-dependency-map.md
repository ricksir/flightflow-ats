# buildTimeline — mapa de dependências congelado

> Gerado mecanicamente a partir do `index.html`. Este documento registra o estado atual antes de qualquer tentativa de extração de `buildTimeline`.

## Identidade estrutural

- Tamanho: **1,681 bytes**
- Linhas: **20**
- SHA-256: `5c152a66eee7d3a5294f868340725275a705d1432a3351b90733a29fa535c85a`
- Localização: IIFE principal do `index.html`

## Dependências observadas

### Propriedades de `state`

`state.parsed`

### Elementos de `els`

`els.timelineHeading`, `els.timelineList`

### Chamadas diretas em `document`

_Nenhuma._

### Referências em `window`

_Nenhuma._

### Chamadas de função sem receptor explícito

`Number()`, `String()`, `activate()`, `escapeHtml()`, `getSourceClass()`, `goTo()`, `stopPlayback()`

## Efeitos de UI/DOM detectados

`.innerHTML =`, `.textContent =`, `.dataset.`, `.addEventListener(`

## Sinais de risco para extração

`goTo(`, `innerHTML`, `addEventListener(`

## Decisão para o próximo corte

`buildTimeline` **não deve ser movida integralmente ainda**. O contrato abaixo congela a função e permite separar, em PRs menores, renderização de item, classificação/labels e ligação de eventos antes de deslocar a orquestração completa para um módulo.
