# ✨ Features

* 🧱 **18 Instructional Blocks,** inserted from the editor toolbar and configured through forms — no HTML required:
  * **Stylised Heading** — `h3`/`h4` heading with icon and background colour.
  * **Action Button** — call-to-action button with configurable URL, target, colours, border radius and alignment.
  * **Advanced Card** — card with image or YouTube video, a rich editable body and an internal button.
  * **Accordion** — expandable topic with 4 icon styles and an open/closed initial state.
  * **Webteca** — resource library (PDF, video, audio, link) in list or grid layout.
  * **Grid Cards** — multi-column container with editable slots.
  * **Callout** — highlight box with a customisable icon and border colour.
  * **Table** — striped or plain table that works with TinyMCE's own table tools.
  * **Profile Card** — presenter card with photo, name, role, bio and up to 3 links.
  * **Pie / Donut Chart** — pure SVG, up to 6 slices, custom labels, 4 colour themes.
  * **Bar Chart** — pure SVG, horizontal or vertical, up to 8 bars.
  * **Gauge** — pure SVG semi-circle gauge with traffic-light colours (green ≥ 67 %, amber ≥ 34 %, red below); 1–3 gauges side by side.
  * **Mind Map** — pure SVG radial diagram with a central topic, up to 8 branches and up to 5 child nodes each.
  * **Infographic — Stats** — up to 4 items combining an icon (from a 40-icon picker), a value and a label.
  * **Infographic — Steps** — numbered flow with icon and description, for methods, tutorials and workflows.
  * **Infographic — Features** — icon + title + description grid, for competencies and course highlights.
  * **Infographic — Timeline** — vertical timeline with date/period, icon and description.
  * **Infographic — Comparison** — 2–3 columns with coloured headers and ✓/✗ item lists.
* 🎨 **Canvas Composer:** a full-screen modal where a page is assembled block by block, reordered, previewed and inserted into the editor in one step.
* 💾 **Round-trip editing:** each block keeps its configuration inside the content (`data-slms-state`), so any block already in a course can be reopened and edited later.
* 📚 **Template Library** in four tabs:
  * **Components** — the base blocks above.
  * **Official Templates** — institution-wide layouts, managed by site managers and read-only for teachers.
  * **My Templates** — each teacher's personal layouts, with save, export and import.
  * **Favourites** — starred templates from every tab in one place.
* 📤 **Export / Import:** templates travel as `.json` files between Moodle sites.
* 🤖 **AI-assisted authoring (optional)** in three modes — **AI Block** (one block from a sentence), **AI Layout** (a multi-block layout from a pedagogical context) and **AI Chat** (a conversation that proposes a complete page). Several blocks also have their own "Generate with AI" button. StudioLMS holds no API key: the AI comes from the [AI Hub](https://github.com/jeanlucio/moodle-local_aihub) or Moodle's own AI providers (see [AI & Third-party Services](#ai)).
* 🎓 **Student-side behaviour:** a small script, loaded only on course and activity pages (never inside the editor), makes accordions expand and plays the optional hover and click effects.
* 📊 **Event logging:** template creation and deletion are recorded in Moodle's standard log store.
* 🔒 **Privacy API:** templates and favourites are covered by export and deletion requests.
