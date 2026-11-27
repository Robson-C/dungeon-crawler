# Chaos Crawl — trabalho nas três conversas

O usuário autorizou em 27/11/2026 três conversas no mesmo projeto e repositório, cada uma com sua worktree. São conversas do usuário, não subagentes. Cada frente aguarda a definição de uma funcionalidade pelo usuário antes de implementar conteúdo novo.

## Antes de trabalhar

- Ler REVISAO_OPERACIONAL.md nesta worktree e conferir git status, branch e git rev-parse --show-toplevel.
- O repositório real é dungeon-crawler e suas worktrees. A pasta original Hack Slash contém outro Git sem commits e não serve de base para criar worktrees.
- Trabalhar somente na worktree atribuída à conversa. Usar caminhos explícitos nos comandos. Não editar arquivos das outras conversas ou do checkout de referência para propagar mudanças.
- As instruções globais do usuário em C:/Users/robson.colaco/.codex/AGENTS.md continuam aplicáveis. Investigações são somente leitura. Apresentar escopo antes de implementar e aguardar aprovação explícita para cada tarefa nova.
- Não usar subagentes, agente de execução externo ou controle do PC sem a autorização específica exigida pelas regras globais. Navegação somente pelo navegador interno do Codex. Indisponibilidade desse navegador deve ser registrada, sem alternativa externa.

## Validação e continuidade

- O jogo é web estático. Abrir index.html da worktree correta para avaliar a cópia correspondente.
- Testes locais disponíveis em validation/README.md. Esses testes usam o runtime Node/Canvas já disponível no host Codex e não substituem a conferência visual.
- Atualizar a revisão operacional da própria worktree após mudança material, com escopo aprovado, arquivos, testes executados, limitações e reversão.
- Valores visíveis de atributos e recursos usam somente inteiros arredondados para baixo. Preservar frações nos cálculos internos de regeneração, custos e dano; as barras continuam sem números.
- Alterações das outras frentes só entram nesta cópia por integração explícita. Conferir a base antes de integrar e preservar alterações locais.

## Git

- Usar branches codex/ distintas. O checkout de referência e cada conversa têm branches próprias.
- O usuário autorizou um commit exclusivamente local da base atual para iniciar as três frentes. Isso não autoriza push ou publicação de trabalho futuro.
- Não executar merges, rebase, reset destrutivo, limpeza de arquivos ou troca de branch nas outras worktrees por iniciativa própria. Integração de funcionalidade e publicação exigem escopo próprio aprovado pelo usuário.
- Enviar ao remoto somente uma versão completa, revista e validada dentro do fluxo de aprovação já existente.
- A conversa Principal centraliza a integração. Quando o usuário pedir importar, conferir as Frentes 2 e 3 e integrar na própria worktree da Principal, preservando as cópias de origem.
- Neste projeto, pedidos como junte ou junte as correções sempre significam conferir e importar as alterações concluídas das outras conversas, Frentes 2 e 3. Não interpretar como apenas agrupar mudanças da Principal. Esse pedido autoriza a integração local e seus testes, sem novo pedido de confirmação do mesmo fluxo; publicação exige pedido próprio.
- Quando o usuário pedir subir ao GitHub, esse pedido autoriza primeiro conferir e integrar as mudanças concluídas das Frentes 2 e 3, revisar e testar o conjunto e só então publicar. Não solicitar novamente a autorização desse fluxo já definido. Conflitos de intenção, dúvidas ou trabalho incompleto exigem esclarecimento antes do envio; não excluir silenciosamente uma frente pendente para publicar uma versão parcial.
