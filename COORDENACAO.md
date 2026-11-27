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

## Integração e publicação pela Principal

Regra definida pelo usuário em 27/11/2026. Esta conversa é a Principal. Quando o usuário solicitar integração, a Principal verifica as Frentes 2 e 3 e importa as mudanças concluídas na sua própria worktree. Quando solicitar subir ao GitHub, o pedido inclui conferir e reunir o trabalho das três frentes antes do envio, revisar conflitos e executar os testes pertinentes do conjunto.

O usuário esclareceu depois que junte sempre significa trazer as correções das outras conversas do projeto, Frentes 2 e 3. Conferir as duas mesmo quando uma delas não tiver mudança nova. O pedido não autoriza push por si só nem aplicação de propostas ainda não aprovadas ou implementadas nas frentes.

Esse pedido dispensa nova confirmação para repetir as etapas já autorizadas de conferência, integração e publicação. Se houver trabalho incompleto, conflito de intenção ou dúvida sobre uma alteração, a Principal deve perguntar ao usuário e aguardar antes de publicar. Não publicar uma versão parcial omitindo silenciosamente mudanças de uma das frentes. Nenhum arquivo das worktrees de origem será sobrescrito como forma de integração.

## Validação da organização

O teste completo da cópia original passou em 65 itens, 16 combinações e 15.360 desenhos antes de registrar a base. Em cada uma das três worktrees passaram validation/criacao-atributos.cjs, validation/popup-dano.cjs e validation/seletores-cursor.cjs.

Conferidos os três índices Git distintos, o mesmo git-common-dir, o mesmo commit e árvore de arquivos e o estado limpo de cada cópia. Um marcador temporário exclusivo em cada worktree confirmou isolamento das gravações; os três marcadores foram removidos ao fim. O vínculo do projeto e os diretórios das três conversas foram conferidos pela ferramenta de listagem do aplicativo.

A indisponibilidade do navegador interno e as pendências conhecidas de habilidades e balanceamento continuam registradas na revisão operacional. A criação das worktrees não foi tratada como validação visual da interface.

## Identidades das conversas

- Principal — 01a2143c-1bdc-75e1-8321-ad6eee5b6837
- Chaos Crawl — Frente 2 — 01a21e09-0c5d-7eb1-8b44-cb6dd1510a96
- Chaos Crawl — Frente 3 — 01a21e09-8a0d-7441-bcee-b89522ff9be7

As entradas antigas com falha não geraram histórico persistido e não foram apagadas por alteração de banco ou transcrição. Foram substituídas por estas duas derivações operacionais.

## Integração local das funcionalidades — 27/11/2026

Por pedido explícito do usuário para puxar as duas frentes e testar tudo junto, a Principal importou a versão local das dez habilidades da Frente 2 e dos cinco inimigos animados da Frente 3. As duas branches de origem ainda estavam em 6115270 com alterações não commitadas. A importação usou snapshots desses arquivos, preservando o conteúdo local da Principal e sem gravar nas outras worktrees. Não houve merge de branches nem push.

Na Principal prevalecem os controles por mouse já aprovados, com coleta e barras sem números. Os controles alternativos por WASD/Espaço/I que existiam na Frente 2 não foram reintroduzidos. As habilidades receberam a ligação necessária ao drop e à transição de morte. Os novos inimigos receberam as interações de gelo/isca. A Frente 3 estava ociosa, com o último turno interrompido depois de testes locais aprovados e antes do fechamento; a Principal concluiu sua própria revisão e testes de integração, sem declarar conclusão na conversa de origem. A conferência visual no navegador continua pendente.

Backup e snapshots são retornados por git rev-parse --git-path codex-backups/integracao-frentes-20261127. A revisão operacional da Principal registra arquivos, ajustes de integração, evidências e limitações. Para testar o conjunto, abrir C:/Users/robson.colaco/.codex/worktrees/chaos-principal/dungeon-crawler/index.html; abrir as outras worktrees continua mostrando as versões isoladas. Mudanças futuras nas frentes exigem uma nova importação explícita.

## Segunda importação de correções — 27/11/2026

O pedido junte as correções das outras conversas importou as etapas concluídas de regeneração e acabamento de miras da Frente 2. A Frente 3 não tinha diferenças de arquivos em relação ao snapshot anterior; os valores novos de dano estavam somente propostos e aguardando aprovação na conversa de origem, portanto não havia alteração aplicada para importar. Não foram enviados comandos de trabalho às frentes nem modificadas suas cópias.

Na Principal continuam os acabamentos de Pele de Ferro/Golpe Circular, os controles por mouse, o bloqueio de mira sem energia e de interações nativas em toda a página. Barras continuam sem números; frações da regeneração são exibidas apenas na ficha do inventário. O backup completo anterior e snapshots das duas fontes são retornados por git rev-parse --git-path codex-backups/integracao-correcoes-frentes-20261127. Esta importação é local, sem push; qualquer atualização posterior nas frentes exige outra conferência.
