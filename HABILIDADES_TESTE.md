# Habilidades de teste — versão integrada na Principal

Implementação local autorizada em 27/11/2026. Arquivos principais são abilities.js, abilities.css, game.js e index.html. Os dez ícones ilustrados ficam em assets/abilities, em WebP de 128 × 128. Não há dependência de serviço remoto ao jogar.

Importadas da Frente 2 por pedido do usuário, junto dos inimigos da Frente 3. Esta documentação descreve os controles da Principal após a integração. A cópia da Frente 2 permanece preservada com os controles que tinha na origem.

## Uso

- Clique num dos cinco slots para abrir o seletor para cima e escolher uma habilidade. A escolha é livre nesta etapa, inclusive repetida em outro slot.
- Pressione 1 a 5, na fileira principal ou no teclado numérico, para ativar o slot. Clicar no slot abre a seleção, sem utilizar a habilidade.
- Imediatas ativam pela tecla. Habilidades de direção, alvo e local mostram a mira e aguardam clique esquerdo no mapa. Botão direito no mapa ou Esc cancela sem custo. Selecionar outra habilidade substitui a mira anterior.
- Cliques duplos/triplos do mesmo gesto de confirmação do Golpe Duplo são consumidos, sem criar ataque básico automático depois da habilidade. Uma ativação mantém dois cortes, um custo e uma recarga. Um clique novo ou em outro destino continua emitindo uma ordem normal.
- A energia é conferida antes de abrir a mira. Abaixo do custo, aparece Energia insuficiente, sem mira, gasto ou interrupção da ordem de movimento atual. O valor exato do custo permite mirar. A confirmação do clique verifica a energia novamente antes de gastar.
- Mira de direção parte do centro do corpo e mostra o cone ou a faixa de trajetória do Gancho, com ponta metálica. O círculo pontilhado de alcance foi removido. Mira de alvo destaca o inimigo e conserva o alcance da habilidade. Mira de local mostra só a área no chão: Frasco e Isca não têm limite de distância, mas exigem piso válido e visão direta. Cor vermelha indica alvo/local inválido; clicar num destino inválido conserva a mira e não gasta Energia.
- Clique no chão para andar até o ponto. O caminho contorna paredes e inimigos vivos. Clique no inimigo para perseguir até o alcance e repetir o ataque básico. Novo comando de movimento ou habilidade cancela a perseguição. Na Principal, WASD/setas, Espaço e I foram substituídos pelos controles por mouse já aprovados.
- Clique no item para recolher depois de ele aterrissar. Mochila cheia mantém o item no chão. O botão Inventário fica à esquerda das habilidades; as barras acima mostram vida em vermelho à esquerda e energia em dourado à direita, sem números visíveis.
- R recupera a Energia para testar. A recuperação é um comando explícito do modo de teste, não uma regra de regeneração aprovada para o jogo final.
- Vida regenera por Vigor e Energia por Vontade. Um período tem 10s e vinte ticks de 0,5s; cada tick recupera Vigor/20 e Vontade/20, até o máximo de cada recurso. A regeneração continua durante combate e com inventário aberto. ATRIBUTOS_E_TEMPO.md detalha limites e precisão.
- Atributos e recursos exibidos na ficha/criação usam inteiros arredondados para baixo. Os cálculos continuam fracionários; as barras mostram a proporção real, sem números.
- O seletor e o inventário não pausam os inimigos. Ao abrir inventário/catálogo, a mira e a ordem de movimento pelo mouse são canceladas. Perder foco da janela ou morrer também cancela a mira e a perseguição.
- Seleção de texto, Ctrl+A/Cmd+A, arraste nativo e menu de botão direito do navegador são bloqueados em todas as telas da página. O arraste próprio do inventário e o botão direito para cancelar a mira continuam funcionando.

## Valores provisórios

