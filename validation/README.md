# Validação local

Estes testes vieram das validações já usadas na conversa principal. Agora resolvem os arquivos a partir da raiz desta worktree e podem validar cada frente sem consultar a cópia original.

Executar da raiz do repositório com o Node do host Codex, que já oferece @napi-rs/canvas e sharp. Não há instalação nova de dependências nesta etapa.

```powershell
node validation/criacao-atributos.cjs
node validation/popup-dano.cjs
node validation/seletores-cursor.cjs
node validation/drops.cjs
node validation/drop-animacao.cjs
node validation/controles-mouse.cjs
node validation/habilidades.cjs
node validation/inimigos.cjs
node validation/integracao-frentes.cjs
node validation/efeitos-ferro-circular.cjs
node validation/regeneracao.cjs
node validation/miras.cjs
node validation/inteiros-golpe-duplo.cjs
```

criacao-atributos confere as dezesseis combinações, atributos da criação e da partida, setas, dados independentes, sorteio ao entrar e reinício. popup-dano cobre a exibição dos itens, arraste e a conta física de dano. seletores-cursor cobre clique nos nomes, estados da luva, cancelamento da captura e medidas dos textos com a fonte Lora distribuída. Também cobre 59 combinações de alvo/evento do bloqueio global de menu nativo, seleção, arraste e selecionar tudo; confere que os outros atalhos, o arraste próprio dos itens e o botão direito para cancelar a mira permanecem funcionais. Os eventos delegados são simulados; não representam execução real do navegador.

drops confere a chance de 50% por morte, os 65 itens do pool, ausência de duplicação ou novo sorteio no mesmo monstro, acerto sem morte, dano bloqueado, morte com dano excedente, combate pelo mouse, duração limitada ao andar, reinício, mochila cheia e desenho dos ícones. Passar pelo item sem uma ordem de coleta mantém o drop no chão. O teste gera uma prévia local na pasta retornada por git rev-parse --git-path codex-evidence/drop50-20261127, sem acrescentar arquivos ao jogo.

drop-animacao confere a saída do item da posição do inimigo, trajetória por tempo, quique, posição final estável, camadas de desenho, transição curta de morte e aterrissagem bloqueada. Também verifica mochila inicial/reiniciada vazia, apenas a espada inicial equipada, catálogo de testes e equipamento preservado entre andares. Gera drop-animado.gif de 1,6 segundo e fases.png na pasta retornada por git rev-parse --git-path codex-evidence/drop-animado-20261127. Os testes de popup e cursor acrescentam seus próprios itens de teste; não dependem mais de uma mochila inicial preenchida.

controles-mouse cobre clique com Canvas redimensionado e câmera deslocada, chegada ao ponto exato, desvio de paredes e inimigos, destino inacessível, mudança de destino, novo obstáculo, aproximação de alvo móvel, golpes repetidos e seu cancelamento, ausência de golpe através de parede, morte do alvo, coleta após aterrissagem, ausência de duplicação, mochila cheia, abertura/fechamento do inventário sem repassar o clique ao chão, cancelamento por Escape/perda de foco, remoção de WASD/Espaço/I, troca de andar e reinício. Também confere as proporções das barras de vida e energia e valores acessíveis sem texto numérico visível. A geometria final e os cliques reais no navegador permanecem fora da capacidade do harness.

habilidades percorre as dez habilidades da Frente 2, cinquenta escolhas nos cinco slots, ativação numérica, custos e recargas, escalas por Força/Intelecto sem dano de arma, armadura e resistências, congelamento/quebra, veneno, gancho, corrente, orbes, isca e armadura temporária. Na Principal usa o controlador de clique aprovado, com mira interceptando o clique e cancelamentos sem gasto. Confere 28 cenários de energia nas sete habilidades de mira: zero, um ponto abaixo do custo, custo exato e perda de energia entre abertura/confirmação. Também cobre seleção insuficiente sem parar movimento, ausência de mira residual ao trocar habilidade e teclado numérico. Gera validation/output/habilidades.png pelo Canvas real.

