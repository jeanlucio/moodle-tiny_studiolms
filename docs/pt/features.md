# ✨ Funcionalidades

* 🧱 **18 Blocos Instrucionais,** inseridos pela barra de ferramentas do editor e configurados por formulários — sem precisar de HTML:
  * **Título Estilizado** — título `h3`/`h4` com ícone e cor de fundo.
  * **Botão de Ação** — botão de chamada para ação com URL, destino, cores, raio de borda e alinhamento configuráveis.
  * **Cartão Avançado** — cartão com imagem ou vídeo do YouTube, corpo rico editável e botão interno.
  * **Accordion** — tópico expansível com 4 estilos de ícone e estado inicial aberto/fechado.
  * **Webteca** — biblioteca de recursos (PDF, vídeo, áudio, link) em lista ou grade.
  * **Grid de Cards** — container multi-coluna com slots editáveis.
  * **Caixa de Destaque** — destaque com ícone e cor de borda personalizáveis.
  * **Tabela** — tabela listrada ou simples, compatível com as ferramentas de tabela do próprio TinyMCE.
  * **Cartão de Perfil** — cartão de apresentação com foto, nome, cargo, bio e até 3 links.
  * **Gráfico de Pizza/Donut** — SVG puro, até 6 fatias, rótulos personalizados, 4 temas de cor.
  * **Gráfico de Barras** — SVG puro, horizontal ou vertical, até 8 barras.
  * **Velocímetro** — gauge semicircular em SVG puro com cores de semáforo (verde ≥ 67%, âmbar ≥ 34%, vermelho abaixo); 1–3 velocímetros lado a lado.
  * **Mapa Mental** — diagrama radial em SVG puro com tópico central, até 8 ramos e até 5 filhos por ramo.
  * **Infográfico — Estatísticas** — até 4 itens combinando ícone (de um seletor com 40 opções), valor e rótulo.
  * **Infográfico — Passos** — fluxo numerado com ícone e descrição, para metodologias, tutoriais e fluxos de trabalho.
  * **Infográfico — Funcionalidades** — grade de ícone + título + descrição, para competências e destaques do curso.
  * **Infográfico — Linha do Tempo** — linha do tempo vertical com data/período, ícone e descrição.
  * **Infográfico — Comparativo** — 2–3 colunas com cabeçalhos coloridos e listas de itens ✓/✗.
* 🎨 **Compositor em Canvas:** um modal em tela cheia onde a página é montada bloco a bloco, reordenada, pré-visualizada e inserida no editor em uma única etapa.
* 💾 **Edição ida e volta:** cada bloco guarda sua configuração dentro do próprio conteúdo (`data-slms-state`), então qualquer bloco já inserido num curso pode ser reaberto e editado depois.
* 📚 **Biblioteca de Templates** em quatro abas:
  * **Componentes** — os blocos base acima.
  * **Templates Oficiais** — layouts da instituição, mantidos pelos gestores do site e somente leitura para professores.
  * **Meus Templates** — layouts pessoais de cada professor, com salvar, exportar e importar.
  * **Favoritos** — templates favoritados de todas as abas, num só lugar.
* 📤 **Exportar / Importar:** templates viajam como arquivos `.json` entre sites Moodle.
* 🤖 **Criação assistida por IA (opcional)** em três modos — **Bloco IA** (um bloco a partir de uma frase), **Modelo IA** (um layout com vários blocos a partir de um contexto pedagógico) e **Chat IA** (uma conversa que propõe uma página completa). Vários blocos também têm o próprio botão "Gerar com IA". O StudioLMS não guarda nenhuma chave de API: a IA vem da [Central de IA](https://github.com/jeanlucio/moodle-local_aihub) ou dos próprios provedores de IA do Moodle (veja [IA e Serviços de Terceiros](#ai)).
* 🎓 **Comportamento no lado do estudante:** um pequeno script, carregado só nas páginas de curso e de atividade (nunca dentro do editor), faz os accordions expandirem e toca os efeitos opcionais de hover e clique.
* 📊 **Registro de eventos:** criação e exclusão de templates ficam registradas no log padrão do Moodle.
* 🔒 **Privacy API:** templates e favoritos são cobertos por solicitações de exportação e exclusão.
