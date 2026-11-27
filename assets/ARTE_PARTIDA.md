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

## Reforma visual do cenário — 26/11/2026

O cenário usa lajes maiores, pedras talhadas com bordas gastas e tochas em bronze com luz âmbar, seguindo a arte aprovada do inventário. A integração usa o ImageGen integrado.

| Arquivo | Conteúdo | Resolução |
| --- | --- | --- |
| `gameplay-terrain-carved.png` | Atlas 2 × 2 com duas variações de piso, parede frontal e escada | 1254 × 1254 |
| `gameplay-wall-torch.png` | Tocha individual com suporte e transparência real | 1086 × 1448 |

A alteração de código fica na criação das imagens de cenário e nos métodos `buildTerrain` e `room` de `gameplay-art.js`. Cada amostra de piso cobre 3 × 3 células lógicas. As paredes usam fatias de uma textura de três células de largura, com coroamento desenhado dentro das células sólidas. As superfícies superiores recebem textura escurecida, e sombras suaves marcam o encontro com o piso. A escada usa o recorte da moldura de pedra do novo atlas. As tochas e a luz são desenhadas na região visível. O terreno continua rasterizado no cache de 3584 × 2048 por andar.

Para integrar com o trabalho paralelo de sprites, combine somente os trechos de terreno e tocha desta reforma. Os métodos de animação, os recortes dos atores e as imagens dos personagens pertencem ao trabalho de sprites.

### Cantos e junções

O coroamento das paredes considera as quatro células vizinhas e as quatro diagonais. Uma máscara com quatro subdivisões por célula conecta os trechos horizontais e verticais através dos cantos sólidos. A textura cobre toda essa superfície de uma vez, e o chanfro acompanha seu perímetro exposto. As faces frontais e os encontros em T seguem essa mesma máscara.

Nas extremidades de uma face frontal, o coroamento lateral termina na faixa superior. A alvenaria desenha o restante da face. A validação dos oito formatos também verifica essa terminação para evitar prolongamentos verticais sobre a alvenaria.

Os testes verificaram sala retangular, sala em L, encontro em T, pilar de quatro faces, corredor com terminação, reentrância, escalonamento e contato diagonal. As superfícies conectadas formaram os contornos esperados, com todos os segmentos dentro de células sólidas. Cinco mapas gerados também foram renderizados, além de conferir a abertura do inventário e uma passagem de andar pela escada. A construção do cache com os cantos ficou entre 131 e 162 ms no Chrome headless com GPU desabilitada.

### Validação desta reforma

Capturas reais do Chrome cobriram os andares 1, 2 e 8, a escada, o mapa completo e o inventário aberto sobre o cenário. Uma caminhada até a escada do andar 8 avançou ao andar 9. O ataque também foi exercitado pela tecla Espaço.

Cinco seeds de teste (`0`, `1`, `1957`, `471836`, `4294967295`) produziram cenários renderizados com todas as células caminháveis conectadas. A renderização preservou o conteúdo da matriz de terreno. No Chrome headless com GPU desabilitada, a construção do cache ficou entre 87 e 96 ms por andar e as chamadas seguintes ao desenho do cenário ficaram, em média, entre 1,9 e 2,9 ms. A tocha foi verificada como RGBA com valores de alpha entre 0 e 255.

### Prompt final do atlas

Create a production game environment texture atlas for Chaos Crawl, a 2D top-down dungeon crawler. Input image 1 is the approved inventory art, a STYLE REFERENCE ONLY. Match its stylized hand-painted dark fantasy stone, beautifully beveled chunky shapes, controlled brushwork, charcoal/slate blue-green, worn warm ochre stone edges, and readable cartoon illustration finish. The map will have real moving characters and procedural geometry; this output must be modular texture artwork.
EXACT LAYOUT: one square image, FOUR EQUAL square cells, in a 2 by 2 grid. Each quadrant fills its cell completely, no padding, no separators, no margin.
TOP LEFT: seamless TOP-DOWN dungeon floor texture. Around 3 to 4 large irregular rectangular flagstones across and 3 to 4 across height, naturally staggered. Mostly quiet dark desaturated teal gray stone with soft broad brush shading, rounded/chipped bevels, subtle cracks, low contrast grout. Large simple slabs, generous calm surfaces. Equally bright everywhere; no vignette or directional perspective. Match left-right and top-bottom edges to tile seamlessly. No gold outlines, ornaments, moss bushes, holes, debris or objects.
TOP RIGHT: matching seamless floor VARIANT, same scale and value and edge compatibility. Use different large stone proportions and restrained warm gray variation on a few slabs, some diagonally chipped corners. Similar calm readability.
BOTTOM LEFT: a straight FRONT FACING dungeon WALL segment, square texture. TOP QUARTER is the flat overhead coping/top face of thick wall, worn slate stone with ochre catching edges. BOTTOM THREE QUARTERS is vertical face with two rows of large bold hand-cut gray stone blocks. Solid rectangular continuous masonry filling all edges. Simple readable blocks, gentle ambient shadow at foot. Perfect horizontal repeat at both ends. Orthographic square grid compatible, straight horizontal lines, no isometric skew.
BOTTOM RIGHT: a clearly readable rectangular staircase descending NORTH into a dungeon opening, seen from above at a slight elevated RPG angle. Five broad descending steps, chunky beveled stone rim, discreet warm brass corner details, deep desaturated teal shadow near top. The opening occupies 85 percent of the square. Surround it with the same floor slate as the upper textures. Straight geometry aligned to image axes.
Output only the full-bleed texture atlas. No interface, text, labels, characters, torches, frames around atlas cells, grids, arrows, symbols, lighting beams, photographic realism or render of a whole room. All four cells opaque.

