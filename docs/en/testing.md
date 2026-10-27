# 🧪 Automated Tests

StudioLMS ships with **251 PHPUnit test cases** across **41 files**, **252 JavaScript tests** across **44 files**, plus a **76-scenario Behat suite** across **20 feature files**, run on every CI push across the full matrix (Moodle 4.5 → 5.x, PostgreSQL & MariaDB).

### PHPUnit — Unit & Integration Tests

| Test file | Cases | What is covered |
|-----------|------:|----------------|
| `ai/chat_test.php` | 14 | System-prompt building for the chat assistant (includes supplied presets, omits the section when none are given, tolerates malformed preset JSON, documents both action types) and that a non-JSON model reply is cleaned exactly like the JSON path, not returned raw |
| `ai/generator_test.php` | 13 | The fail-safe "no AI configured" path across every generator and `call_chat`; a provider failure surfacing as the generator's own error (never as "not configured"), with the raw detail kept out of the response; `generate_block` parsing a hub response, rejecting an unknown block type, and purifying markup in a generic AI config (the `<noscript>` mutation-XSS regression); the same purification for `generate_preset`; chat history flattened into role-labelled lines; the icon allow-list applied end to end through `generate_infographic_steps`/`generate_infographic` and exercised directly via reflection, including a payload trying to break out of a class attribute |
| `ai/provider_chain_test.php` | 12 | The local_aihub → core_ai chain: nothing attempted when neither is available; a hub success returned as-is and logged under this plugin's component; a hub failure with no core_ai fallback keeping the hub's own failure message |
| `event/template_created_test.php` | 3 | The event fires with the right data and can be triggered/observed; its name string resolves |
| `event/template_deleted_test.php` | 6 | Description includes the template name when supplied and omits it otherwise; the event can be triggered/observed; its name string resolves |
| `external/chat_message_test.php` | 4 | Guest rejection; capability check; invalid message roles stripped from history; history trimmed to the configured maximum; no-AI-available throws a clean `moodle_exception` |
| `external/delete_template_test.php` | 8 | An owner deletes their own template; another user cannot; a manager deletes a global template but not another user's private one; a course-scoped manager is rejected at the real course context (not a hardcoded system context); deletion cascades to favourites and fires `template_deleted`; deleting a non-existent template throws |
| `external/export_templates_test.php` | 10 | A teacher exports only their own templates; a manager exports their own plus every global template; export by explicit IDs returns only owned ones and excludes unowned ones; a manager can export a global template by ID; export never exposes another user's private templates; a course-scoped manager cannot export globals; ticking templates exports only those and ticking none exports all, including the site templates only for a manager; guests are rejected |
| `external/generate_accordion_test.php`, `generate_block_test.php`, `generate_callout_test.php`, `generate_card_test.php`, `generate_infographic_test.php`, `generate_infographic_comparison_test.php`, `generate_infographic_features_test.php`, `generate_infographic_steps_test.php`, `generate_infographic_timeline_test.php`, `generate_preset_test.php`, `generate_resources_test.php` | 3 each (33) | Each of the 11 AI-generation web services shares the same contract: guest rejection, capability check, and a clean `moodle_exception` (never a raw error) when no AI source is available |
| `external/get_templates_test.php` | 9 | "Mine" returns only the caller's own templates and excludes others; "global" returns only global templates; `isfavourite` reflects the real favourite state; "favourites" returns the correct set and excludes another user's private template reached via a forged favourite row; a course-scoped manager is never marked `ismine` for a global template; guests are rejected |
| `external/import_templates_test.php` | 12 | Importing one or several templates; a duplicate name gets a numeric suffix, resolved sequentially on repeated collisions; a teacher cannot import as global, a site manager can, a course-scoped manager cannot; import fires one `template_created` event per template |
| `external/save_template_test.php` | 8 | A teacher saves a personal template but cannot save a global one; a manager can save a global template; saving fires `template_created`; guests are rejected; a course-scoped manager cannot save a global template |
| `external/toggle_favourite_test.php` | 9 | Toggling on creates a favourite, toggling off removes it, with no duplicates; toggling a non-existent template throws; guests are rejected; a private template owned by someone else cannot be favourited, but a global one can; a course-enrolled teacher can use the real course context and is rejected at a hardcoded system context |
| `hook_callbacks_test.php` | 2 | The student-frontend AMD module is requested only on course/module context pages, and skipped everywhere else |
| `plugininfo_test.php` | 15 | `is_enabled()` reflects the capability; the returned configuration threads back the real context ID; `canmanageglobaltemplates` ignores a course-scoped grant of that capability; `hasai` follows the provider chain end to end; the AI Hub "My AI keys" link only appears when personal keys are enabled and the teacher holds the capability; presets load for a language with real files, come back empty when none exist, and fall back to English when the language directory itself is missing; the available buttons and menu items are declared |
| `privacy/provider_test.php` | 18 | Context discovery for templates, favourites and an empty case; export includes owned templates; deletion removes personal data while preserving global templates, anonymising authorship on both single-user and bulk deletion and for every user in a context; the reverse per-context user listing; metadata declares only this plugin's own two tables (templates and favourites — no AI key or log declaration remains); both a non-system context and an empty-data case are a no-op everywhere they are checked |
| `ai/generator_payload_test.php` | 24 | The model is untrusted: every generator parses what it returns wrapped in code fences, half-filled or hostile — empty items dropped, HTML purified, flags and defaults normalised, wrong-typed fields (an array where text is expected, the string "false" as a boolean) read safely; the prompt schema offers only what the blocks accept |
| `ai_notice_test.php` | 1 | Each of the three AI tabs carries the notice that the text goes to the site's AI provider |
| `alignment_test.php` | 8 | The alignment class a teacher picks (left, centre, right) is on each of the eight blocks that take one and survives Moodle's HTML cleaner |
| `card_template_test.php` | 8 | The card template: the video frame is named by a lang string (no literal word a screen reader would announce in every language); media position and the side accent are classes, not inline styles the HTML cleaner would drop |
| `chart_templates_test.php` | 5 | The chart, bar chart and gauge templates draw no SVG and survive Moodle's HTML cleaner (`clean_text()`) with every class and width or height intact; a label is escaped once |
| `db_definitions_test.php` | 3 | The web service, cache and capability definition files load and declare what the code uses |
| `db_upgrade_test.php` | 3 | The upgrade step that removes an index duplicating a key: two identical indexes become one, a column with none gets the key's index, a single index is left alone |
| `editor_styles_test.php` | 2 | The theme serves the plugin's editor stylesheet, and `editor_styles.css` is an exact copy of `styles.css` |
| `event/event_mappings_test.php` | 1 | Every event that logs an object declares its own objectid mapping for course restore |
| `external/generate_endpoints_test.php` | 5 | What the AI web services return once a provider is reached: each returns its declared structure, an unexpected exception becomes a generic error, the chat returns an action only when there is one, drops history entries with other roles and sends only the latest history |
| `generator_test.php` | 2 | The data generator: a personal template belongs to the given user and is listed for that user only |
| `interaction_classes_test.php` | 4 | The hover effect and the click sound a teacher picks reach the page as CSS classes (button, card, callout), and the student-frontend script starts for any block |
| `presets_test.php` | 3 | The ready-made layouts: every English layout mirrors the Portuguese one and holds no Portuguese text; a layout is made of blocks only (no hand-written heading, button, image or styled box, the columns of a grid hold blocks, and the heading and description of a grid are plain text) |
| `templates_header_test.php` | 1 | Every template opens with the licence comment and then declares its `@template` name |
| `templates_text_test.php` | 2 | No title, aria-label, alt or placeholder in a template holds a literal word: they are lang strings, so every language gets them |

