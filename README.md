# Moodle TinyMCE Plugin StudioLMS

![Moodle](https://img.shields.io/badge/Moodle-4.5%2B-orange?style=flat&logo=moodle&logoColor=white)
![License](https://img.shields.io/badge/License-GPLv3-blue?style=flat)
![Status](https://img.shields.io/badge/Status-Stable-green?style=flat)
[![Latest Release](https://img.shields.io/github/v/release/jeanlucio/moodle-tiny_studiolms?style=flat)](https://github.com/jeanlucio/moodle-tiny_studiolms/releases)
[![Author](https://img.shields.io/badge/by-Jean_Lucio-6f42c1?style=flat)](https://marketplace.moodle.com/user/984)

[![Moodle Plugin CI](https://github.com/jeanlucio/moodle-tiny_studiolms/actions/workflows/ci.yml/badge.svg)](https://github.com/jeanlucio/moodle-tiny_studiolms/actions/workflows/ci.yml)
[![Last Commit](https://img.shields.io/github/last-commit/jeanlucio/moodle-tiny_studiolms?style=flat)](https://github.com/jeanlucio/moodle-tiny_studiolms/commits)
[![Open Issues](https://img.shields.io/github/issues/jeanlucio/moodle-tiny_studiolms?style=flat)](https://github.com/jeanlucio/moodle-tiny_studiolms/issues)

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
* 🤖 **AI Content Generation (Optional):** Two complementary AI modes powered by the **AI Hub (`local_aihub`)** when installed, falling back to **Moodle AI (`core_ai`)**. StudioLMS holds no API key of its own:
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

### 🔬 Learning Science Foundations

StudioLMS blocks are not cosmetic — each one is grounded in established learning science research.

**Multimedia Learning Theory — Richard Mayer (2001)**
Mayer's 12 principles describe how the brain processes multimedia information. StudioLMS blocks and its AI generator implement seven of them:

| Mayer's Principle | StudioLMS Block / AI Behaviour |
|---|---|
| Signalling — highlight essential information | `Callout` |
| Segmenting — break content into manageable chunks | `Card`, `Grid Cards` |
| Spatial contiguity — text and visuals side by side | `Infographic`, `Steps` |
| Coherence — remove irrelevant material | Visual structure forces content curation |
| Redundancy — replace descriptive text with visuals | Infographic instead of plain paragraphs |
| Pre-training — present key concepts before dense content | Place a `Callout` with key terms at the top of each section; `local_studiolms` does this automatically |
| Personalization — conversational style improves retention over formal style | The AI generator is prompted to write in conversational, not academic, language |

**Cognitive Load Theory — John Sweller (1988)**
The brain has limited processing capacity. Visual organisation (cards, grids, steps) reduces *extraneous* cognitive load — the mental effort spent decoding structure — freeing up capacity for *germane* load: actual learning and schema formation.

**Dual Coding Theory — Allan Paivio (1971)**
The brain processes information through two independent channels: verbal (text) and visual (images, diagrams). Activating both simultaneously creates stronger, more retrievable mental representations. StudioLMS charts, infographics, gauges and mind maps engage the visual channel while text complements through the verbal channel.

**Universal Design for Learning — CAST (2002)**
UDL requires offering *multiple means of representation* of the same content to serve diverse cognitive profiles. StudioLMS allows the same concept to be presented as text, visual, table or diagram — expanding accessibility across learning styles.

**Information Mapping — Robert Horn (1970s)**
Horn categorised information into structural types (procedure, process, concept, fact, structure), each with an optimal presentation format. StudioLMS blocks map directly to these types:

| Information Type (Horn) | StudioLMS Block |
|---|---|
| Procedure | Infographic — Steps |
| Chronological process | Infographic — Timeline |
| Concept comparison | Infographic — Comparison |
| Quantitative facts | Infographic — Stats, Bar/Pie Chart, Gauge |
| Hierarchical structure | Mind Map |
| Related item set | Grid Cards |
| Critical information | Callout |

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
* **No AI credentials of its own:** StudioLMS stores no API key and makes no HTTP request to an AI provider itself — keys, endpoints and usage logging live in `local_aihub` or Moodle's `core_ai`
* **Course-level AI switch honoured:** on Moodle versions that have it, the `core_ai` fallback respects a course or activity where "Allow AI tools" is off

---

### 🔎 Third-party Service Disclosure

StudioLMS includes an optional AI-powered content generator. Teachers describe the block they want in plain language and the plugin generates the HTML ready to insert.

#### Is the AI feature required?

No. The plugin works fully without any external AI service.
All blocks can be configured manually through the standard form interface.
The AI feature is a productivity tool.

#### Where the AI comes from

StudioLMS does not talk to any AI provider directly and has no key settings. Every request goes, in order, to:

| Order | Source |
|------|--------|
| 1 | **AI Hub (`local_aihub`)** — optional companion plugin. Resolves the teacher's personal key first, then the site key (Google Gemini, Groq, DeepSeek or any OpenAI-compatible endpoint), and logs usage per plugin. |
| 2 | **Moodle AI (`core_ai`)** — the built-in subsystem (4.5+), used when the hub is not installed or cannot serve the request. Respects the course's "Allow AI tools for this course" setting on Moodle versions that have it. |

When neither is available, the AI tabs show a short notice instead of the generator. If the AI Hub is installed and personal keys are enabled there, the notice links the teacher to **AI Hub → My AI keys** to add their own key.

Keys are configured in the AI Hub (**Site administration → Plugins → Local plugins → AI Hub**, or each teacher's **My AI keys** page) or under **Site administration → AI → AI providers** for `core_ai`. External services operate under their own terms of service and privacy policies.

#### Data Transmission

When the AI feature is used, the teacher's prompt or chat message is handed to the AI Hub or `core_ai`, which transmits it to the provider they resolve. Both declare those providers in their own Privacy API metadata and keep their own usage records.

The plugin:
* Does not store prompts, AI responses or API keys
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
* 🤖 **Geração de Conteúdo com IA (Opcional):** Dois modos complementares de IA, atendidos pela **Central de IA (`local_aihub`)** quando instalada, com fallback para o **Moodle AI (`core_ai`)**. O StudioLMS não guarda nenhuma chave de API própria:
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

### 🔬 Fundamentos em Ciência da Aprendizagem

Os blocos do StudioLMS não são cosméticos — cada um tem base em teorias consolidadas de ciência da aprendizagem.

**Teoria da Aprendizagem Multimídia — Richard Mayer (2001)**
Os 12 princípios de Mayer descrevem como o cérebro processa informação multimídia. Os blocos do StudioLMS e o gerador de IA implementam sete deles:

| Princípio de Mayer | Bloco do StudioLMS / Comportamento da IA |
|---|---|
| Signaling — destacar informação essencial | `Callout` |
| Segmenting — dividir conteúdo em partes gerenciáveis | `Card`, `Grid de Cards` |
| Spatial contiguity — texto e visual lado a lado | `Infográfico`, `Passos` |
| Coherence — eliminar material irrelevante | A estrutura visual força curadoria do conteúdo |
| Redundancy — substituir texto descritivo por visual | Infográfico em lugar de parágrafos |
| Pre-training — apresentar conceitos-chave antes do conteúdo denso | Use um `Callout` com os termos essenciais no início de cada seção; o `local_studiolms` faz isso automaticamente |
| Personalization — linguagem conversacional retém mais que linguagem formal | O gerador de IA é instruído a escrever em tom conversacional, não acadêmico |

**Teoria da Carga Cognitiva — John Sweller (1988)**
O cérebro tem capacidade limitada de processamento. A organização visual (cards, grids, steps) reduz a *carga estranha* — o esforço mental gasto decodificando a estrutura — liberando capacidade para a *carga germânica*: o aprendizado real e a formação de esquemas mentais.

**Teoria da Codificação Dual — Allan Paivio (1971)**
O cérebro processa informação por dois canais independentes: verbal (texto) e visual (imagens, diagramas). Acionar os dois simultaneamente cria representações mentais mais fortes e mais fáceis de recuperar. Os gráficos, infográficos, gauges e mapas mentais do StudioLMS acionam o canal visual enquanto o texto complementa pelo canal verbal.

**Universal Design for Learning — CAST (2002)**
O UDL exige oferecer *múltiplas formas de representação* do mesmo conteúdo para atender diferentes perfis cognitivos. O StudioLMS permite apresentar o mesmo conceito como texto, visual, tabela ou diagrama — ampliando a acessibilidade para diferentes estilos de aprendizagem.

**Information Mapping — Robert Horn (décadas de 1970)**
Horn categorizou a informação em tipos estruturais (procedimento, processo, conceito, fato, estrutura), cada um com um formato de apresentação ideal. Os blocos do StudioLMS mapeiam diretamente esses tipos:

| Tipo de informação (Horn) | Bloco do StudioLMS |
|---|---|
| Procedimento | Infográfico — Passos |
| Processo cronológico | Infográfico — Linha do Tempo |
| Comparação de conceitos | Infográfico — Comparação |
| Fatos quantitativos | Infográfico — Stats, Gráfico de Barras/Pizza, Gauge |
| Estrutura hierárquica | Mapa Mental |
| Conjunto de itens relacionados | Grid de Cards |
| Informação crítica | Callout |

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
* **Sem credenciais de IA próprias:** o StudioLMS não guarda chave de API nem faz requisição HTTP a provedor de IA — chaves, endpoints e registro de uso ficam na `local_aihub` ou no `core_ai` do Moodle
* **Respeita o controle de IA do curso:** nas versões do Moodle que o têm, o fallback para o `core_ai` respeita um curso ou atividade com "Permitir ferramentas de IA" desligado

---

### 🔎 Divulgação de Serviço de Terceiros

O StudioLMS inclui um gerador de conteúdo com IA opcional. O professor descreve o bloco desejado em linguagem natural e o plugin gera o HTML pronto para inserir.

#### O recurso de IA é obrigatório?

Não. O plugin funciona de forma completa sem qualquer serviço externo de IA.
Todos os blocos podem ser configurados manualmente pela interface de formulário padrão.
O recurso de IA é uma ferramenta de produtividade.

#### De onde vem a IA

O StudioLMS não conversa diretamente com nenhum provedor de IA e não tem configuração de chaves. Cada requisição segue, nesta ordem, para:

| Ordem | Fonte |
|------|--------|
| 1 | **Central de IA (`local_aihub`)** — plugin complementar opcional. Resolve primeiro a chave pessoal do professor, depois a chave do site (Google Gemini, Groq, DeepSeek ou qualquer endpoint compatível com OpenAI), e registra o uso por plugin. |
| 2 | **Moodle AI (`core_ai`)** — subsistema nativo (4.5+), usado quando a Central não está instalada ou não consegue atender. Respeita a opção "Permitir ferramentas de IA para este curso" nas versões do Moodle que a têm. |

Quando nenhuma das duas está disponível, as abas de IA mostram um aviso curto no lugar do gerador. Se a Central de IA estiver instalada e com chaves pessoais habilitadas, o aviso leva o professor para **Central de IA → Minhas chaves de IA**, onde ele cadastra a própria chave.

As chaves são configuradas na Central de IA (**Administração do site → Plugins → Plugins locais → Central de IA**, ou na página **Minhas chaves de IA** de cada professor) ou em **Administração do site → IA → Provedores de IA** para o `core_ai`. Os serviços externos seguem seus próprios termos de uso e políticas de privacidade.

#### Transmissão de dados

Quando o recurso de IA é utilizado, o prompt ou mensagem de chat do professor é entregue à Central de IA ou ao `core_ai`, que o enviam ao provedor resolvido. Ambos declaram esses provedores nos próprios metadados da Privacy API e mantêm seus próprios registros de uso.

O plugin:
* Não armazena prompts, respostas da IA nem chaves de API
* Apenas salva o bloco HTML gerado que o professor escolhe inserir ou salvar como template
* Nenhuma comunicação externa ocorre sem ativação explícita do gerador de IA

---

## 📄 Licença

Este projeto é licenciado sob a **GNU General Public License v3 (GPLv3)**.

**Copyright:** 2026 Jean Lúcio
