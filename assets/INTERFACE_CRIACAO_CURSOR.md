# Seletores ilustrados e cursor de luva

Etapa autorizada em 27/11/2026. O usuário pediu integrar as filas e as descrições à arte de Chaos Crawl, selecionar pelos nomes visíveis e usar um cursor de luva que agarra os itens. A correção do projeto/worktree foi recusada nesta etapa. Não alterar a estrutura Git para realizar esta entrega.

## Interface

creation-selector-plaque.png é um recorte do atlas inventory-carved-stone.png, em x 627, y 850, largura 627 e altura 176. O CSS usa a placa com nove regiões para preservar os cantos e a textura nas duas filas. O card reutiliza inventory-frame.png e a pedra escura do inventário. A imagem de criação e as dimensões externas da tela foram preservadas.

Os três nomes visíveis de cada fila são botões. Os nomes laterais selecionam a opção correspondente e a recolocam no centro. O nome central conserva a opção atual. A cada atualização, os botões recebem o índice da opção que exibem e o estado aria-pressed. Setas, dados independentes e sorteio ao entrar continuam operacionais. Os textos, atributos e a aparência mantêm o vínculo existente.

## Cursores

O imagegen integrado produziu cursors/glove-source.png com as três poses transparentes em 2172 × 724. A referência de estilo foi chaos-crawl-menu.png. As imagens foram reduzidas preservando o alpha, a escala comum e a linha inferior do punho. O preparo é reproduzível no script local ../../preparar-interface-cursor.cjs e o registro de recortes está em cursors/registration.json. A fonte copiada pertence ao projeto e não depende da pasta de imagens geradas.

| Arquivo | Uso | Tamanho | Ponto ativo |
| --- | --- | --- | --- |
| cursors/glove-point.png | Cursor normal e controles | 48 × 48 | 8,7 na ponta do indicador |
| cursors/glove-open.png | Espaços ocupados do inventário | 48 × 48 | 23,23 na mão |
| cursors/glove-closed.png | Item pressionado ou arrastado | 48 × 48 | 23,23 na mão |

O CSS aplica cursores nativos com fallback para pointer, grab e grabbing. Não existe uma imagem HTML seguindo o mouse. O estado holding-item entra imediatamente no pointerdown aceito de um item e prevalece sobre os cursores dos controles enquanto ele é segurado. clearDrag o remove antes de liberar a captura do ponteiro. Pointerup, pointercancel, lostpointercapture, perda de foco da janela, fechamento do inventário, limpeza e reinício encerram esse estado. O limiar de cinco pixels para iniciar o deslocamento e as restrições de categoria permanecem como antes. A transição é uma troca de pose, sem atrasar o clique ou o arraste.

## Prompt final

Modo usado foi o imagegen integrado, com transparent_background true e chaos-crawl-menu.png como referência de estilo. Não houve uso de API/CLI, chave ou serviço externo de geração.

```text
Use case: stylized-concept. Asset type: three-state mouse cursor sprite atlas for Chaos Crawl, an illustrated dark fantasy browser dungeon game. The attached menu is STYLE REFERENCE ONLY for painterly materials, worn bronze, dark leather, warm torch highlights and readable illustrated outlines. Generate ONLY three matching isolated medieval right-hand gloves in a single horizontal row, on a genuinely transparent RGBA background, no scene, no panels, no text. Desired canvas 1536 x 512, each hand centered in its own equal square cell, generous transparent separation. Each glove is the SAME practical adventurer's glove, warm ochre brown leather with a simple worn bronze knuckle plate and wrist cuff, clear dark outer contour and subtle ivory edge highlights. Readable at 48 x 48 pixels: strong silhouette, restrained texture, avoid tiny ornamental details. All three hands face diagonally toward the upper left with wrist entering from lower right, viewed from the back of the hand. LEFT cell: index finger pointing to upper-left at 10 o'clock, other three fingers curled, classic clicking hand cursor silhouette, no extra digits. MIDDLE cell: open relaxed hand ready to grasp, four distinct fingers slightly spread toward the upper left and thumb left, same cuff and back of glove. RIGHT cell: same glove closing into a clear compact grasping fist as if gripping a small invisible object, fingers curled naturally, thumb crossing the curled fingers. Similar overall scale, same light, same orientation. No weapon, object, floating particles or cast shadow on a surface. Do not copy the reference menu into the image. The three hands are the complete final deliverable.
```

## Validação e reversão

../../validacao-seletores-cursor.cjs passou por 24 cliques em nomes nas duas filas, incluindo os nomes centrais, as duas bordas, clique de ponteiro e ativação equivalente ao teclado. Conferiu seleção, card, aparência e conservação da outra fila. Conferiu a captura e liberação, pointerup sem deslocamento, categoria inválida, troca válida, sete formas de encerrar a captura, inventário fechado e ponteiros não aceitos. Verificou dimensões, alpha e pontos ativos das três imagens. Mediu textos com a fonte Georgia local em larguras de 700, 900 e 1160 para o nome mais longo e as 16 descrições combinadas. As funções de atributos, início da partida e combate foram comparadas ao backup e preservadas.

Também passaram ../../validacao-criacao-atributos.cjs e ../../validacao-popup-dano.cjs. A validação é local com DOM simulado e Canvas. Não comprova o resultado visual, a exibição nativa dos cursores ou a precisão dos cliques no navegador. O navegador interno está indisponível nesta conversa e nenhum navegador externo ou controle do PC foi utilizado.

O backup ../../backup-antes-seletores-cursor guarda os quatro arquivos de execução imediatamente anteriores e os scripts de teste alterados. Para reverter esta etapa, restaurar index.html, style.css, game.js e inventory.js no projeto. Depois os novos arquivos desta etapa podem ser retirados. As 16 aparências, 65 itens e atributos da etapa anterior estão preservados nas cópias. Alteração exclusivamente local, sem commit ou publicação.
