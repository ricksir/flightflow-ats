# Política de segurança

## Conteúdo sensível

O FlightFlow ATS é um repositório público. Não envie para o Git:

- credenciais, tokens, senhas ou chaves;
- arquivos `.env` reais;
- dados pessoais sem necessidade técnica;
- conteúdo operacional que não tenha sido revisado para publicação.

Segredos locais devem permanecer fora do repositório e cobertos por `.gitignore`.

## Relato de vulnerabilidades

Evite publicar em issue aberta detalhes que permitam exploração, acesso indevido ou exposição de informações sensíveis.

Quando disponível, use o recurso **Private vulnerability reporting** na aba **Security** do GitHub. Se esse recurso não estiver habilitado, contate o responsável pelo repositório pelo GitHub antes de divulgar detalhes sensíveis publicamente.

Inclua no relato, quando possível:

- versão ou commit afetado;
- passos de reprodução;
- impacto observado;
- evidência mínima necessária;
- sugestão de mitigação, se houver.

## Dependências e serviços externos

Mudanças que adicionem dependências, scripts remotos, endpoints ou provedores externos devem ser justificadas e revisadas quanto a disponibilidade, privacidade e comportamento offline.

## Escopo

Falhas funcionais comuns sem impacto de segurança devem ser tratadas como bugs normais, não como vulnerabilidades.
