# Changelog — tiny_studiolms

All notable changes to this plugin are documented here.

---

## [v1.0.0] — 2026-10-29

First public release.

### Added
- 19 instructional blocks for the TinyMCE editor, set up through forms with no HTML: stylised heading,
  action button, advanced card (image, YouTube or Vimeo video), accordion, tabs, resources, grid of cards,
  callout, text box, table, profile card, composition chart, bar chart, gauge, and five infographics
  (numbers, steps, features, timeline, comparison).
- A full-screen canvas where a page is put together block by block, reordered, previewed and inserted into
  the editor in one step. Blocks can be reopened and edited after they are saved.
- A library of layouts in tabs: 26 ready-made layouts (English and Brazilian Portuguese), site templates
  managed by the site administrators and read-only for teachers, My templates (save, export and import as
  `.json`) and Favourites. Each card previews the layout with the look of its blocks.
- A Widgets tab with the StudioLMS Widgets filter: cards that insert the live widgets for forum
  participation, the course map and the rules of a quiz. It shows only when the filter is installed and has a
  widget turned on, and warns when the filter is off in the course being edited.
- Optional AI: a single block from a sentence (AI Block), a whole layout from a teaching context (AI Layout)
  and a conversation that proposes a complete page (AI Chat). The AI comes from the AI Hub or Moodle's
  `core_ai`; the plugin stores no API key, and a course that has the AI tools turned off is never sent.
- Alignment and width options for the blocks that do not fill the page, hover effects that respect the
  reduced-motion setting of the system, and a block colour that fills in colours with readable contrast.
- Output that works with screen readers (accordions announce their state, emoji are hidden from them) and
  that shows in full wherever Moodle cleans text, such as forum posts, glossary entries and quiz text.
- Privacy API (templates and favourites are exported and erased per user; official templates are kept and
  anonymised), and events for the creation and deletion of templates.
- Support for Moodle 4.5 to 5.3.
