# Moodle TinyMCE Plugin StudioLMS

![Moodle](https://img.shields.io/badge/Moodle-4.5%2B-orange?style=flat&logo=moodle&logoColor=white)
![License](https://img.shields.io/badge/License-GPLv3-blue?style=flat)
![Status](https://img.shields.io/badge/Status-Alpha-yellow?style=flat)
[![Latest Release](https://img.shields.io/github/v/release/jeanlucio/moodle-tiny_studiolms?style=flat)](https://github.com/jeanlucio/moodle-tiny_studiolms/releases)
[![Author](https://img.shields.io/badge/by-Jean_Lucio-6f42c1?style=flat)](https://marketplace.moodle.com/user/984)
[![StudioLMS Ecosystem](https://img.shields.io/badge/StudioLMS-Ecosystem-1d4ed8?style=flat)](https://jeanlucio.github.io/studiolms/)

[![Moodle Plugin CI](https://github.com/jeanlucio/moodle-tiny_studiolms/actions/workflows/ci.yml/badge.svg)](https://github.com/jeanlucio/moodle-tiny_studiolms/actions/workflows/ci.yml)
[![Last Commit](https://img.shields.io/github/last-commit/jeanlucio/moodle-tiny_studiolms?style=flat)](https://github.com/jeanlucio/moodle-tiny_studiolms/commits)
[![Open Issues](https://img.shields.io/github/issues/jeanlucio/moodle-tiny_studiolms?style=flat)](https://github.com/jeanlucio/moodle-tiny_studiolms/issues)

[English](#english) | [Português](#português)

---

## English

**StudioLMS** is a TinyMCE sub-plugin for Moodle that brings a Canva/Notion-like authoring
experience directly into the course editor. Teachers open a native TinyMCE modal and compose rich
instructional design blocks — cards, accordions, infographics, charts and more — without writing a
single line of HTML, with optional AI assistance for both single blocks and complete layouts. It is the editor of the
[StudioLMS family](https://jeanlucio.github.io/studiolms/), which also has a course builder with AI and a filter of live widgets.

📚 **[Full documentation](https://jeanlucio.github.io/moodle-tiny_studiolms/)** — all 19 blocks,
screenshots, AI features and where the AI comes from, the integrations with the other StudioLMS plugins, the automated tests, and security details.

### 📦 Requirements

| Component | Version |
|-----------|---------|
| Moodle    | 4.5 – 5.3 |
| PHP       | 8.1+    |

Optional: the AI features use the AI Hub or a core AI provider, and four ready-made layouts greet the student with
`[firstname]`, a shortcode of the third-party `filter_shortcodes` plugin (see the documentation). Nothing depends on them.

### 🛠️ Installation

1. Download the `.zip` file or clone this repository.
2. Extract the folder into your Moodle `lib/editor/tiny/plugins/` directory.
3. Rename the folder to `studiolms` (if necessary).
   Final path:
   `your-moodle/lib/editor/tiny/plugins/studiolms/`
4. Visit **Site administration > Notifications** to complete installation.

### 🔎 Third-party service disclosure

A card can show a **YouTube** or **Vimeo** video. The player is then loaded from that service by the browser of whoever views the page, so the service sees the viewer's IP address, under its own terms and privacy policy. Nothing is loaded from either unless a video is added.

The optional AI features use the AI Hub or Moodle's `core_ai`: StudioLMS ships **no API key and has no key screen**. What the teacher types in an AI tab is sent to the provider the site resolved, under that provider's own terms. Nothing is sent unless a generation is started, and a course that has the AI tools turned off is never sent. **Do not type personal data into an AI request.**

### 🆘 Support

Found a bug or have a question? Open an issue on the
[issue tracker](https://github.com/jeanlucio/moodle-tiny_studiolms/issues).

### 📄 License

This project is licensed under the **GNU General Public License v3 (GPLv3)**.

**Copyright:** 2026 Jean Lúcio

### 👤 Maintainer

Maintained by [Jean Lúcio](https://github.com/jeanlucio).

[⬆️ Back to top](#english)

---

## Português

O **StudioLMS** é um sub-plugin do TinyMCE para Moodle que traz uma experiência de criação estilo
Canva/Notion direto para o editor do curso. O professor abre um modal nativo do TinyMCE e compõe
blocos ricos de design instrucional — cartões, accordions, infográficos, gráficos e mais — sem
escrever uma linha de HTML, com assistência opcional de IA tanto para blocos individuais quanto
para layouts completos. É o editor da [família StudioLMS](https://jeanlucio.github.io/studiolms/), que tem também um
construtor de cursos com IA e um filtro de widgets ao vivo.

📚 **[Documentação completa](https://jeanlucio.github.io/moodle-tiny_studiolms/pt.html)** — os 19
blocos, capturas de tela, recursos de IA e de onde vem a IA, as integrações com os outros plugins do StudioLMS, os testes automatizados, e detalhes de segurança.

### 📦 Requisitos

| Componente | Versão |
|------------|--------|
| Moodle     | 4.5 – 5.3 |
| PHP        | 8.1+   |

Opcional: os recursos de IA usam a Central de IA ou um provedor de IA do núcleo, e quatro modelos prontos cumprimentam o
estudante com `[firstname]`, um atalho do plugin de terceiros `filter_shortcodes` (veja a documentação). Nada depende deles.

### 🛠️ Instalação

1. Baixe o arquivo `.zip` ou clone este repositório.
2. Extraia na pasta `lib/editor/tiny/plugins/` do seu Moodle.
3. Renomeie para `studiolms` (se necessário).
   Caminho final:
   `seu-moodle/lib/editor/tiny/plugins/studiolms/`
4. Acesse **Administração do site > Notificações** para concluir a instalação.

### 🔎 Divulgação de serviço de terceiros

Um cartão pode mostrar um vídeo do **YouTube** ou do **Vimeo**. O player é então carregado desse serviço pelo navegador de quem vê a página, então o serviço vê o endereço IP de quem assiste, sob os próprios termos e a própria política de privacidade. Nada é carregado de nenhum dos dois a menos que um vídeo seja adicionado.

Os recursos opcionais de IA usam o Hub de IA ou o `core_ai` do Moodle: o StudioLMS **não traz chave de API nem tem tela de chave**. O que o professor digita numa aba de IA é enviado ao provedor que o site resolveu, sob os termos desse provedor. Nada é enviado a menos que uma geração seja iniciada, e um curso com as ferramentas de IA desligadas nunca é enviado. **Não digite dados pessoais num pedido de IA.**

### 🆘 Suporte

Encontrou um bug ou tem alguma dúvida? Abra uma issue no
[rastreador de issues](https://github.com/jeanlucio/moodle-tiny_studiolms/issues).

### 📄 Licença

Este projeto é licenciado sob a **GNU General Public License v3 (GPLv3)**.

**Copyright:** 2026 Jean Lúcio

### 👤 Mantenedor

Mantido por [Jean Lúcio](https://github.com/jeanlucio).

[⬆️ Voltar ao topo](#português)
