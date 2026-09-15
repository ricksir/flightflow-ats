# `src/` — módulos do FlightFlow ATS

Este diretório contém as fronteiras já extraídas do núcleo principal, organizadas por domínio.

## Domínios

- `ai/` — motor local de IA e governança;
- `config/` — validação e composição de configuração;
- `core/` — utilitários e controladores centrais;
- `data/` — dados geográficos e histórico de demonstração;
- `geo/` — coordenadas, superfícies, localidades e consultas geográficas;
- `knowledge/` — base de conhecimento e apresentação associada;
- `map/` — aeronave, movimento, camadas e elementos de mapa;
- `parser/` — interpretação dos históricos;
- `route/` — rota processada e utilitários de revisão;
- `storage/` — persistência local;
- `timeline/` — navegação, playback, seleção e estado temporal;
- `ui/` — componentes e controladores de interface.

## Regra atual

A rodada contínua de modularização está encerrada. Não mover código do `index.html` para `src/` apenas por organização estética.

Uma nova extração deve existir somente quando houver necessidade funcional ou arquitetural concreta e deve preservar os contratos automatizados correspondentes.

O estado estrutural atual é documentado em:

- `docs/ARCHITECTURE.md`;
- `docs/AI_CURRENT_STATE.md`;
- `docs/MODULE-BOUNDARIES.md`.
