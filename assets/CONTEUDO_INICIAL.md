# Conteúdo inicial de Chaos Crawl

Etapa aprovada em 27/11/2026. Raças definidas pelo usuário como Humano, Goblin, Esqueleto e Dracônico. Classes definidas como Aventureiro, Guardião, Elementalista e Alquimista.

## Catálogo

O catálogo possui 65 itens com identidade e imagem próprias. Os 19 itens existentes integram o total.

| Categoria | Total |
| --- | --- |
| Armas | 15 |
| Elmos | 10 |
| Armaduras | 10 |
| Botas | 10 |
| Colares | 10 |
| Anéis | 10 |

As armas são Espada de guarda reta, Sabre de lâmina curva, Espada de cristal, Lança, Adaga de osso, Machado de ferro, Machado dracônico, Maça de bronze, Martelo de pedra, Espada serrilhada, Lâmina de obsidiana, Foice curta, Tridente de cobre, Lança de osso e Cutelo do alquimista.

items.js contém os objetos de armas em gameItems, os cinquenta equipamentos em equipmentItems e a coleção completa em itemCatalog. Cada objeto tem id, categoria, nome e ícone. As armas também têm weaponSprite e o intervalo provisório de dano 1–2. Atribuições de status, habilidades, efeitos e drops pertencem às etapas futuras.

Os cinquenta ícones dos outros equipamentos ficam em assets/items com formato WebP de 128 × 128. As onze armas acrescentadas nesta etapa usam PNG de 256 × 160, centro do cabo em (40,80) e lâmina ou cabeça apontando à direita. As quatro armas anteriores conservam seus arquivos. O motor aplica a animação de combate e a aparência da arma equipada às poses do personagem.

## Acesso no jogo

Durante a partida, o botão Catálogo de teste no rodapé abre os seis grupos. Escolher um item o acrescenta ao primeiro espaço livre da mochila. A mensagem de mochila cheia informa quando a adição foi recusada. O botão Esvaziar mochila de teste libera os espaços da mochila. Equipamentos ficam nos slots correspondentes.

A mochila tem 24 espaços. O catálogo permite testar todos os itens por lotes. O arraste equipa, troca e desequipa com a restrição de categoria existente. O popup acompanha o item atual e apresenta o dano das armas. Escape ou Fechar fecham o catálogo. Os itens da mochila são reinicializados ao iniciar outra partida.

## Personagens

As quatro raças se combinam com as quatro classes, totalizando dezesseis aparências. Cada combinação aparece na criação, no retrato do inventário e na partida. As seleções mantêm o tamanho da área de criação e oferecem quatro opções em cada linha.

Os dois humanos anteriores conservam suas folhas e seus pontos de empunhadura. As outras quatorze combinações usam folhas em assets/characters, de 1440 × 720, com nove colunas e cinco vistas.

| Linha | Direção |
| --- | --- |
| 1 | Direita |
| 2 | Baixo |
| 3 | Cima |
| 4 | Baixo e direita |
| 5 | Cima e direita |

O espelhamento fornece as três direções esquerdas. A primeira coluna é repouso, as quatro seguintes são as passadas, as três seguintes são os momentos do golpe e a última repete o repouso. A sequência do golpe volta ao repouso ou à corrida conforme a movimentação do jogador. gameplay-art.js registra as mãos por vista e fase, com ajuste próprio da vista frontal do Goblin. A arma é desenhada atrás do corpo nas vistas de costas e sob os dedos nas vistas de frente.

Esqueletos têm crânio e ossos aparentes, Dracônicos têm escamas vermelhas, focinho e chifres claros, Goblins têm pele verde e orelhas alongadas. As classes usam respectivamente túnica verde e capa vermelha, placas metálicas, vestes azuis com detalhes de cobre, ou roupa de couro com óculos e frascos. Essas diferenças representam a identidade visual desta etapa.

## Produção de arte

As artes foram produzidas pelo imagegen integrado, tendo os ícones e o aventureiro atual como referências de estilo. CONTEUDO_INICIAL_PROMPTS.json guarda o prompt de cada folha final, incluindo as revisões de transparência dos colares e do Esqueleto Alquimista e o reparo do atlas de armas.

O preparo local foi feito com Sharp. Os ícones foram recortados e dimensionados para 128 × 128, as armas foram alinhadas ao cabo e as quatorze folhas foram dimensionadas para a grade 160 × 144 por quadro. As imagens finais incluem transparência.

## Validação e continuidade

O teste local ../../validacao-conteudo-inicial.cjs verificou o total por categoria, 65 ids únicos, arquivos de arte, transparência, registro dos cabos, adição de todos os itens pelo catálogo, equipamento no slot correspondente, mochila cheia e os nomes do popup. Exercitou 15.360 desenhos cobrindo quinze armas, dezesseis combinações, oito direções, repouso, quatro fases de corrida e três fases do golpe. Conferiu retratos e as seleções de raça e classe. Comparou geração de mapa, movimento, trajetória de golpe, dano e IA com o backup anterior desta etapa.

O teste ../../previa-animacoes-16.cjs acionou movimento e Espaço pelo loop da partida. Renderizou 1.024 quadros e 128 ataques, cobrindo todas as combinações nas oito direções e o retorno ao repouso. O resultado ../../previa-animacoes-16.webp tem 4,8 segundos. A primeira tentativa da prévia foi interrompida porque acumulava buffers de imagens completas. A segunda capturou apenas a região de cada personagem e concluiu.

O teste ../../validacao-popup-dano.cjs passou na versão integrada. As checagens de sintaxe dos scripts do jogo e git diff --check passaram. As prévias ../../previa-personagens-16.png e ../../previa-catalogo-65.png foram inspecionadas. Foram também inspecionados quadros dos golpes, dos pontos da mão e da prévia animada. As verificações de renderização usaram Canvas Skia local. A avaliação interativa e do layout no navegador está pendente, com indisponibilidade do navegador interno registrada na revisão operacional.

O backup ../../backup-antes-catalogo-65 contém os arquivos anteriores desta etapa. Para reverter somente esta etapa, restaurar game.js, gameplay-art.js, items.js, inventory.js, index.html e style.css no projeto. As pastas assets/items e assets/characters e os dois documentos CONTEUDO_INICIAL são novos desta etapa. Os sprites de sabre e espada de cristal, o popup e o cálculo de dano são das etapas anteriores.

Implementação local. O próximo passo é avaliar visualmente o lote no jogo e então definir status, habilidades e obtenção dos itens.
