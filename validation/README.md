# Validação local

Estes testes vieram das validações já usadas na conversa principal. Agora resolvem os arquivos a partir da raiz desta worktree e podem validar cada frente sem consultar a cópia original.

Executar da raiz do repositório com o Node do host Codex, que já oferece @napi-rs/canvas e sharp. Não há instalação nova de dependências nesta etapa.

```powershell
node validation/criacao-atributos.cjs
node validation/popup-dano.cjs
node validation/seletores-cursor.cjs
```

criacao-atributos confere as dezesseis combinações, atributos da criação e da partida, setas, dados independentes, sorteio ao entrar e reinício. popup-dano cobre a exibição dos itens, arraste e a conta física de dano. seletores-cursor cobre clique nos nomes, estados da luva, cancelamento da captura e medidas dos textos com a fonte Lora distribuída.

harness.cjs carrega os scripts e imagens reais da worktree usando DOM simulado e Canvas local. O desenho segue o código da partida. Os testes não comprovam layout, clique real, GPU ou comportamento do navegador. As comparações textuais com backups de etapas antigas ficaram nos scripts originais fora do repositório, pois eram guardas de revisão dessas alterações, não requisitos de comportamento para futuras funcionalidades.

O teste completo de conteúdo com 65 itens e 15.360 desenhos foi executado antes do commit da base. Os scripts originais e backups permanecem em C:/Users/robson.colaco/Downloads/CODEX/Hack Slash. Não usar esses scripts antigos para validar outra worktree sem ajustar os caminhos, pois eles apontam para o checkout original.
