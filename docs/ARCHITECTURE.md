# Arquitetura — estado atual e arquitetura-alvo

## Estado atual

O FlightFlow funciona como uma aplicação web de arquivo único:

```text
index.html
├── CSS principal + patches de versões posteriores
├── HTML da interface
├── Parser de históricos
├── Histórico/dados de exemplo
├── Base geográfica embutida
├── Núcleo de mapa/timeline/UI
├── Base normativa/conhecimento
├── Motor local de IA
├── Persistência IndexedDB/localStorage
├── Camadas FIR
└── Rota processada v7.4.12
```

Essa estrutura tem a vantagem operacional de abrir diretamente no navegador, mas aumenta o custo de manutenção.

## Arquitetura-alvo incremental

```text
src/
├── core/
│   ├── state.js
│   └── events.js
├── history/
│   ├── parser.js
│   ├── sources.js
│   └── snapshots.js
├── route/
│   ├── processed-route.js
│   ├── etim.js
│   └── interpolation.js
├── map/
│   ├── geo-data.js
│   ├── layers.js
│   ├── aircraft.js
│   └── online-providers.js
├── storage/
│   ├── indexeddb.js
│   └── local-storage.js
├── ats/
│   ├── messages.js
│   └── handoff.js
├── ui/
│   ├── timeline.js
│   ├── panels.js
│   └── theme.js
└── ai/
    ├── engine.js
    └── knowledge.js
```

## Regra da migração

A arquitetura-alvo não deve ser criada por uma reescrita total. Cada módulo será extraído do `index.html` de forma incremental, preservando comportamento e permitindo comparação com `baseline/`.