```bash
vendor/bin/phpunit --testsuite tiny_studiolms_testsuite
```

AI tests never reach a real provider: `local_aihub`'s client is replaced by a stub (`tests/fixtures/hub_stub_client.php`), and a fresh test site with no AI Hub key and no `core_ai` provider is used to exercise the "no AI available" path.

### JavaScript — Headless Tests (`node --test`)

| Area | Test files | Cases | What is covered |
|------|-----------:|------:|----------------|
| Blocks | 22 | 153 | What the blocks draw and how they behave: the chart, bar and gauge models, the width cap of the blocks that hold little, the accordion and resources options, the card layout and shadow, the heading and description of the grid, blocks inside a grid column, text typed on the canvas, colours and contrast (WCAG ratios), icon pairs, grid columns, the hover effect on every block, the hidden decorative emoji |
| Safety and cleaning | 10 | 41 | Safety and the HTML cleaner: escaping, URL and AI-config sanitising, video URLs, blocks found by class where Moodle strips attributes, frontend events, no literal visible text in the AMD sources, no Bootstrap-5-only utilities, the editor's inline CSS |
| Templates and library | 8 | 28 | Templates and the library: the template cache, importing a file, loading a template into the canvas in one step, the export button reading Export all or Export selected (n), the stacked link fields of the profile card, example texts in the site language, preset matching and its language notice |
| Studio window | 4 | 30 | The Studio window: the sidebar split and its geometry, the active tab, the AI use policy gate |
| **Total** | **44** | **252** | |

