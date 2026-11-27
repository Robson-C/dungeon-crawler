# Atributos, períodos e ticks

Regra definida pelo usuário e aplicada à regeneração em 27/11/2026, na Frente 2. Este documento faz parte dos arquivos locais desta worktree para continuidade em outro computador. Não significa que a versão já foi enviada ao GitHub.

Importada depois para a Principal pelo pedido de juntar as correções das outras conversas. As fórmulas abaixo são as mesmas aprovadas na Frente 2; a Principal conserva seu HUD com barras sem números e os controles por mouse.

## Padrão de tempo

- Um período equivale a 10 segundos.
- Um tick equivale a 0,5 segundo.
- Um período contém 20 ticks, com dois ticks por segundo.
- Quantidades descritas por período são divididas por 20 para aplicação em cada tick. O total por segundo é a quantidade por período dividida por 10.

## Regeneração implementada

Vigor corresponde à quantidade de Vida recuperada em um período. Vontade corresponde à quantidade de Energia recuperada em um período. Não se trata de porcentagem da Vida/Energia máxima.

| Atributo | Recurso por período de 10s | Por segundo | Por tick de 0,5s |
| --- | --- | --- | --- |
| Vigor 10 | 10 de Vida | 1 | 0,5 |
| Vigor 15 | 15 de Vida | 1,5 | 0,75 |
| Vontade 10 | 10 de Energia | 1 | 0,5 |
| Vontade 5 | 5 de Energia | 0,5 | 0,25 |

Fórmulas aplicadas em cada tick são Vida += Vigor / 20 e Energia += Vontade / 20. O valor atual do atributo é consultado no tick, inclusive após modificadores de raça e classe. Valores negativos de regeneração são tratados como zero. Recursos nunca ultrapassam seus máximos e uma barra cheia não armazena recuperação extra para depois.

A regeneração ocorre durante combate, movimento e com o inventário aberto, pois a partida continua ativa. Ela não ocorre no menu, na criação ou após morte e não ressuscita quem chegou a zero. O tick é processado depois dos ataques inimigos do quadro, com verificação de que o personagem ainda está vivo. Uma troca de andar preserva a fração de tempo acumulada. Nova partida reinicia o contador.

O tempo fracionário dos quadros é acumulado e só aplicado quando completa 500ms. Quadros com duração maior podem processar mais de um tick, sem depender de FPS. A perda de foco zera a referência do quadro por meio do fluxo existente; não é concedida recuperação retroativa pelo tempo de relógio passado com a janela fora de foco. Não foi criado timer de sistema ou simulação offline.

Os valores reais preservam frações. Por correção posterior solicitada pelo usuário, todos os valores visíveis de atributos e recursos usam inteiros arredondados para baixo: 7,75 aparece como 7. Isso vale no inventário e na criação. As barras vermelha/dourada mantêm somente cores, sem números, e acompanham os valores fracionários reais. O arredondamento é somente visual e não interfere na recuperação, no custo das habilidades ou no dano.

## Ataques e habilidades

- Ataque básico usa Força + sorteio do dano da arma, com a mitigação física já implementada.
- Habilidade física usa exclusivamente Força como atributo de dano, com seu multiplicador, sem somar o dano da arma.
- Habilidade mágica usa exclusivamente Intelecto como atributo de dano, com seu multiplicador, sem somar o dano da arma.
- Armadura e resistências continuam como mecanismos de mitigação, separados do atributo que gera o dano.

O padrão de período/tick servirá também para os efeitos de dano contínuo quando forem ajustados. Esta etapa não converteu o veneno, não alterou seus valores e não fez cortes ou projéteis causarem dano repetido a cada tick. O Frasco Venenoso ainda usa os cinco pulsos de um segundo da primeira implementação. Sua futura migração deverá definir a quantidade por período e aplicar a fração por tick mantendo a regra de dano somente dentro da área.

## Arquivos e verificação

game.js define attributeTiming e regenerateResources e integra a recuperação ao frame. formatResource é usado nos valores do inventário; as barras da Principal usam a proporção real. O atalho R continua como utilitário de teste e não é necessário para a regeneração funcionar. A mira continua bloqueada abaixo do custo e pode ser aberta quando um tick recuperar energia suficiente.

node validation/regeneracao.cjs verifica os limites de tempo, vinte ticks por período, atributos diferentes e alterados, precisão das frações, vários tamanhos de quadro, máximos, ausência de reserva extra, inventário com inteiros, barra precisa, habilidade gastando Energia, troca de andar, perda de foco, nova partida e morte no mesmo quadro. O teste de habilidades zera Vigor/Vontade nas suas situações isoladas para medir dano e custos sem misturar regeneração. As regras reais dos personagens não foram modificadas por isso. validation/inteiros-golpe-duplo.cjs confere a formatação na ficha/criação e que o arredondamento não altera os cálculos.

Backup anterior em backups/antes-regeneracao com game.js, abilities.js, revisão, documento das habilidades e teste de habilidades anteriores, conferidos por hash. Restaurar game.js e abilities.js e o teste habilidades.cjs correspondente reverte o comportamento desta etapa. Sem commit, push, publicação ou integração às outras frentes nesta tarefa. Para continuar em casa, esta worktree ainda precisa ser transferida ou publicada por um fluxo autorizado; somente documentar localmente não sincroniza outro computador.

O parágrafo acima descreve a etapa original da Frente 2 e seu backup naquela worktree. O backup da importação na Principal é retornado por git rev-parse --git-path codex-backups/integracao-correcoes-frentes-20261127, com a cópia anterior da Principal e snapshots das fontes. Reverter a importação exige essas cópias atuais, preservando os efeitos e controles posteriores à base antiga. As duas worktrees de origem não foram editadas na integração. A importação local não equivale a envio ao GitHub.
