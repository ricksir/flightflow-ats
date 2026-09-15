# Auditoria inicial — FlightFlow ATS

> **Documento histórico:** este arquivo registra o diagnóstico de 04/09/2026. Recomendações sobre privacidade, arquitetura e modularização refletem aquele momento e podem ter sido superadas. Para o estado vigente, consulte `README.md`, `docs/AI_CURRENT_STATE.md` e `docs/ARCHITECTURE.md`.

Data da auditoria: 2026-09-04.

## Resumo técnico

| Métrica | Resultado |
|---|---:|
| Tamanho do HTML | 2.490.612 bytes |
| Linhas | 18.405 |
| Blocos `<style>` detectados | 10 |
| Blocos `<script>` detectados | 8 |
| Scripts externos declarados por `<script src>` | 0 |
| Folhas externas declaradas por `<link href>` | 0 |
| SHA-256 | `1a4ec449abd99ac34ffd5eeec91baa2c9975058b9459bf1952309c2fe0eac96f` |

Todos os 8 blocos JavaScript da versão recebida passaram em `node --check` durante a auditoria inicial.

## Estrutura observada

O documento evoluiu por patches sucessivos dentro do mesmo HTML. Há marcadores/versionamentos como v3, v4, v4.6, v4.8, v5.x, v6.x, v7.2.x, v7.3.5 e v7.4.12 coexistindo no mesmo arquivo.

Blocos JavaScript aproximados:

| Bloco | Linhas | Caracteres | Funções nomeadas | Observação |
|---|---:|---:|---:|---|
| 1 | 746 | 33.358 | 32 | parser/base inicial |
| 2 | 1.798 | 45.324 | 0 | histórico de exemplo / dados textuais |
| 3 | 1 | 590.455 | 0 | base geográfica embutida em uma linha |
| 4 | 5.573 | 1.129.560 | 378 | núcleo principal e bases embutidas |
| 5 | 2.665 | 164.916 | 148 | motor/recursos de IA |
| 6 | 257 | 25.959 | 39 | armazenamento seguro/persistência |
| 7 | 129 | 7.812 | 11 | camadas FIR |
| 8 | 1.743 | 122.598 | 116 | rota processada v7.4.12 |

## Riscos arquiteturais

### 1. Monólito com alta superfície de regressão

Interface, regras de negócio, dados geográficos, persistência, parser, mapa, timeline e IA convivem no mesmo documento. Uma alteração pequena pode afetar estados globais ou listeners já instalados por patches anteriores.

### 2. Patches versionados sobrepostos

A presença de várias correções históricas no mesmo arquivo indica evolução incremental sem uma fronteira modular clara. Antes de remover código aparentemente redundante, é obrigatório confirmar se um patch posterior depende dele.

### 3. Grandes massas de dados embutidas

A base `window.__FLIGHTFLOW_GEO_DATA__` ocupa centenas de milhares de caracteres e o núcleo principal incorpora conhecimento textual/normativo. Isso torna diff, revisão e carregamento mais difíceis.

### 4. Persistência em múltiplas camadas

Há uso extensivo de `localStorage` e `IndexedDB`. Refatorações precisam preservar chaves, schemas e migrações para não apagar configurações ou bases do operador.

### 5. Dependências dinâmicas de rede

Embora não haja `<script src>` externo estático, o código referencia/carrega dinamicamente serviços como Leaflet/unpkg, OpenStreetMap, ArcGIS, Google Maps, GeoAISWEB, Nominatim e Overpass. O comportamento deve ser testado com e sem internet/proxy.

### 6. Conteúdo não apropriado para publicação pública sem revisão

Na auditoria inicial foi detectado conteúdo de treinamento/conhecimento incorporado que exigia revisão antes de publicação. **Essa foi uma recomendação histórica daquele checkpoint.** O repositório é atualmente público; qualquer novo conteúdo operacional ou dado pessoal deve continuar sendo revisado antes do commit.

## Hotspots funcionais

Os maiores riscos de regressão estão em:

- sincronização de histórico e múltiplas fontes;
- timeline/scrubber/atalhos/eventos;
- rota processada e escolha do snapshot;
- passagem em fixos intermediários por ETIM;
- posicionamento da aeronave;
- reset de sessão;
- atualização da base geográfica;
- armazenamento persistente;
- mapa online/offline e fallback de rede.

## Decisão da fase 0

**Não modularizar ainda o comportamento.** Primeiro preservar a versão recebida, criar testes/checklists e versionar uma linha de base reproduzível. A modularização deverá ocorrer em etapas pequenas e verificáveis.