### Prompt final da tocha

Create one production-ready 2D WALL TORCH sprite for Chaos Crawl, matching the stylized hand-painted chunky dark stone and bronze style of the approved inventory in input image 1 (STYLE REFERENCE ONLY). A single upright medieval sconce with a small black wrought iron mounting plate, warm worn brass cup and bracket, short dark timber shaft, and an elegant amber/orange/yellow flame. Slightly elevated RPG view compatible with top-down dungeon walls. Clearly readable silhouette and thick stylized bevels, subtle broad brush shading, polished fantasy game item illustration. Entire object centered upright, fully visible including mounting bracket and flame. Portrait canvas with generous fully transparent padding. Sprite about 65 percent canvas width, 85 percent height. Brass subdued, flame luminous warm amber. Genuine transparent alpha around every outer edge and between the bracket and shaft. The only pixels outside the torch are transparent. No wall, stone panel, floor, background glow, smoke cloud, text, UI, border, multiple objects or scenery.

## Materiais variados por andar — 26/11/2026

Os andares usam três conjuntos com superfícies suaves e juntas discretas, produzidos pelo ImageGen integrado a partir da referência aprovada do inventário.

| Arquivo | Material | Resolução |
| --- | --- | --- |
| `gameplay-terrain-slate.png` | Lajes escuras de ardósia, faces amplas e desgaste discreto | 1254 × 1254 |
| `gameplay-terrain-limestone.png` | Pedra clara envelhecida, piso de grandes placas e paredes de alvenaria | 1254 × 1254 |
| `gameplay-terrain-earth.png` | Terra compactada com pedras esparsas e paredes rochosas | 1254 × 1254 |

Cada atlas contém duas amostras de piso, a parede frontal e a escada correspondente ao material. A amostragem do piso exclui a faixa divisória do atlas para obter emendas limpas.

### Seleção e integração

`gameplayArt.appearance(seed, number)` gera o objeto `appearance` com índice de material e seed visual. `generateFloor` adiciona esses dados depois de completar `populateFloor`. A sequência cosmética utiliza estado próprio. Cada passo escolhe um dos outros dois materiais, oferecendo uma sequência reproduzível para cada seed.

A seed visual determina a escala e o deslocamento das amostras, a distribuição de desgaste ocasional e o deslocamento da alvenaria. Cada conjunto também fornece cores de sombra e chanfro. Os dados de configuração, o carregamento dos três atlas e a renderização ficam em `gameplay-art.js`. O terreno é rasterizado quando mudam as células, o material ou a seed visual. Dados de andares anteriores sem `appearance` usam ardósia como apresentação padrão.

Ao integrar com o trabalho paralelo, preserve os métodos de personagens, equipamentos e armas existentes em `gameplay-art.js` e combine somente a configuração de terreno, os métodos de cenário e o novo campo em `generateFloor`.

### Validação dos materiais

- Uma comparação de 25 combinações de seed e andar com a versão anterior confirmou a mesma geometria, entrada, escada e distribuição de inimigos. A assinatura SHA-256 foi `c03f858dfc30993c98112317154aa93c8fd47f12c7546a222064438a2b09f5d8`.
- Foram verificadas 600 aparências, com reprodução idêntica pela seed, três materiais disponíveis e alternância entre andares consecutivos.
- Os oito formatos de canto foram exercitados nos três materiais, totalizando 24 combinações, incluindo terminações frontais. Os contornos ficaram conectados nas células sólidas.
- A troca de material e de seed visual com a mesma matriz de células reconstruiu o cache. Chamadas seguintes reaproveitaram o terreno. Andares sem metadados visuais também foram desenhados.
- Capturas do Chrome cobriram comparação do mesmo trecho nos três materiais e seis andares consecutivos. As escadas foram atravessadas com os três materiais. Movimento, ataque e abertura do inventário também foram exercitados.
- No Chrome headless com GPU desabilitada, a construção do cache ficou entre 99 e 148 ms. O desenho posterior do cenário em um canvas de 1792 × 1024 com escala 4× ficou em torno de 5,8 ms por chamada.

