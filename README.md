# Moodle TinyMCE Plugin StudioLMS

[![Moodle Plugin CI](https://github.com/jeanlucio/moodle-tiny_studiolms/actions/workflows/ci.yml/badge.svg)](https://github.com/jeanlucio/moodle-tiny_studiolms/actions/workflows/ci.yml)
![Moodle](https://img.shields.io/badge/Moodle-4.5%2B-orange?style=flat-square&logo=moodle&logoColor=white)
![License](https://img.shields.io/badge/License-GPLv3-blue?style=flat-square)
![Status](https://img.shields.io/badge/Status-Stable-green?style=flat-square)

[English](#english) | [Português](#português)

---

## English

**StudioLMS** is a TinyMCE 6 sub-plugin for Moodle that brings a Canva/Notion-like authoring experience directly into the course editor. Teachers open a native TinyMCE modal and inject rich instructional design blocks — cards, accordions, callout boxes, resource libraries and more — without writing a single line of HTML.

---

### ✨ Features

* 🧱 **18 Instructional Blocks:** Ready-to-use design blocks insertable from the toolbar:
  * **Action Button** — CTA button with configurable URL, colours, border radius and alignment.
  * **Advanced Card** — Card with image/video media, rich editable body and an internal button.
  * **Webteca** — Resource library (PDF, video, audio, link) in list or grid layout.
  * **Accordion** — Expandable `<details>` element with 4 icon styles and open/closed initial state.
  * **Table** — Striped/plain table compatible with TinyMCE's native toolbar.
  * **Grid Cards** — Multi-column CSS grid container with editable slots.
  * **Callout** — Highlight box with customisable icon and border colour.
  * **Stylised Heading** — Styled `h3`/`h4` heading with icon and background colour.
  * **Profile Card** — Presenter card with photo, name, role, bio and up to 3 configurable links; customisable background and accent colour.
  * **Pie Chart** — Pure SVG donut/pie chart with up to 6 slices, custom labels and 4 colour themes.
  * **Bar Chart** — Pure SVG bar chart in horizontal or vertical orientation; up to 8 bars with custom labels, values and colour themes.
  * **Gauge** — Pure SVG semi-circle gauge (speedometer style) with traffic-light colour coding (green ≥ 67 %, amber ≥ 34 %, red < 34 %). Supports 1–3 side-by-side gauges in a single block.
  * **Mind Map** — Pure SVG radial diagram (no external library) with a central topic, up to 8 branches and up to 5 child nodes each. 4 colour themes (blue, green, purple, orange). Optional AI generation from a plain-language description.
  * **Infographic — Stats** — Visual stat block with up to 4 items, each combining an icon (picked from a 20-icon visual picker), a value and a label. Optional section title, 4 colour themes and AI generation.
  * **Infographic — Steps** — Numbered flow of steps with icon and description. Ideal for methodologies, tutorials and workflows.
  * **Infographic — Features** — Icon + title + description grid. Ideal for competencies, course highlights and key benefits.
  * **Infographic — Timeline** — Vertical timeline with date/period, icon and event description.
  * **Infographic — Comparison** — 2–3 column comparison table with coloured headers and ✓/✗ item lists.
* 🛡️ **Shielded Injection:** Blocks use `contenteditable="false"` on the wrapper and `contenteditable="true"` on editable regions for reliable editing.
* 💾 **Round-Trip State:** Block configuration serialised in Base64 inside `data-slms-state` — reopen and edit any block at any time.
* 📚 **Template Library:** 4-tab modal for managing reusable layouts:
  * **Components** — Base blocks (above).
  * **Official Templates** — Institution-wide templates (read-only for teachers, managed by site managers).
  * **My Templates** — Teacher's personal layouts with Save, Export and Import actions.
  * **Favourites** — Curated mix of starred templates from all tabs.
* ⭐ **Favourites System:** Toggle any template as favourite for quick access.
* 🤖 **AI Content Generation (Optional):** Two complementary AI modes powered by Gemini, Groq or any OpenAI-compatible provider:
  * **AI Block Generator** — Teacher types a plain-language prompt ("Create a red warning card about the exam") and the block is generated ready to insert.
  * **AI Chat Assistant** — Conversational multi-turn chat where the teacher pastes a syllabus, lesson plan or any course content. The AI immediately generates a complete visual template with the real content populated, or asks whether to use Grid Cards vs Webteca when the content is a list of resources. The AI provider used is shown below each reply for transparency.
* 📤 **Export / Import:** Templates travel as `.json` files, portable across Moodle instances.
* 📊 **Audit Logs:** Template created, updated and deleted events recorded in Moodle's standard log store.
* 🔒 **Privacy API:** Full GDPR/LGPD compliance — user data export and deletion covered.
* 🎓 **Student Frontend Motor:** Lightweight JS loaded only on course pages (never inside TinyMCE) that activates accordion toggling, hover and sound effects for students.

---

### 🎓 Educational Purpose

StudioLMS is designed to:

* Lower the barrier to creating visually engaging course content
* Enable instructional designers and teachers to build rich layouts without HTML knowledge
* Provide a consistent visual language across course pages
* Encourage reuse through a shared institutional template library
* Keep content creation fully within Moodle — no external design tools required

Suitable for:

* Higher education and corporate e-learning
* Instructional design teams standardising course templates
* Teachers who want professional-looking pages without coding
* Institutions building branded, accessible content at scale

---

### 📦 Requirements

| Component | Version |
|-----------|---------|
| Moodle    | 4.5+    |
| PHP       | 8.1+    |

---

### 🛠️ Installation

1. Download the `.zip` file or clone this repository.
2. Extract the folder into your Moodle `lib/editor/tiny/plugins/` directory.
3. Rename the folder to `studiolms` (if necessary).
   Final path:
   `your-moodle/lib/editor/tiny/plugins/studiolms/`
4. Visit **Site administration > Notifications** to complete the database installation.
5. Grant the `tiny/studiolms:use` capability to roles that should see the toolbar button (Teacher by default).
6. The **StudioLMS** button will appear in the TinyMCE toolbar for authorised users.

---

### 📖 Usage

**Inserting a block:**

1. Open any TinyMCE editor (course section, page activity, etc.).
2. Click the **StudioLMS** button in the toolbar (or go to Tools → StudioLMS).
3. Choose a block from the **Components** tab, fill in the form and click **Insert**.

**Saving a template:**

1. Build a page layout using multiple blocks.
2. Open the StudioLMS modal and go to **My Templates**.
3. Click **Save as Template**, give it a name and confirm.

**Using the AI generator (single block):**

1. Open the **AI Layout** tab inside the modal.
2. Type a plain-language description of the block you want.
3. Review the generated block and click **Insert** to add it to the editor.

**Using the AI Chat assistant:**

1. Open the **Chat IA** tab inside the modal.
2. Paste a syllabus, activity list, lesson plan or any course content into the chat.
3. The AI will immediately generate a complete template with your real content populated.
4. For resource lists (links, videos, PDFs) the AI will ask whether you prefer Grid Cards or Webteca.
5. Review the action card and click **Apply** to load the template onto the canvas.
6. Edit blocks as needed and click **Insert**.

---

### 🔐 Security & Compliance

* Capability-based access control (`tiny/studiolms:use`, `tiny/studiolms:manageglobaltemplates`)
* Template ownership verified server-side before any modification or deletion
* Content saved via `PARAM_CLEANHTML` — Moodle's XSS filter applied on every save
* `require_sesskey()` protection on all state-changing web service calls
* Moodle External API compliant (all services declared in `db/services.php`)
* Privacy-aware: full GDPR/LGPD data export and deletion via Privacy API

---

### 🔎 Third-party Service Disclosure

StudioLMS includes an optional AI-powered content generator. Teachers describe the block they want in plain language and the plugin generates the HTML ready to insert.

#### Is the AI feature required?

No. The plugin works fully without any external AI service.
All blocks can be configured manually through the standard form interface.
The AI feature is a productivity tool.

#### Supported Providers

* **Google Gemini** — https://ai.google.dev/
* **Groq** — https://console.groq.com/
* **OpenAI-compatible APIs** — Any provider that follows the OpenAI API format (e.g. OpenRouter, self-hosted models via LM Studio, Ollama proxy, etc.)

These services operate under their own terms of service and privacy policies.

#### How to obtain an API key

API keys must be created directly on the provider's official website:

* Google Gemini: https://ai.google.dev/
* Groq: https://console.groq.com/
* OpenAI-compatible: refer to your specific provider's documentation

Both Gemini and Groq currently offer free usage tiers. However, pricing policies may change and paid plans may apply depending on usage limits.

The StudioLMS plugin does not provide API keys.

#### Where API keys are configured

API keys are configured globally by the Moodle site administrator under **Site administration → Plugins → Text editors → TinyMCE → StudioLMS**.

#### Data Transmission

When the AI feature is used, the teacher's prompt or chat message is transmitted to the selected provider for processing.

The plugin:
* Does not store prompts or AI responses
* Only stores the generated HTML block that the teacher chooses to insert or save as a template
* No external communication occurs unless the AI generator is explicitly used

---

## 📄 License / Licença

This project is licensed under the **GNU General Public License v3 (GPLv3)**.

**Copyright:** 2026 Jean Lúcio

---

## Português

O **StudioLMS** é um sub-plugin TinyMCE 6 para Moodle que traz uma experiência de autoria similar ao Canva/Notion diretamente no editor do curso. O professor abre um Modal nativo do TinyMCE e injeta blocos ricos de design instrucional — cards, acordeões, caixas de destaque, bibliotecas de recursos e muito mais — sem escrever uma linha de HTML.

---

### ✨ Funcionalidades

* 🧱 **18 Blocos Instrucionais:** Blocos de design prontos para uso, inseríveis pela barra de ferramentas:
  * **Botão CTA** — Botão com URL, cores, raio e alinhamento configuráveis.
  * **Card Avançado** — Card com mídia de imagem/vídeo, corpo rico editável e botão interno.
  * **Webteca** — Biblioteca de recursos (PDF, vídeo, áudio, link) em layout de lista ou grade.
  * **Acordeão** — Elemento `<details>` expansível com 4 estilos de ícone e estado inicial aberto/fechado.
  * **Tabela** — Tabela listrada/padrão compatível com a barra de ferramentas nativa do TinyMCE.
  * **Grid de Cards** — Container CSS grid multi-colunas com slots editáveis.
  * **Callout** — Caixa de destaque com ícone e cor de borda personalizáveis.
  * **Título Estilizado** — Cabeçalho `h3`/`h4` estilizado com ícone e cor de fundo.
  * **Card de Perfil** — Card de apresentação com foto, nome, cargo, bio e até 3 links configuráveis; cor de fundo e cor de destaque personalizáveis.
  * **Gráfico de Pizza** — Gráfico de rosca/pizza em SVG puro com até 6 fatias, rótulos personalizados e 4 temas de cor.
  * **Gráfico de Barras** — Gráfico de barras em SVG puro na orientação horizontal ou vertical; até 8 barras com rótulos, valores e temas de cor personalizados.
  * **Velocímetro** — Gauge em semicírculo SVG com codificação por semáforo (verde ≥ 67 %, âmbar ≥ 34 %, vermelho < 34 %). Suporta 1 a 3 velocímetros lado a lado em um único bloco.
  * **Mapa Mental** — Diagrama radial em SVG puro (sem biblioteca externa) com tópico central, até 8 ramos e até 5 nós filhos por ramo. 4 temas de cor (azul, verde, roxo, laranja). Geração via IA a partir de uma descrição em linguagem natural.
  * **Infográfico — Stats** — Bloco visual de estatísticas com até 4 itens, cada um combinando ícone (selecionado em um picker visual de 20 ícones FA6), valor e rótulo. Título de seção opcional, 4 temas de cor e geração via IA.
  * **Infográfico — Passos** — Fluxo numerado de passos com ícone e descrição. Ideal para metodologias, tutoriais e roteiros.
  * **Infográfico — Funcionalidades** — Grade de ícone + título + descrição. Ideal para competências, destaques do curso e benefícios.
  * **Infográfico — Linha do Tempo** — Linha do tempo vertical com data/período, ícone e descrição do evento.
  * **Infográfico — Comparação** — Tabela comparativa de 2 a 3 colunas com cabeçalhos coloridos e listas de itens com ✓/✗.
* 🛡️ **Injeção Blindada:** Blocos usam `contenteditable="false"` no wrapper e `contenteditable="true"` nas regiões editáveis para uma edição confiável.
* 💾 **Estado de Ida e Volta:** Configuração do bloco serializada em Base64 dentro de `data-slms-state` — reabra e edite qualquer bloco a qualquer momento.
* 📚 **Biblioteca de Templates:** Modal com 4 abas para gerenciar layouts reutilizáveis:
  * **Componentes** — Blocos base (acima).
  * **Templates Oficiais** — Templates institucionais (somente leitura para professores, gerenciados por gestores).
  * **Meus Templates** — Layouts pessoais do professor com ações de Salvar, Exportar e Importar.
  * **Favoritos** — Mix curado de templates marcados como favoritos em todas as abas.
* ⭐ **Sistema de Favoritos:** Marque qualquer template como favorito para acesso rápido.
* 🤖 **Geração de Conteúdo com IA (Opcional):** Dois modos complementares de IA com suporte a Gemini, Groq e qualquer API compatível com OpenAI:
  * **Gerador de Blocos IA** — O professor digita uma descrição em linguagem natural ("Crie um card de aviso vermelho sobre a prova") e o bloco é gerado pronto para inserir.
  * **Chat Assistente IA** — Chat conversacional multi-turno onde o professor cola uma ementa, plano de aula ou qualquer conteúdo do curso. A IA gera imediatamente um template visual completo com o conteúdo real preenchido, ou pergunta se deve usar Grid de Cards ou Webteca quando o conteúdo é uma lista de recursos. O provedor de IA utilizado é exibido abaixo de cada resposta para transparência.
* 📤 **Exportar / Importar:** Templates viajam como arquivos `.json`, portáveis entre instâncias do Moodle.
* 📊 **Logs de Auditoria:** Eventos de criação, atualização e exclusão de templates registrados no log padrão do Moodle.
* 🔒 **Privacy API:** Conformidade total com LGPD/GDPR — exportação e exclusão de dados do usuário cobertas.
* 🎓 **Motor Frontend para Alunos:** JS leve carregado apenas nas páginas do curso (nunca dentro do TinyMCE) que ativa o acordeão, efeitos de hover e sons para os alunos.

---

### 🎓 Finalidade Educacional

O StudioLMS foi projetado para:

* Reduzir a barreira para criar conteúdo visualmente envolvente
* Permitir que designers instrucionais e professores montem layouts ricos sem conhecimento de HTML
* Oferecer uma linguagem visual consistente nas páginas do curso
* Estimular o reúso por meio de uma biblioteca de templates institucional compartilhada
* Manter a criação de conteúdo totalmente dentro do Moodle — sem ferramentas externas de design

Indicado para:

* Educação superior e e-learning corporativo
* Equipes de design instrucional que padronizam templates de cursos
* Professores que desejam páginas com aparência profissional sem programar
* Instituições que constroem conteúdo acessível e com identidade visual em escala

---

### 📦 Requisitos

| Componente | Versão |
|------------|--------|
| Moodle     | 4.5+   |
| PHP        | 8.1+   |

---

### 🛠️ Instalação

1. Baixe o arquivo `.zip` ou clone este repositório.
2. Extraia na pasta `lib/editor/tiny/plugins/` do seu Moodle.
3. Renomeie para `studiolms` (se necessário).
   Caminho final:
   `seu-moodle/lib/editor/tiny/plugins/studiolms/`
4. Acesse **Administração do site > Notificações** para concluir a instalação do banco de dados.
5. Conceda a capability `tiny/studiolms:use` aos perfis que devem ver o botão na barra de ferramentas (Professor por padrão).
6. O botão **StudioLMS** aparecerá na barra de ferramentas do TinyMCE para os usuários autorizados.

---

### 📖 Como Usar

**Inserindo um bloco:**

1. Abra qualquer editor TinyMCE (seção do curso, atividade Página, etc.).
2. Clique no botão **StudioLMS** na barra de ferramentas (ou acesse Ferramentas → StudioLMS).
3. Escolha um bloco na aba **Componentes**, preencha o formulário e clique em **Inserir**.

**Salvando um template:**

1. Monte um layout de página usando múltiplos blocos.
2. Abra o modal do StudioLMS e acesse **Meus Templates**.
3. Clique em **Salvar como Template**, dê um nome e confirme.

**Usando o gerador de IA (bloco único):**

1. Abra a aba **AI Layout** dentro do modal.
2. Digite uma descrição em linguagem natural do bloco que deseja.
3. Revise o bloco gerado e clique em **Inserir** para adicioná-lo ao editor.

**Usando o Chat Assistente IA:**

1. Abra a aba **Chat IA** dentro do modal.
2. Cole uma ementa, lista de atividades, plano de aula ou qualquer conteúdo do curso no chat.
3. A IA gerará imediatamente um template completo com seu conteúdo real preenchido.
4. Para listas de recursos (links, vídeos, PDFs) a IA perguntará se prefere Grid de Cards ou Webteca.
5. Revise o card de ação e clique em **Aplicar** para carregar o template no canvas.
6. Edite os blocos conforme necessário e clique em **Inserir**.

---

### 🔐 Segurança e Conformidade

* Controle de acesso baseado em capabilities (`tiny/studiolms:use`, `tiny/studiolms:manageglobaltemplates`)
* Ownership do template verificado no servidor antes de qualquer modificação ou exclusão
* Conteúdo salvo via `PARAM_CLEANHTML` — filtro XSS do Moodle aplicado em cada salvamento
* Proteção com `require_sesskey()` em todas as chamadas de web service que alteram estado
* Compatível com a API externa do Moodle (todos os serviços declarados em `db/services.php`)
* Privacidade: exportação e exclusão completa de dados via Privacy API (LGPD/GDPR)

---

### 🔎 Divulgação de Serviço de Terceiros

O StudioLMS inclui um gerador de conteúdo com IA opcional. O professor descreve o bloco desejado em linguagem natural e o plugin gera o HTML pronto para inserir.

#### O recurso de IA é obrigatório?

Não. O plugin funciona de forma completa sem qualquer serviço externo de IA.
Todos os blocos podem ser configurados manualmente pela interface de formulário padrão.
O recurso de IA é uma ferramenta de produtividade.

#### Provedores suportados

* **Google Gemini** — https://ai.google.dev/
* **Groq** — https://console.groq.com/
* **APIs compatíveis com OpenAI** — Qualquer provedor que siga o formato da API OpenAI (ex.: OpenRouter, modelos locais via LM Studio, proxy Ollama, etc.)

Esses serviços seguem seus próprios termos de uso e políticas de privacidade.

#### Como obter a chave de API

As chaves de API devem ser criadas diretamente no site oficial do provedor:

* Google Gemini: https://ai.google.dev/
* Groq: https://console.groq.com/
* APIs compatíveis com OpenAI: consulte a documentação do provedor específico

Gemini e Groq atualmente oferecem planos gratuitos, porém as políticas de preços podem variar conforme o volume de uso.

O StudioLMS não fornece chaves de API.

#### Onde a chave é configurada

As chaves de API são configuradas globalmente pelo administrador do Moodle em **Administração do site → Plugins → Editores de texto → TinyMCE → StudioLMS**.

#### Transmissão de dados

Quando o recurso de IA é utilizado, o prompt ou mensagem de chat do professor é enviado ao provedor selecionado para processamento.

O plugin:
* Não armazena prompts nem respostas da IA
* Apenas salva o bloco HTML gerado que o professor escolhe inserir ou salvar como template
* Nenhuma comunicação externa ocorre sem ativação explícita do gerador de IA

---

## 📄 Licença

Este projeto é licenciado sob a **GNU General Public License v3 (GPLv3)**.

**Copyright:** 2026 Jean Lúcio
