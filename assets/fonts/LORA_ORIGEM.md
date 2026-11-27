# Lora na criação de personagem

Aplicada em 27/11/2026 no ajuste visual aprovado dos seletores, da ficha e do card da criação. A fonte serifada usa os pesos 500, 600 e 700 e conserva o texto dinâmico. O cenário, títulos e botões pintados nas imagens continuam como parte da arte existente.

A fonte Lora é de Cyreal. O arquivo original, não modificado, foi obtido do diretório oficial google/fonts/ofl/lora. A licença SIL Open Font License 1.1 acompanha a distribuição em OFL-Lora.txt.

- Metadados de origem — https://raw.githubusercontent.com/google/fonts/main/ofl/lora/METADATA.pb
- Arquivo original — https://raw.githubusercontent.com/google/fonts/main/ofl/lora/Lora%5Bwght%5D.ttf
- Licença original — https://raw.githubusercontent.com/google/fonts/main/ofl/lora/OFL.txt
- Arquivo no projeto — lora-variable.ttf, 212196 bytes
- SHA-256 — 822a6621ccbe8d97d20ac88c1c41f5615c9c2c202eaa75f272cd452aac6475a7

lora.css contém o mesmo arquivo como data URL para carregar a fonte ao abrir index.html diretamente pelo sistema de arquivos. O teste local compara os bytes embutidos com o TTF preservado. O jogo não consulta Google Fonts durante o uso. Não houve instalação da fonte no Windows ou dependência nova de pacote.

A variável --creation-font restringe o uso à tela de criação. A ficha usa peso 600, as descrições e os nomes laterais usam 500, e os cabeçalhos e a seleção usam 700. As palavras Raça e Classe têm tamanho e cor de destaque próprios.

O contêiner interno selector-row tem a mesma extensão da placa, com preenchimento igual acima e abaixo. Todos os textos e ícones são centralizados na mesma linha de grid. A moldura fica no pseudo-elemento do fieldset e as setas usam SVG para alinhar sem depender das métricas de um glifo de texto.

Validação em DOM simulado e Canvas local, com medidas dos textos e ícones em larguras de 375, 600, 700, 900 e 1160. A avaliação visual em navegador permanece pendente por indisponibilidade do navegador interno. Backup de HTML/CSS e teste em ../../../backup-antes-alinhamento-seletores. Reverter o ajuste restaurando index.html e style.css e, depois, retirando os quatro arquivos Lora desta pasta se não houver outro consumidor.