### Prompts finais dos materiais

#### slate

Produce a production texture atlas for a 2D top-down dungeon crawler. Image 1 is a STYLE REFERENCE for painted fantasy materials only. Deliver ONE square image divided into FOUR EXACT equal square quadrants, 2 columns by 2 rows. Full bleed with no margin or gutters.
This environment is walked over for many hours. PRIORITY: CALM, LOW-CONTRAST WALKABLE SURFACES with very sparse wear. Use broad smooth painted shapes and restrained material detail. The reference's dark fantasy crafted illustration style should come through in shading and stone shapes, with much quieter floor surfaces. Mortar lines must be extremely thin, shallow and CLOSE IN VALUE to the stone. No black outline around every stone, no golden outlining, no dense cracks or mosaic of little rocks, no noisy high frequency surface. Uniform diffuse illumination.
QUADRANT ROLES:
TOP LEFT: seamless top-down repeating floor material, as described below. Large calm surface areas. No frame, objects or perspective. Left-right and top-bottom matching edges.
TOP RIGHT: a second matching seamless floor swatch, same average hue, brightness, material size and edges as top left, with sparse local wear or a few subtly changed shapes. This is an occasional variation, not a different checkerboard color.
BOTTOM LEFT: straight orthographic front-facing wall material filling the quadrant. TOP QUARTER is a flat broad coping surface of the same stone, continuous and quiet. BOTTOM THREE QUARTERS are the wall's vertical masonry, two rows of broad blocks. Compatible with horizontal repeat, no skew or isometric angle.
BOTTOM RIGHT: square downward stair opening with 5 broad steps descending north into shadow, viewed as a slightly elevated top-down RPG sprite. A restrained matching masonry rim, opening centered, fills 88 percent of cell. A little of the floor material surrounds it. No gold ornamental corners. All four quadrants completely opaque, flush to each edge. No text, UI, labels, torches, props, characters, decoration, large crevices, vegetation clumps or mockup of a room.
MATERIAL DIRECTION: Worn DARK SLATE FLAGSTONES. Desaturated smoky graphite, soft blue-gray and a touch of muted green. The floor is mostly flat, lightly burnished slate in large simple rectangular slabs with softened nearly invisible joints, about 3 slabs across each swatch, offset arrangement. At least 90 percent of each slab is an uninterrupted flat gently shaded face. Very occasional hairline scratch. The second swatch adds restrained polished wear, never extra dark cracks. Walls are broad charcoal slate blocks with softly rounded edges and subdued silver-gray bevels. Calm and understated. No copper or gold vein outlines.

#### limestone

Produce a production texture atlas for a 2D top-down dungeon crawler. Image 1 is a STYLE REFERENCE for painted fantasy materials only. Deliver ONE square image divided into FOUR EXACT equal square quadrants, 2 columns by 2 rows. Full bleed with no margin or gutters.
This environment is walked over for many hours. PRIORITY: CALM, LOW-CONTRAST WALKABLE SURFACES with very sparse wear. Use broad smooth painted shapes and restrained material detail. The reference's dark fantasy crafted illustration style should come through in shading and stone shapes, with much quieter floor surfaces. Mortar lines must be extremely thin, shallow and CLOSE IN VALUE to the stone. No black outline around every stone, no golden outlining, no dense cracks or mosaic of little rocks, no noisy high frequency surface. Uniform diffuse illumination.
QUADRANT ROLES:
TOP LEFT: seamless top-down repeating floor material, as described below. Large calm surface areas. No frame, objects or perspective. Left-right and top-bottom matching edges.
TOP RIGHT: a second matching seamless floor swatch, same average hue, brightness, material size and edges as top left, with sparse local wear or a few subtly changed shapes. This is an occasional variation, not a different checkerboard color.
BOTTOM LEFT: straight orthographic front-facing wall material filling the quadrant. TOP QUARTER is a flat broad coping surface of the same stone, continuous and quiet. BOTTOM THREE QUARTERS are the wall's vertical masonry, two rows of broad blocks. Compatible with horizontal repeat, no skew or isometric angle.
BOTTOM RIGHT: square downward stair opening with 5 broad steps descending north into shadow, viewed as a slightly elevated top-down RPG sprite. A restrained matching masonry rim, opening centered, fills 88 percent of cell. A little of the floor material surrounds it. No gold ornamental corners. All four quadrants completely opaque, flush to each edge. No text, UI, labels, torches, props, characters, decoration, large crevices, vegetation clumps or mockup of a room.
MATERIAL DIRECTION: ANCIENT PALE LIMESTONE AND ASHLAR. Warm dusty gray-beige and desaturated sandy stone, medium lightness (not white), distinct from blue slate. Floor of very large smooth time-worn limestone pavers, 2 or 3 across each swatch, fine barely visible sand-colored seams, subtly irregular offset lengths. Faint warm patches of age, mostly broad open smooth surfaces. No repeating dramatic cracks, no rounded cobblestones. Second floor swatch very faint lightly dusty wear. Walls broad pale warm-gray ashlar blocks with softened corners and old sand-colored mortar. Stair rim in the same limestone. Should have architectural elegance, quiet enough to focus on a small moving character.

