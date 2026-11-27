# Direção dos inimigos e ambientes

Diretriz explícita do usuário, registrada em 27/11/2026 na Frente 3.

## Liberdade de variedade

Chaos Crawl não precisa se limitar a monstros típicos de masmorra ou a ambientes inteiramente de pedra. Inimigos podem ser estranhos, variados e inesperados. Andares futuros podem usar terra, grama e outros detalhes de terreno para reduzir a repetição visual da partida.

Essas mudanças de aparência não exigem história, realismo ecológico, física realista ou um bioma exclusivo para cada criatura. Preservar a identidade ilustrada do jogo e a leitura de movimento, ameaça e colisão. A variedade visual deve ajudar a rejogabilidade.

Esta diretriz orienta conteúdo futuro; não autoriza implementar terrenos, inimigos adicionais ou novas regras sem escopo próprio aprovado.

## Primeiro conjunto de famílias

| Família | Versão inicial | Caminho possível de variantes |
| --- | --- | --- |
| Esqueleto | Sem cabeça, ossos gastos e tecido rasgado | Com crânio, capacete, crânio em chamas |
| Gosma | Pequena e verde | Maior, venenosa, núcleo incandescente |
| Rato | Magro, pelagem irregular | Gigante, espinhos de osso, contaminado |
| Carapaça | Besouro com casco de pedra | Casco reforçado, cristais, rachaduras de magma |
| Armadura possuída | Armadura vazia e enferrujada | Peças completas, placas negras, energia elemental |

As variantes futuras reaproveitam identidade, movimentos e partes da arte quando isso funcionar visualmente. Silhueta, equipamento, material e efeitos devem ajudar a distinguir a ameaça; o nome e a cor sozinhos não bastam. As progressões acima são exemplos, não conteúdo produzido ou balanceado.

## Proposta do pool

Cada andar seleciona uma lista elegível de variantes e seus pesos relativos. Faixas de profundidade se sobrepõem: uma variante nova começa rara, fica mais comum e pode substituir gradualmente outra. Um inimigo pode sair do pool depois de alguns andares. O número de inimigos é uma configuração separada dos pesos.

Exemplo de planejamento, sujeito a balanceamento futuro:

| Andares | Pesos relativos |
| --- | --- |
| 1–2 | Esqueleto sem cabeça 60, Gosma 40 |
| 3–4 | Esqueleto sem cabeça 30, Gosma 30, Rato 40 |
| 5–6 | Esqueleto com crânio 40, Rato 35, Carapaça 25 |
| 7–8 | Esqueleto com crânio 25, Gosma venenosa 25, Carapaça 30, Armadura incompleta 20 |
| 9–10 | Esqueleto com capacete 35, Rato gigante 25, Armadura incompleta 40 |

Família, variante e pool são conceitos separados. A seed do andar pode determinar as escolhas para reprodução. Os inimigos continuam finitos, sem reaparecer após serem derrotados. Nenhum pool, atributo ou comportamento novo foi implementado nesta etapa.

## Prévia estática

As cinco imagens em ../../assets/enemies/concepts são primeiras propostas para avaliação. Foram geradas individualmente pelo imagegen integrado, com gameplay-actors.png como referência de estilo. A prancha previa-cinco-familias.png permite comparar ampliações e escalas menores propostas. A escala reduzida é uma simulação de apresentação, não captura do jogo ou tamanho definitivo.

Esse foi o primeiro estágio de prévia estática. prompts.json guarda o texto completo dessas gerações.

## Estado integrado na Principal — 27/11/2026

O usuário aprovou depois a produção de repouso, movimento e ataque nas oito direções, com preparação, impacto e recuperação. A Frente 3 produziu cinco atlas, cada um com cinco vistas e oito poses; as vistas à esquerda são espelhadas para compor as oito direções. Os arquivos finais WebP ficam em assets/enemies, as fontes e os conceitos foram preservados nas subpastas correspondentes e enemy-art-data.js contém os quadros/âncoras.

As cinco famílias foram importadas na Principal por pedido de reunir as Frentes 2 e 3 para teste. A distribuição por seed é provisória e usa uma sequência separada para conservar o mapa, posições e quantidade de inimigos. As faixas e pesos planejados acima continuam futuros. Os atributos não foram balanceados: Vida 3, Força 1 e Armadura 0, com quantidade de 4, 6, 8 ou 10 por andar conforme a etapa de testes da Principal. Os golpes próprios usam a mesma distância básica, com arranhão frontal para o esqueleto e os demais ataques corpo a corpo. O ciclo de corrida depende da distância efetivamente percorrida.

Na Principal, gelo interrompe essas famílias, a isca pode atraí-las e mortes por qualquer caminho compartilham o drop de 50%, animação e coleta por clique. Passaram os testes locais de inimigos e de integração; a conferência visual e interativa no navegador permanece pendente pela indisponibilidade do navegador interno. As worktrees de origem permanecem preservadas. Este registro não declara encerrada a conversa interrompida da Frente 3 nem altera a sua cópia.
