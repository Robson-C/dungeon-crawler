# Chaos Crawl — três conversas, um projeto

Organização aprovada pelo usuário e preparada em 27/11/2026. As três conversas pertencem ao projeto Hack Slash do Codex, id b3d012de-9b8e-4fc2-a832-7beac13d3c88, e compartilham o repositório Robson-C/dungeon-crawler. Cada conversa possui uma worktree e branch próprias.

| Conversa | Branch | Pasta de trabalho |
| --- | --- | --- |
| Principal | codex/chaos-principal | C:/Users/robson.colaco/.codex/worktrees/chaos-principal/dungeon-crawler |
| Chaos Crawl — Frente 2 | codex/chaos-frente-2 | C:/Users/robson.colaco/.codex/worktrees/dc50/dungeon-crawler |
| Chaos Crawl — Frente 3 | codex/chaos-frente-3 | C:/Users/robson.colaco/.codex/worktrees/329d/dungeon-crawler |

As duas frentes novas foram derivadas da Principal e receberam seu histórico. Permanecem sem uma funcionalidade atribuída. O usuário escolherá o trabalho de cada uma nas respectivas conversas.

## Base e cópia de referência

O código inicial das três frentes é o commit local fd1954e233a004a896268d197073e0e1c71ae814, que reúne o jogo atual, os 65 itens, as 16 combinações de personagens, criação e inventário, cursores, fontes, revisão e testes locais. Os registros posteriores de inicialização acrescentam somente documentação de coordenação.

O checkout original em C:/Users/robson.colaco/Downloads/CODEX/Hack Slash/dungeon-crawler foi preservado em codex/base-tres-conversas como referência da base. Ele não é a pasta de edição de nenhuma das três conversas. Backups e os scripts históricos da etapa anterior continuam na pasta Hack Slash. O Git sem commits da pasta pai foi preservado e não deve ser escolhido como origem de worktree.

Para testar uma frente, abrir o index.html da pasta correspondente. A janela que já estava aberta no checkout original continuará mostrando aquela cópia até ser aberta a versão da worktree desejada.

## Como trabalhar

1. Antes de implementar, conferir a branch, ler AGENTS.md e REVISAO_OPERACIONAL.md e seguir a aprovação de escopo do usuário.
2. Editar somente a pasta da conversa em uso. As alterações ficam isoladas até uma integração aprovada.
3. Concluir a funcionalidade e os testes pertinentes antes de registrar uma candidata de integração.
4. Solicitar à conversa Principal a integração da frente concluída. Revisar conflitos e validar o resultado conjunto no escopo autorizado.
5. Atualizar as outras frentes para uma base mais nova somente dentro de uma sincronização aprovada e depois de preservar seus trabalhos locais.

As três conversas não publicam automaticamente no GitHub. O commit inicial e o registro de coordenação são locais. A criação das cópias não autoriza implementar funcionalidades, usar subagentes, enviar mensagens entre conversas por iniciativa própria ou controlar o PC.

## Validação da organização

O teste completo da cópia original passou em 65 itens, 16 combinações e 15.360 desenhos antes de registrar a base. Em cada uma das três worktrees passaram validation/criacao-atributos.cjs, validation/popup-dano.cjs e validation/seletores-cursor.cjs.

Conferidos os três índices Git distintos, o mesmo git-common-dir, o mesmo commit e árvore de arquivos e o estado limpo de cada cópia. Um marcador temporário exclusivo em cada worktree confirmou isolamento das gravações; os três marcadores foram removidos ao fim. O vínculo do projeto e os diretórios das três conversas foram conferidos pela ferramenta de listagem do aplicativo.

A indisponibilidade do navegador interno e as pendências conhecidas de habilidades e balanceamento continuam registradas na revisão operacional. A criação das worktrees não foi tratada como validação visual da interface.

## Identidades das conversas

- Principal — 01a2143c-1bdc-75e1-8321-ad6eee5b6837
- Chaos Crawl — Frente 2 — 01a21e09-0c5d-7eb1-8b44-cb6dd1510a96
- Chaos Crawl — Frente 3 — 01a21e09-8a0d-7441-bcee-b89522ff9be7

As entradas antigas com falha não geraram histórico persistido e não foram apagadas por alteração de banco ou transcrição. Foram substituídas por estas duas derivações operacionais.
