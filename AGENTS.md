# FlightFlow ATS — instruções para agentes de IA

Este arquivo é a fonte de verdade para qualquer agente de IA que trabalhe neste repositório.

## 1. Objetivo

Evoluir o FlightFlow preservando a fidelidade temporal e espacial do plano de voo, a leitura dos históricos ATS e a estabilidade da interface.

## 2. Regras obrigatórias

1. **Pense antes de editar.** Identifique causa, arquivos/blocos afetados e risco de regressão.
2. **Mudanças cirúrgicas.** Não refatore áreas adjacentes sem necessidade para o pedido atual.
3. **Baseline é imutável.** Nunca editar `baseline/FlightFlow_TIOP_CINDACTA1_NOVO.html`.
4. **Não mascarar bug com UI.** Corrija a lógica de dados/estado antes de compensar visualmente.
5. **Timeline e rota são determinísticas.** Avançar, retroceder, clicar em evento e autoplay devem produzir o mesmo estado para o mesmo índice.
6. **Não saltar fixos processados.** Se um fixo pertence ao intervalo temporal entre dois eventos, a transição visual deve respeitar sua ordem.
7. **Mudança de histórico limpa estado derivado.** Nenhum dado da sessão anterior pode contaminar a nova análise.
8. **Persistência compatível.** Alterações em IndexedDB/localStorage exigem migração ou fallback compatível.
9. **Sem segredo no código.** Não inserir chaves de API, tokens, senhas ou credenciais em arquivos versionados.
10. **Repositório privado.** Não tornar público sem sanitização explícita do conteúdo operacional e dos dados pessoais incorporados.

## 3. Fluxo obrigatório para bugs

Antes de editar:

- descreva o comportamento observado;
- descreva o comportamento esperado;
- encontre a causa raiz;
- identifique o menor ponto de correção;
- defina como reproduzir e verificar.

Depois de editar:

- execute `python tools/audit_static.py index.html`;
- execute os testes de regressão relacionados;
- revise o diff para mudanças não solicitadas;
- valide manualmente os fluxos afetados no navegador.

## 4. Hotspots atuais

Trate como áreas de alto risco:

- parser de históricos;
- múltiplas fontes de histórico;
- sincronização timeline/scrubber/eventos;
- rota processada e ETIM;
- movimento/interpolação da aeronave;
- fixos, aeródromos, FIR/TMA/ACC/APP/TWR;
- atualização de nomes/coordenadas geográficas;
- persistência IndexedDB/localStorage;
- módulos de IA/base normativa;
- carregamento dinâmico de mapas e consultas externas.

## 5. Critérios de regressão prioritários

Sempre que a mudança tocar timeline, rota, mapa ou histórico, validar no mínimo:

- anterior / próximo;
- clique direto em evento;
- scrubber;
- autoplay;
- avanço e retrocesso sobre o mesmo trecho;
- passagem por todos os fixos intermediários;
- aeronave posicionada sobre o fixo no instante correspondente;
- ordem cronológica dos ETIM;
- último fixo → aeródromo de destino;
- troca de histórico sem resíduos da sessão anterior;
- DEP atualizando a evolução temporal do voo quando aplicável.

## 6. Estratégia de modularização

Não dividir o arquivo inteiro de uma vez. Extrair uma responsabilidade por PR/commit, com comportamento preservado.

Ordem preferencial:

1. dados estáticos e base geográfica;
2. parser de histórico;
3. persistência;
4. timeline/estado;
5. rota processada;
6. mapa/aeronave;
7. UI e estilos;
8. IA/base normativa.

Cada extração deve manter uma interface explícita e teste correspondente.

## 7. Definição de pronto

Uma tarefa só está concluída quando:

- o bug/objetivo está verificavelmente resolvido;
- JavaScript continua sintaticamente válido;
- regressões relevantes foram testadas;
- não houve alteração do baseline;
- documentação/changelog foram atualizados quando necessário.
