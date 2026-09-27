# 🧪 Automated Tests

StudioLMS ships with **144 PHPUnit test cases** across **28 files**, plus a **22-scenario Behat suite** across **10 feature files**, run on every CI push across the full matrix (Moodle 4.5 → 5.x, PostgreSQL & MariaDB).

### PHPUnit — Unit & Integration Tests

| Test file | Cases | What is covered |
|-----------|------:|----------------|
| `ai/chat_test.php` | 5 | System-prompt building for the chat assistant (includes supplied presets, omits the section when none are given, tolerates malformed preset JSON, documents both action types) and that a non-JSON model reply is cleaned exactly like the JSON path, not returned raw |
| `ai/generator_test.php` | 11 | The fail-safe "no AI configured" path across every generator and `call_chat`; a provider failure surfacing as the generator's own error (never as "not configured"), with the raw detail kept out of the response; `generate_block` parsing a hub response, rejecting an unknown block type, and purifying markup in a generic AI config (the `<noscript>` mutation-XSS regression); the same purification for `generate_preset`; chat history flattened into role-labelled lines; the icon allow-list applied end to end through `generate_infographic_steps`/`generate_infographic` and exercised directly via reflection, including a payload trying to break out of a class attribute |
| `ai/provider_chain_test.php` | 3 | The local_aihub → core_ai chain: nothing attempted when neither is available; a hub success returned as-is and logged under this plugin's component; a hub failure with no core_ai fallback keeping the hub's own failure message |
| `db_upgrade_test.php` | 2 | The upgrade step that removed the plugin's legacy AI keys and log table: deletes the `tiny_studiolms_%` preferences, unsets the five settings and drops the log table when present; is a no-op when the table was already gone |
| `event/template_created_test.php` | 2 | The event fires with the right data and can be triggered/observed; its name string resolves |
| `event/template_deleted_test.php` | 4 | Description includes the template name when supplied and omits it otherwise; the event can be triggered/observed; its name string resolves |
| `external/chat_message_test.php` | 5 | Guest rejection; capability check; invalid message roles stripped from history; history trimmed to the configured maximum; no-AI-available throws a clean `moodle_exception` |
| `external/delete_template_test.php` | 8 | An owner deletes their own template; another user cannot; a manager deletes a global template but not another user's private one; a course-scoped manager is rejected at the real course context (not a hardcoded system context); deletion cascades to favourites and fires `template_deleted`; deleting a non-existent template throws |
| `external/export_templates_test.php` | 8 | A teacher exports only their own templates; a manager exports their own plus every global template; export by explicit IDs returns only owned ones and excludes unowned ones; a manager can export a global template by ID; export never exposes another user's private templates; a course-scoped manager cannot export globals; guests are rejected |
| `external/generate_accordion_test.php`, `generate_block_test.php`, `generate_callout_test.php`, `generate_card_test.php`, `generate_infographic_test.php`, `generate_infographic_comparison_test.php`, `generate_infographic_features_test.php`, `generate_infographic_steps_test.php`, `generate_infographic_timeline_test.php`, `generate_mindmap_test.php`, `generate_preset_test.php`, `generate_webteca_test.php` | 3 each (36) | Each of the 12 AI-generation web services shares the same contract: guest rejection, capability check, and a clean `moodle_exception` (never a raw error) when no AI source is available |
| `external/get_templates_test.php` | 9 | "Mine" returns only the caller's own templates and excludes others; "global" returns only global templates; `isfavourite` reflects the real favourite state; "favourites" returns the correct set and excludes another user's private template reached via a forged favourite row; a course-scoped manager is never marked `ismine` for a global template; guests are rejected |
| `external/import_templates_test.php` | 8 | Importing one or several templates; a duplicate name gets a numeric suffix, resolved sequentially on repeated collisions; a teacher cannot import as global, a site manager can, a course-scoped manager cannot; import fires one `template_created` event per template |
| `external/save_template_test.php` | 6 | A teacher saves a personal template but cannot save a global one; a manager can save a global template; saving fires `template_created`; guests are rejected; a course-scoped manager cannot save a global template |
| `external/toggle_favourite_test.php` | 9 | Toggling on creates a favourite, toggling off removes it, with no duplicates; toggling a non-existent template throws; guests are rejected; a private template owned by someone else cannot be favourited, but a global one can; a course-enrolled teacher can use the real course context and is rejected at a hardcoded system context |
| `hook_callbacks_test.php` | 2 | The student-frontend AMD module is requested only on course/module context pages, and skipped everywhere else |
| `plugininfo_test.php` | 10 | `is_enabled()` reflects the capability; the returned configuration threads back the real context ID; `canmanageglobaltemplates` ignores a course-scoped grant of that capability; `hasai` follows the provider chain end to end; the AI Hub "My AI keys" link only appears when personal keys are enabled and the teacher holds the capability; presets load for a language with real files, come back empty when none exist, and fall back to English when the language directory itself is missing; the available buttons and menu items are declared |
| `privacy/provider_test.php` | 16 | Context discovery for templates, favourites and an empty case; export includes owned templates; deletion removes personal data while preserving global templates, anonymising authorship on both single-user and bulk deletion and for every user in a context; the reverse per-context user listing; metadata declares only this plugin's own two tables (templates and favourites — no AI key or log declaration remains); both a non-system context and an empty-data case are a no-op everywhere they are checked |

```bash
vendor/bin/phpunit --testsuite tiny_studiolms_testsuite
```

AI tests never reach a real provider: `local_aihub`'s client is replaced by a stub (`tests/fixtures/hub_stub_client.php`), and a fresh test site with no AI Hub key and no `core_ai` provider is used to exercise the "no AI available" path.

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

```bash
php admin/tool/behat/cli/init.php
vendor/bin/behat --tags=@tiny_studiolms --profile=chrome
```

Six of the ten feature files are security regression tests, one per fix produced by two rounds of a security audit against this plugin — see [Security & Compliance](/#security) for what each defends against.
