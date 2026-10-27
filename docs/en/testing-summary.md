# 🧪 Automated Tests

StudioLMS ships with **253 PHPUnit test cases**, **257 JavaScript tests** and a **78-scenario Behat suite**, run on every CI push across the full matrix (Moodle 4.5 → 5.x, PostgreSQL & MariaDB).

### PHPUnit — Unit & Integration Tests

| Area | Test files | Cases |
|------|-----------:|------:|
| AI (`ai/`, notice of the AI tabs — provider chain, generators, payload parsing, chat) | 5 | 64 |
| AI web services (`external/generate_*`, `generate_endpoints`, `chat_message`) | 13 | 42 |
| Template web services (save, get, delete, favourite, import, export) | 6 | 56 |
| Events | 3 | 10 |
| Privacy API | 1 | 18 |
| Editor integration (`plugininfo`, hook callbacks, editor stylesheet) | 3 | 21 |
| Templates and presets (card, chart, hover classes, block alignment, ready-made layouts, texts) | 7 | 34 |
| Database definitions, upgrade step and data generator | 3 | 8 |
| **Total** | **41** | **253** |

```bash
vendor/bin/phpunit --testsuite tiny_studiolms_testsuite
```

AI tests never reach a real provider: the AI Hub's client is replaced by a stub, and a site with no
AI configured is used to exercise the "no AI" path.

### JavaScript — Headless Tests

**257 tests** in **45 files** run with `node --test tests/js/*.test.js`, without a browser or Moodle: the block models, contrast and colours, escaping and sanitising, the template library and the Studio window.

### Behat — Acceptance Tests

| Feature files | Scenarios |
|---------------|----------:|
| Template library (`manage_templates`, `save_template`, `favourite_template`, `import_export`) | 16 |
| Template lifecycle (`template_lifecycle`) | 10 |
| Every block inserted (`insert_blocks`) | 26 |
| Student view and read-only blocks (`student_view`, `text_blocks_view`) | 4 |
| Editing safeguards (`clear_canvas`, `icon_picker`, `button_link_guard`, `toolbar_capability`, `ai_tabs_unavailable`) | 14 |
| Security regressions (7 files — see the full breakdown) | 8 |
| **Total** | **78** |

```bash
php admin/tool/behat/cli/init.php
vendor/bin/behat --tags=@tiny_studiolms --profile=chrome
```

[Full test-by-test breakdown →]({{ '/testing.html' | relative_url }})