inimigos cobre as cinco famílias da Frente 3, 200 quadros de origem, 720 desenhos em oito direções, repouso/corrida/ataque, orientação espelhada, transparência, movimento pela distância, preparação/impacto/recuperação, esquiva, bloqueio por paredes, morte por espada e reprodução de cem seeds. Confere as quantidades dobradas da Principal e não depende dos backups privados da Frente 3. tools/preview-enemies.cjs produz docs/inimigos/oito-direcoes.png e animacoes-oito-direcoes.webp como prévias locais dos desenhos.

integracao-frentes cruza as cinco famílias com nove caminhos de dano/morte, totalizando 45 cenários. Confere drop único por golpe básico, habilidades e quebra de gelo, limiar de 50%, ausência de duplicação, transição de morte nas novas artes, mira sem ordem de movimento, barra dourada consumida/restaurada, inventário cancelando mira, coleta do drop de habilidade, transição de andar e reinício.

efeitos-ferro-circular confere Pele de Ferro em 48 poses (16 combinações em repouso, corrida e golpe), perda de saturação sem acrescentar uma forma visível fora da silhueta e restauração do filtro do Canvas. Também confere bônus/duração de armadura preservados, volta completa da arma, desenho atrás/à frente do corpo nas 16 combinações, uma única arma equipada sem duplicação, as 15 aparências de arma, dano único e limpeza. Aceita apenas arredondamento de alpha de 1/255 nas bordas transparentes do filtro. Gera ferro-circular.gif de 1,6 segundo, fases-circular.png e dezesseis-combinacoes.png na pasta retornada por git rev-parse --git-path codex-evidence/ferro-circular-20261127. São capturas do renderer local, sem comprovar execução no navegador.

regeneracao confere períodos de 10s, ticks de 0,5s, Vigor/Vontade, frações, independência de FPS, resto de tempo, máximos, ausência de reserva extra, mudança de atributo, combate, inventário, foco, andar, reinício e morte no mesmo quadro. Na Principal confere também as barras sem texto numérico, os valores inteiros do inventário com precisão interna preservada e a mira que permanece bloqueada antes de um tick recuperar energia suficiente. O teste de habilidades zera a regeneração apenas nos seus cenários isolados de custo/dano; os atributos reais do jogo são preservados.

miras confere origem no centro do corpo, cone e efeito alinhados nas quatro direções, ausência de circunferência pontilhada, faixa do gancho interrompida por parede, elos e ponta metálica, locais distantes com piso e visão direta, recusa sem custo em parede/piso inválido e alcance de habilidades de alvo preservado. Produz validation/output/miras-centrais.png pelo Canvas real.

inteiros-golpe-duplo reproduz o gesto nativo de confirmação com detail 1/2/3, verifica dez cenários de clique duplo/triplo nos cinco slots e com intervalos de até 400 ms, dois cortes, custo/recarga únicos e ausência de ataque automático extra. Confere que cliques novos e destinos diferentes continuam aceitos, além de limpeza por Escape, foco, andar e reinício. Também verifica inteiros arredondados para baixo na criação/ficha e preservação de frações em regeneração, barras e cálculo de dano. O harness permite informar a contagem nativa do clique para reproduzir o comportamento do navegador em eventos locais.

harness.cjs carrega os scripts e imagens reais da worktree usando DOM simulado e Canvas local. O desenho segue o código da partida. Os testes não comprovam layout, clique real, GPU ou comportamento do navegador. As comparações textuais com backups de etapas antigas ficaram nos scripts originais fora do repositório, pois eram guardas de revisão dessas alterações, não requisitos de comportamento para futuras funcionalidades.

O teste completo de conteúdo com 65 itens e 15.360 desenhos foi executado antes do commit da base. Os scripts originais e backups permanecem em C:/Users/robson.colaco/Downloads/CODEX/Hack Slash. Não usar esses scripts antigos para validar outra worktree sem ajustar os caminhos, pois eles apontam para o checkout original.
