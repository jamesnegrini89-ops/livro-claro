# Livro Claro

Leitura de Bíblia em português e PDFs, com voz e explicações por Gemini.

**Comece pelo arquivo [COMECAR.html](COMECAR.html)**: guia completo para quem não programa.

1. Envie todos os arquivos e pastas deste pacote para a raiz de um repositório público do GitHub.
2. Em **Settings → Pages**, escolha **Deploy from a branch → main → /(root) → Save**.
3. Abra o endereço publicado. Não é necessário instalar dependências ou executar comandos.
4. Experimente com a voz do aparelho. Para IA, adicione sua chave em **Configurações** dentro do aplicativo.

**Nunca envie sua chave API, PDFs pessoais ou cópia dos estudos ao repositório.**

A interface do GitHub Pages é pública. Seus livros, conversas e progresso ficam neste navegador; ao usar Gemini, os trechos necessários são enviados ao Google. Não há backend, login ou sincronização entre aparelhos.

Inclui Bíblia Livre 2018.2.0 (66 livros), preservada sob CC BY 3.0 Brasil. Não é KJA. [Créditos](CREDITOS.html).

A assinatura do aplicativo Gemini é separada da API. Use projeto sem faturamento para ficar na faixa gratuita, sujeita à disponibilidade e limites do Google. A voz do aparelho não usa a API Gemini.

Requisitos: navegador moderno, HTTPS (GitHub Pages já fornece) ou servidor local em localhost. Microfone, vozes e instalação variam por navegador. A leitura pausa quando o aplicativo fica em segundo plano. PDFs protegidos por senha precisam ser desbloqueados antes de importar.

Todos os caminhos são relativos para funcionar também em `usuario.github.io/livro-claro/`. O service worker guarda apenas arquivos públicos do aplicativo. A chave não entra no cache do service worker, no backup ou no código.
