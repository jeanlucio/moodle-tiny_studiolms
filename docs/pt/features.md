# ✨ Funcionalidades

* 🧱 **18 Blocos Instrucionais,** inseridos pela barra de ferramentas do editor e configurados por formulários — sem precisar de HTML:
  * **Título Estilizado** — título `h3`/`h4` com ícone e cor de fundo.
  * **Botão de Ação** — botão de chamada para ação com URL, destino, cores, raio de borda e alinhamento configuráveis.
  * **Cartão Avançado** — cartão com imagem ou vídeo do YouTube ou do Vimeo, corpo rico editável e botão interno.
  * **Accordion** — tópico expansível com 4 estilos de ícone e estado inicial aberto/fechado.
  * **Webteca** — biblioteca de recursos (PDF, vídeo, áudio, link) em lista ou grade.
  * **Grid de Cards** — container multi-coluna com slots editáveis, título opcional e uma linha de descrição embaixo dele (dois campos de texto puro).
  * **Caixa de Destaque** — destaque com ícone e cor de borda personalizáveis.
  * **Tabela** — tabela listrada ou simples, compatível com as ferramentas de tabela do próprio TinyMCE.
  * **Cartão de Perfil** — cartão de apresentação com foto, nome, cargo, bio e até 6 links de contato (e-mail, WhatsApp, Telegram, Lattes…).
  * **Gráfico de Composição** — a parte de cada fatia no todo, numa barra empilhada com legenda, até 6 fatias, rótulos personalizados.
  * **Gráfico de Barras** — horizontal ou vertical, até 6 barras.
  * **Velocímetro** — gauge semicircular com cores de semáforo (verde ≥ 67%, âmbar ≥ 34%, vermelho abaixo); 1–3 velocímetros lado a lado.
  * **Infográfico — Estatísticas** — até 4 itens combinando ícone (de um seletor com 40 opções), valor e rótulo.
  * **Infográfico — Passos** — fluxo numerado com ícone e descrição, para metodologias, tutoriais e fluxos de trabalho.
  * **Infográfico — Funcionalidades** — grade de ícone + título + descrição, para competências e destaques do curso.
  * **Infográfico — Linha do Tempo** — linha do tempo vertical com data/período, ícone e descrição.
  * **Infográfico — Comparativo** — 2–3 colunas com cabeçalhos coloridos e listas de itens ✓/✗.
* 🎨 **Compositor em Canvas:** um modal em tela cheia onde a página é montada bloco a bloco, reordenada, pré-visualizada e inserida no editor em uma única etapa.
* 📐 **Alinhamento do bloco:** os blocos que não ocupam a largura toda da página (Cartão de Perfil, Gráfico de Composição, Gráfico de Barras, Passos, Linha do Tempo, Comparativo, Cartão personalizável e Webteca) têm o campo **Alinhamento** (esquerda, centro ou direita) no popup de design. Os botões de alinhamento do próprio TinyMCE não movem um bloco, porque ele não é texto editável; o Botão de Ação mantém o seu campo de alinhamento.
* 💾 **Edição ida e volta:** cada bloco guarda sua configuração dentro do próprio conteúdo (`data-slms-state`), então qualquer bloco já inserido num curso pode ser reaberto e editado depois.
* 📚 **Biblioteca de Modelos** em quatro abas:
  * **Componentes** — os blocos base acima.
  * **Modelos do site** — layouts da instituição, mantidos pelos gestores do site e somente leitura para professores.
  * **Meus modelos** — layouts pessoais de cada professor, com salvar, exportar e importar.
  * **Favoritos** — modelos favoritados de todas as abas, num só lugar.
* 📤 **Exportar / Importar:** modelos viajam como arquivos `.json` entre sites Moodle.
* 🤖 **Criação assistida por IA (opcional)** em três modos — **Bloco IA** (um bloco a partir de uma frase), **Modelo IA** (um layout com vários blocos a partir de um contexto pedagógico) e **Chat IA** (uma conversa que propõe uma página completa). Vários blocos também têm o próprio botão "Gerar com IA". O StudioLMS não guarda nenhuma chave de API: a IA vem da [Central de IA](https://github.com/jeanlucio/moodle-local_aihub) ou dos próprios provedores de IA do Moodle (veja [IA e Serviços de Terceiros](#ai)).
* 🎓 **Comportamento no lado do estudante:** um pequeno script, carregado só nas páginas de curso e de atividade (nunca dentro do editor), faz os accordions expandirem e toca os efeitos opcionais de hover e clique.
* ♿ **Saída amigável a leitores de tela:** os atributos de edição são removidos do que o estudante vê, os acordeões anunciam o seu estado e todo emoji de um bloco é escondido dos leitores de tela, já que aqui o emoji é uma ilustração e seria lido pelo nome ("pasta de arquivos", "calendário") antes das palavras. Um elemento feito só de um emoji o mantém, para não ficar sem nome. É automático e não tem configuração; o filtro de HTML do Moodle remove o `aria-hidden` do conteúdo salvo, por isso o script o define quando a página é exibida.
* 🖱️ **Mesmo comportamento em todos os blocos:** todo bloco tem o efeito de hover (nenhum, ampliar, brilho ou elevar; o zoom e a elevação são desligados para quem pede menos movimento ao sistema), o som fica onde há algo para clicar (o botão, o acordeão e a lista de materiais), o texto do título, do cartão, da caixa de destaque, do acordeão, da lista de materiais, do cartão de perfil e do botão é digitado direto no canvas, e o acordeão, a lista de materiais, a caixa de destaque, a tabela e o cartão de perfil têm uma *Cor do bloco* que preenche as cores que guardam, sempre com contraste que se lê.
* ✅ **Funciona onde o Moodle limpa o texto:** todo bloco é HTML simples estilizado por classes, então aparece por inteiro numa página, num rótulo, no resumo de uma seção, num livro ou numa lição, e também onde o Moodle passa o texto pelo HTMLPurifier (mensagem de fórum, verbete de glossário, texto de questão, tarefa). O que o limpador remove são os nomes de acessibilidade dos blocos (`aria-label`, `role`), por isso cada bloco mantém o sentido em texto visível (rótulos e percentuais). Os blocos de gráfico, de barras e velocímetro são desenhados com HTML e CSS, e não com SVG, justamente por isso.
* 📊 **Registro de eventos:** criação e exclusão de modelos ficam registradas no log padrão do Moodle.
* 🔒 **Privacy API:** modelos e favoritos são cobertos por solicitações de exportação e exclusão.
