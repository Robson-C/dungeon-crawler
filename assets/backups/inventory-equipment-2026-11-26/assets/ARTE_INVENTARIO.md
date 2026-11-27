# Inventário de Chaos Crawl

Em 26/11/2026, o inventário passou a ser um painel de componentes dentro da área da masmorra. Seu tamanho considera a altura disponível acima dos cinco espaços de habilidades. A masmorra continua visível ao redor do painel. Os rótulos, os valores, os itens e o retrato são renderizados pelos componentes da interface.

## Arquivos

| Arquivo | Alteração |
| --- | --- |
| `index.html` | Estrutura acessível de equipamentos, ficha, saldo, zona de venda e mochila. |
| `inventory-desktop.css` | Dimensiona e posiciona o painel dentro da moldura do jogo. Distribui equipamentos, ficha, saldo, venda e mochila. Mantém cinco encaixes quadrados de habilidades abaixo do painel. |
| `style.css` | Fornece os componentes e a apresentação compacta para áreas de jogo estreitas. |
| `game.js` | Atualiza os valores da ficha e abre o inventário com I. Esc ou clique fora fecham a tela. |
| `inventory.js` | Move e destaca os itens durante o arraste. Cada encaixe desenha seu conteúdo atual. |
| `assets/inventory-desktop.png` | Referência aprovada usada como atlas dos ícones individuais e do encaixe de habilidade. |
| `assets/inventory-frame.png`, `assets/inventory-carved-stone.png`, `assets/inventory-items-painted.png` | Molduras, superfícies, nicho e ícones da interface. |

No PC, somente o painel do inventário cobre parte da área jogável. O posicionamento usa a moldura da masmorra como referência. A barra real de habilidades permanece centralizada na parte inferior ao abrir e fechar o inventário. A partida continua aceitando movimento e ataque. O retrato acompanha a seleção de Raça e Classe. Soltar um item fora cancela o arraste e mantém o painel aberto. A zona de venda é uma área visual reservada para essa integração.

Os espaços de mochila e equipamento usam a transparência do atlas ao redor das molduras. Os cinco espaços de habilidades recortam os cantos externos da amostra. Isso permite ver a superfície de baixo entre os encaixes.

## Integração com o trabalho de sprites

O trabalho visual do inventário foi feito na cópia local de `master`, com base em `996ef6f`. O trabalho de sprites usa o worktree separado do outro chat. Ao integrar, preserve as alterações de Raça e Classe na criação e combine os trechos de `index.html` e `style.css` por seção. A composição de PC fica em `inventory-desktop.css`. As regras de movimentação de itens ficam em `inventory.js`.

## Validação

No Chrome, o painel e os cinco espaços quadrados couberam dentro da masmorra nas janelas de 900 × 600, 1024 × 768, 1366 × 768, 1536 × 900, 1920 × 1080 e 2560 × 1080. As medições confirmaram ausência de rolagem interna e posição idêntica da barra com o inventário aberto ou fechado. Também foram verificados abertura com I, fechamento com Esc ou clique fora, movimento e ataque com a mochila aberta, atualização visível da ficha, arraste entre mochila e equipamento e retratos das quatro combinações de Raça e Classe.

## Prompt da moldura

A imagem `assets/chaos-crawl-creation.png` foi a referência de estilo.

> Create an original, directly usable game inventory panel frame for Chaos Crawl. Image 1 is the existing character-creation screen, provided only as a style reference. Match its illustrated dark fantasy stone plaques, worn brown-charcoal rock, restrained warm bronze/gold highlights, carved bevels, and dramatic yet subtle material detail. Produce one wide 3:2 rectangular 2D frame, perfectly straight front view, flat orthographic UI asset for CSS nine-slice scaling. Center the rectangle on canvas with about 3 percent transparent margin on each side. Four straight continuous edges of consistent modest thickness, about 7 percent of image height, slightly chamfered carved corners. Small warm brass inlays are concentrated only in the corners, straight border spans should be comparatively simple and suitable for stretching. The middle must be entirely empty and genuinely transparent, the exterior transparent too. Keep all stone fully opaque. No text, letters, symbols, icons, characters, slots, screen mockup, background scenery, drop shadows or flare. Present a single isolated rectangular border, almost filling the image.