These run without a browser or Moodle: modules imported by the tests import nothing, and a test that needs `app.js` or a template reads the source file instead.

```bash
node --test tests/js/*.test.js
```

### Behat — Acceptance Tests

| Feature file | Scenarios | What is covered |
|--------------|----------:|----------------|
| `manage_templates.feature` | 4 | The toolbar button is visible to a teacher and to a manager; switching between tabs works; all six tabs exist in the dialog |
| `save_template.feature` | 4 | Opening the dialog; all required tab buttons are present; clicking "My Templates" activates it; the library grid renders after clicking a tab |
| `favourite_template.feature` | 4 | The Favourites tab button exists; clicking it activates the tab; the library grid renders; switching away and back to Components reactivates it correctly |
| `import_export.feature` | 4 | The Export, Import and Save-as-template buttons are each present in "My Templates", and all three together |
| `global_template_sanitization.feature` | 1 | Loading a malicious global template into the canvas does not execute its payload (the classic `<img onerror>` case) |
| `callout_state_sanitization.feature` | 1 | Markup typed into the callout icon field never renders as an element in the preview |
| `state_restore_sanitization.feature` | 1 | Loading a template whose block has no matching DOM child for its rich field does not fall back to executing the attacker-controlled state payload |
| `animation_payload_sanitization.feature` | 1 | An animation-triggered handler (`onanimationstart`) on a `<p>` tag — which TinyMCE's own schema would otherwise keep intact — does not execute |
| `url_scheme_sanitization.feature` | 1 | A template with script URLs obfuscated via a tab character, a leading control character, and SVG `xlink:href`/`<set>` keeps only the one safe `https` link |
| `noscript_payload_sanitization.feature` | 1 | A payload hidden inside a `<noscript>`-wrapped HTML comment — inert while the sanitizer parses it with scripting disabled, live once the real page parses it — does not execute |
| `ai_tabs_unavailable.feature` | 4 | Each AI tab shows the "no AI available" notice instead of a form that can never produce anything; the other tabs keep working |
| `block_payload_sanitization.feature` | 2 | Markup typed into the settings of any block never runs in the preview, and a hostile template of any block runs nothing when loaded |
| `button_link_guard.feature` | 2 | Clicking the text of an action button in the editor does not follow its link, and the link tools do not remove it |
| `clear_canvas.feature` | 3 | The Clear canvas button appears only with two or more blocks; confirming removes every block, cancelling keeps them |
| `icon_picker.feature` | 1 | Escape closes the icon picker but keeps the composer and its blocks |
| `insert_blocks.feature` | 26 | Every one of the 17 blocks can be added to the canvas, inserted into the page and read back; every block opens settings panels with editable fields; a new block shows its example texts in the site language |
| `student_view.feature` | 3 | The blocks a teacher saved reach a student without editing attributes; a student can open and close an accordion and collapse and reopen the resources list |
| `template_lifecycle.feature` | 8 | Save a template and see it under My templates; save it as a site template; My templates lists only the teacher's own; site templates are listed for a teacher who cannot delete them; favourite and unfavourite; delete after confirmation; load onto the canvas and insert |
| `text_blocks_view.feature` | 1 | A page with only a heading and a button carries no editing attributes |
| `toolbar_capability.feature` | 4 | The StudioLMS button follows `tiny/studiolms:use` in the course: held, absent for a student, lost where denied, and not hidden in another course |

```bash
php admin/tool/behat/cli/init.php
vendor/bin/behat --tags=@tiny_studiolms --profile=chrome
```

Seven of the twenty feature files are security regression tests, one per fix produced by two rounds of a security audit against this plugin — see [Security & Compliance](/#security) for what each defends against.