| Habilidade | Ativação | Energia | Recarga | Efeito |
| --- | --- | --- | --- | --- |
| Golpe Duplo | Direção | 12 | 3s | Dois cortes com 80% da Força cada, intervalo de 170ms, alcance 25, sem dano da arma |
| Gancho de Guerra | Direção | 15 | 5s | Projétil de alcance 100, dano igual à Força e puxão do primeiro inimigo; paredes e corpos limitam o puxão |
| Ataque Circular | Imediata | 18 | 4s | 120% da Força, raio 30, um acerto por inimigo |
| Pele de Ferro | Imediata | 15 | 8s | Soma à Armadura 50% da Força por 6s, sem diminuir Força; reaplicação substitui o bônus, sem acumular |
| Sopro de Fogo | Direção | 18 | 4s | Cone de 60 graus e alcance 65, dano de fogo igual a 150% do Intelecto, um acerto por alvo |
| Frasco Venenoso | Local | 22 | 6s | Sem limite de distância, exige piso e visão direta. Voo visual de 350ms, poça de raio 28 por 5s e dano de veneno igual a 40% do Intelecto por segundo dentro da área |
| Prisão de Gelo | Alvo | 20 | 7s | Alcance 100, congela por 3s sem dano inicial. Próximo dano positivo quebra a prisão e acrescenta dano de gelo igual ao Intelecto registrado ao conjurar |
| Corrente Elétrica | Alvo | 20 | 5s | Primeiro alvo até 110, até quatro alvos únicos com saltos até 50 e linha desobstruída. 120% do Intelecto como dano elétrico em cada alvo |
| Orbes Sentinelas | Imediata | 24 | 8s | Três orbes por até 10s, cada uma some no contato e causa dano mágico igual ao Intelecto; reutilizar substitui as restantes |
| Isca Ilusória | Local | 16 | 7s | Sem limite de distância, exige piso e visão direta. Ilusão por 6s com resistência a três golpes. Atrai inimigos em até 90 e com linha desobstruída. Não causa dano |

Unidades de alcance são as coordenadas de mundo já usadas no jogo; não são pixels da tela. Recargas são compartilhadas pelo id da habilidade, mesmo em slots diferentes. Trocar a seleção não remove recarga. Recursos e seleções reiniciam ao começar outra partida. Efeitos, projéteis e isca são limpos ao descer de andar; o tempo restante da armadura e a recarga continuam dentro da mesma partida.

## Regras de dano

Dano físico das habilidades é Força × multiplicador menos Armadura do inimigo, com mínimo zero. O dano da arma não é consultado. Dano elemental é Intelecto × multiplicador × (1 − resistência / 100), com resistência limitada entre 0 e 100 no cálculo. Orbes causam dano mágico de Intelecto sem elemento. Armadura não foi aplicada ao dano mágico nesta base de teste; a decisão definitiva continua pendente de balanceamento. Os danos podem manter casas decimais para não perder frações em veneno e resistências.

O ataque básico continua usando Força mais o dano da arma menos Armadura. Golpe Duplo reutiliza as poses de corte, mas impede o acerto do ataque básico durante sua sequência. Nenhuma habilidade é exclusiva de raça ou classe nesta etapa. O sistema definitivo de habilidades permanentes por raça/classe e habilidades concedidas por itens foi explicitamente adiado no escopo aprovado. Portanto Dracônico e Alquimista usam aqui o mesmo seletor livre que as demais combinações.

Os inimigos existentes continuam com Vida 3 e Força 1. Podem morrer com um só acerto e não vencer a armadura inicial. Esses valores foram preservados para não misturar o trabalho de habilidades com o balanceamento das outras frentes. Os testes automatizados usam alvos isolados com mais vida para verificar duração e dano; isso não altera os inimigos reais.

As cinco famílias importadas têm aparência e preparação de ataque próprias, sem progressão de atributos por profundidade. Mortes causadas por habilidades, quebra do gelo ou ataque básico usam o mesmo drop de um item com chance de 50%, incluindo animação e coleta por clique. Continuam de 4 a 10 inimigos por andar e 65 itens no pool aleatório.

## Arte e produção

