# Primeiro conjunto ilustrado da partida

Integração local aprovada pelo usuário em 26/11/2026. Estilo de fantasia ilustrada do menu e da criação de Chaos Crawl. Produção pelo **imagegen integrado**, sem CLI/API externa.

## Arquivos finais

| Arquivo | Conteúdo | Resolução |
| --- | --- | --- |
| `gameplay-actors.png` | Humano com capa e goblin inimigo; quatro poses por figura; transparência real | 1774 × 887 |
| `gameplay-terrain.png` | Duas variações de piso, parede frontal e escada, em quatro quadrantes | 1254 × 1254 |
| `gameplay-props.png` | Espada horizontal, lança horizontal e tocha vertical; transparência real | 2172 × 724 |

As cópias finais foram comparadas por SHA-256 com os resultados gerados. Recortes, apoio dos pés e eixo das armas estão em `../gameplay-art.js`. O atlas de atores tem cerca de 70% de pixels totalmente transparentes; o de acessórios, 90%. A primeira versão opaca dos atores foi substituída pelo resultado da extração de fundo.

## Direção dos prompts utilizados

- **Atores:** atlas de jogo em duas linhas e quatro colunas, humano de capa vermelha e túnica verde baseado no retrato aprovado e goblin de couro, sem armas fixas; poses parado, duas passadas e ataque; vista inclinada lateral, figuras completas apontando à direita; fantasia pintada, materiais detalhados e fundo transparente. A extração posterior pediu remover o branco preservando posições, proporções, desenho e dimensões do atlas.
- **Cenário:** atlas quadrado com quatro quadrantes iguais; dois pisos de lajes, parede de alvenaria com coroamento e escada descendente; pedras em tons de carvão/azul-petróleo, detalhes quentes gastos, perspectiva compatível com o mapa; sem texto, personagens ou interface. São peças usadas pela geração existente, não uma imagem fixa de sala.
- **Acessórios — prompt final:** “Create a production-ready 2D game prop sprite atlas for Chaos Crawl, dark fantasy hand painted illustrated style, realistic worn materials, warm gold accents and muted teal-steel palette, no pixel art. THREE EQUAL HORIZONTAL CELLS in a wide 3:1 image, fully transparent alpha background. Column 1: a detailed steel arming sword with bronze crossguard and leather grip, viewed flat from the side, EXACTLY HORIZONTAL, pommel at left, sharp blade tip at right, centered in cell, no angle. Column 2: a detailed goblin spear, dark timber shaft, bronze binding and broad worn steel tip, EXACTLY HORIZONTAL, shaft butt on left, point at right, centered in cell, no angle. Column 3: a stone-wall torch with wrought iron holder and a small bright amber flame, EXACTLY VERTICAL, centered, flame on top, grip bottom, no background wall. Each prop fits fully inside its own equal cell with wide transparent separation, occupies about 80% of cell width for weapons and 80% cell height for torch. High detail readable at game scale. NO text, NO cell borders, NO grids, NO cast shadow, NO glow outside flame, NO scenery, NO surface under objects. Transparent background is critical, not white or black.”

## Uso e limites

Selecionar **Humana + Capa** para usar o primeiro personagem ilustrado durante a partida. As outras três combinações continuam com os sprites anteriores. O inventário conserva sua arte e seus itens. Há quatro poses com espelhamento horizontal; não é um conjunto completo de animações em oito direções.

O quadro passou a 1792 × 1024 mantendo o tamanho externo e o mundo lógico. O terreno é rasterizado uma vez por andar num cache de 3584 × 2048 (28 MiB de pixels RGBA), reaproveitado nos quadros seguintes. As coordenadas visuais permitem frações para suavizar a câmera. Velocidades, colisões, alcance e dano continuam nas regras anteriores.

A validação isolada e duas cenas rasterizadas estão na pasta `../../validacao-arte-partida/`. Essa rasterização usa as funções reais do jogo com DOM simulado e Canvas local; não é captura do navegador. A aparência da página inteira e a fluidez no navegador continuam pendentes.