#### earth

Produce a production texture atlas for a 2D top-down dungeon crawler. Image 1 is a STYLE REFERENCE for painted fantasy materials only. Deliver ONE square image divided into FOUR EXACT equal square quadrants, 2 columns by 2 rows. Full bleed with no margin or gutters.
This environment is walked over for many hours. PRIORITY: CALM, LOW-CONTRAST WALKABLE SURFACES with very sparse wear. Use broad smooth painted shapes and restrained material detail. The reference's dark fantasy crafted illustration style should come through in shading and stone shapes, with much quieter floor surfaces. Mortar lines must be extremely thin, shallow and CLOSE IN VALUE to the stone. No black outline around every stone, no golden outlining, no dense cracks or mosaic of little rocks, no noisy high frequency surface. Uniform diffuse illumination.
QUADRANT ROLES:
TOP LEFT: seamless top-down repeating floor material, as described below. Large calm surface areas. No frame, objects or perspective. Left-right and top-bottom matching edges.
TOP RIGHT: a second matching seamless floor swatch, same average hue, brightness, material size and edges as top left, with sparse local wear or a few subtly changed shapes. This is an occasional variation, not a different checkerboard color.
BOTTOM LEFT: straight orthographic front-facing wall material filling the quadrant. TOP QUARTER is a flat broad coping surface of the same stone, continuous and quiet. BOTTOM THREE QUARTERS are the wall's vertical masonry, two rows of broad blocks. Compatible with horizontal repeat, no skew or isometric angle.
BOTTOM RIGHT: square downward stair opening with 5 broad steps descending north into shadow, viewed as a slightly elevated top-down RPG sprite. A restrained matching masonry rim, opening centered, fills 88 percent of cell. A little of the floor material surrounds it. No gold ornamental corners. All four quadrants completely opaque, flush to each edge. No text, UI, labels, torches, props, characters, decoration, large crevices, vegetation clumps or mockup of a room.
MATERIAL DIRECTION: UNDERGROUND EARTH AND SPARSE EMBEDDED FLAT STONES. The floor is predominantly quiet compacted matte earth, medium dark desaturated umber with muted olive-gray shadows, gently broad brushed continuous ground, not a stone pavement. Only two or three widely separated flush half-buried flat stones in a whole floor swatch, low contrast with the earth; stones occupy under 15 percent of the floor. No gravel speckle, roots, grass tufts, holes or scattered items. Second floor swatch has a faint warmer compacted soil patch and one sparse flat stone. Earth edge tiling must be seamless. Walls are substantial cool brown-gray natural rock blocks with softly hand-hewn faces and very restrained muted moss in a few mortar seams. Coping is flat worn rock. Staircase is weathered gray-brown rock.

## Sabre e espada de cristal — 27/11/2026

O usuário confirmou o nome visível Espada de guarda reta para o item inicial. A chave shortSword, o id short-sword e o arquivo short-sword.png continuam identificando esse item nos dados existentes.

Os dois desenhos novos foram produzidos pelo imagegen integrado, usando o recorte de cada ícone de inventory-items-painted.png e o sprite short-sword.png como referências. O sabre tem guarda dourada com proteção do punho e lâmina crescente. A espada de cristal tem cabo roxo, guarda metálica e lâmina verde facetada.

| Arquivo | Resolução | Registro |
| --- | --- | --- |
| sabre-curved.png | 256 × 160 | Cabo em (40,80), lâmina para a direita |
| crystal-sword.png | 256 × 160 | Cabo em (40,80), lâmina para a direita |