Os ícones foram gerados com imagegen integrado, uma chamada por habilidade, com linguagem de pintura de fantasia, pedra escura e detalhes metálicos. Os assuntos usados nos prompts e os caminhos originais retornados estão em ability-icons-production.json. São espadas com dois cortes, gancho em corrente, golpe circular, braço metálico, dragão soprando fogo, frasco venenoso, prisão glacial, corrente elétrica, três orbes e ilusão. Os resultados foram reduzidos com Sharp para os WebP finais. A prévia conjunta de evidência fica em validation/output/icones-habilidades.png. O jogo consome somente os arquivos finais locais. Sem API/CLI adicional, chave, instalação ou plugin externo para gerar a arte.

Os efeitos de teste usam o Canvas já existente, com cortes, cone com partículas, gancho em voo, frasco em arco, poça borbulhante, cristal, raios, orbes e isca translúcida. As animações de corpo reaproveitam as poses inteiras existentes; não há novos desenhos de corpo por habilidade.

Pele de Ferro e Ataque Circular receberam depois um ajuste visual aprovado na Principal: Pele de Ferro aplica cinza metálico ao próprio personagem, com entrada/saída suaves, sem oval nem pulso circular. O Ataque Circular faz uma volta da arma equipada e um rastro de corte afilado, desenhados atrás/à frente do corpo com as poses inteiras já existentes. Não há sprites novos por combinação, nem mudança nos valores da tabela. A tonalidade acompanha repouso, corrida e ataque; o corte continua causando dano uma única vez na ativação, como antes.

As correções seguintes da Frente 2 mantêm esses acabamentos da Principal: Sopro/Golpe Duplo saem do centro do corpo, Gancho tem corrente de elos e ponta metálica e as miras mostram somente sua área ou trajetória. A projeção visual usa o centro do corpo; colisões e paredes continuam calculadas no piso. Não foram produzidas novas imagens para essa correção.

## Validação e limites

```powershell
node validation/habilidades.cjs
node validation/criacao-atributos.cjs
node validation/popup-dano.cjs
node validation/seletores-cursor.cjs
node validation/controles-mouse.cjs
node validation/drops.cjs
node validation/drop-animacao.cjs
node validation/inimigos.cjs
node validation/integracao-frentes.cjs
node validation/efeitos-ferro-circular.cjs
node validation/regeneracao.cjs
node validation/miras.cjs
node validation/inteiros-golpe-duplo.cjs
```

O teste de habilidades exercita 50 escolhas nos cinco slots, teclas numéricas, consumo e recarga, cancelamentos, os dez efeitos, escalas e resistências, dano sem arma, não acúmulo/expiração da armadura, congelamento/quebra, veneno dentro/fora, corrente sem repetição, puxão e colisão, orbes consumíveis e isca recebendo ataques. Exercita também eventos de mouse com coordenadas de Canvas e câmera, chegada ao ponto, desvio por parede, perseguição e ataque, limpeza ao trocar andar e morte. Renderiza dez cenas locais e verifica os arquivos de ícones.

Os testes usam DOM simulado e Canvas local. A tentativa de abrir esta worktree no navegador interno retornou Local browser access is unavailable for this chat. A conferência real da barra, abertura do seletor, foco, interação com o mouse e fluidez permanece pendente. Não foi usado navegador externo nem controle do PC.

## Backup e reversão

O backup original backups/antes-habilidades pertence à worktree da Frente 2, na base 6115270f4a58a2ea0998af55cd6a3a5665a8c672. Não usar essa base antiga para restaurar a Principal, pois removeria controles e drops posteriores. O backup da integração é retornado por git rev-parse --git-path codex-backups/integracao-frentes-20261127. O diretório principal guarda as alterações locais anteriores; frente-2 e frente-3 guardam snapshots dos arquivos de origem, acompanhados de source-manifest.json. Para reverter a integração, preservar trabalho posterior, restaurar seletivamente a cópia anterior da Principal e retirar somente arquivos novos importados. As outras worktrees não foram editadas. Sem commit, merge de branches ou push nesta etapa.