A preparação dos sprites preserva a transparência e redimensiona cada resultado para 254 × 159. O recorte remove três colunas transparentes à esquerda e acrescenta cinco à direita. No sabre, remove dez linhas transparentes acima e completa a margem inferior. O ponto de apoio fica na região de couro de cada cabo. A preparação usa Sharp.

items.js define curvedSabre e crystalSword com nome, id, ícone e weaponSprite. inventory.js liga as três entradas da categoria arma às definições correspondentes. Cada arma aparece uma vez no catálogo, e o primeiro item começa equipado. O motor existente aplica a arma escolhida às poses de repouso, movimento e golpe e ao retrato do inventário.

### Prompts utilizados

Sabre

> Production game weapon sprite for Chaos Crawl. Input image 1 is the existing item, preserve its individual design. Input image 2 is the in-game rendering style and HORIZONTAL POSE reference. Render ONE isolated whole weapon with TRUE TRANSPARENT BACKGROUND. Wide landscape 8:5 format. Weapon lies precisely horizontally with POMMEL ON LEFT and blade tip pointing RIGHT. Center of handle grip at about x=16% of canvas, y=50%. Guard at x=26%, blade ends x=96%. Fit with narrow safe margins and do not crop. Painterly cartoon fantasy matching image 2's simplified broad shading and dark crisp silhouette, readable at 40px on screen. No hand, floor, cast shadow, background, text or motion blur. No need for rotation frames, this is a single rigid sword whose handle will be attached to existing animation. Turn the curved saber from input 1 clockwise into horizontal. Dark brown leather grip, gold round pommel, brass guard with a distinct D-shaped knuckle bow below handle, wide sweeping worn steel crescent blade bending UPWARD with its tip to the RIGHT. Preserve its pronounced curved profile, no straightening of blade. Keep handle axis horizontal and grip on center height, with the hooked tip above the axis.

Espada de cristal

> Production game weapon sprite for Chaos Crawl. Input image 1 is the existing item, preserve its individual design. Input image 2 is the in-game rendering style and HORIZONTAL POSE reference. Render ONE isolated whole weapon with TRUE TRANSPARENT BACKGROUND. Wide landscape 8:5 format. Weapon lies precisely horizontally with POMMEL ON LEFT and blade tip pointing RIGHT. Center of handle grip at about x=16% of canvas, y=50%. Guard at x=26%, blade ends x=96%. Fit with narrow safe margins and do not crop. Painterly cartoon fantasy matching image 2's simplified broad shading and dark crisp silhouette, readable at 40px on screen. No hand, floor, cast shadow, background, text or motion blur. No need for rotation frames, this is a single rigid sword whose handle will be attached to existing animation. Turn the emerald crystal sword from input 1 clockwise into horizontal. Deep purple wrapped grip, small dark-silver angular pommel with pale purple gem, dark charcoal-silver straight crossguard, broad tapered green crystal blade ending in a sharp point on RIGHT. Clear asymmetric emerald facets, pale jade glint, darker green on underside. Crisp solid silhouette, no aura, no magic particle glow. Keep grip and point on the same horizontal center line.

### Validação desta integração

O teste local ../../validacao-armas-iniciais.cjs executou os scripts atuais do jogo com DOM simulado e Canvas Skia. Conferiu 768 desenhos combinando três armas, quatro aparências, oito direções, corrida e repouso e três fases do ataque. Também acionou 32 ataques pelo loop real com as teclas de movimento e Espaço, soltando o movimento durante o golpe. O tempo de ataque terminou em 300 ms, e o deslocamento durante 200 ms de corrida foi de 14,4 unidades.

O arraste exercitou troca, rejeição por categoria, desequipamento, retorno à mochila e reinício. Os ícones e o retrato usaram a arma equipada. Cada definição aparece uma vez no catálogo. As imagens finais têm transparência e o ponto (40,80) fica dentro do cabo.

A prévia ../../previa-armas-iniciais.png compara as três armas nos dois humanos. A prévia ../../previa-sabre-cristal.gif mostra as duas armas novas nas oito direções. O GIF foi medido em 3,2 segundos. Foram inspecionados quadros da animação no mapa. A validação usa rasterização local. A avaliação interativa no navegador fica pendente.

O backup ../../backup-antes-sabre-cristal contém items.js, inventory.js e esta documentação antes da mudança. Para reverter, restaurar esses três arquivos e retirar sabre-curved.png e crystal-sword.png. O popup de atributos ao passar o mouse é a próxima etapa solicitada.
