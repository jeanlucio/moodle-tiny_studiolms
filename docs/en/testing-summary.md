# 🧪 Automated Tests

StudioLMS ships with **142 PHPUnit test cases** and a **22-scenario Behat suite**, run on every CI push across the full matrix (Moodle 4.5 → 5.x, PostgreSQL & MariaDB).

### PHPUnit — Unit & Integration Tests

| Area | Test files | Cases |
|------|-----------:|------:|
| AI (`ai/` — provider chain, generators, chat) | 3 | 19 |
| AI web services (`external/generate_*`, `chat_message`) | 13 | 41 |
| Template web services (save, get, delete, favourite, import, export) | 6 | 48 |
| Events | 2 | 6 |
| Privacy API | 1 | 16 |
| Editor integration (`plugininfo`, hook callbacks) | 2 | 12 |
| **Total** | **27** | **142** |

```bash
vendor/bin/phpunit --testsuite tiny_studiolms_testsuite
```

AI tests never reach a real provider: the AI Hub's client is replaced by a stub, and a site with no
AI configured is used to exercise the "no AI" path.

### Behat — Acceptance Tests

| Feature file | Scenarios |
|--------------|----------:|
| `manage_templates.feature` | 4 |
| `save_template.feature` | 4 |
| `favourite_template.feature` | 4 |
| `import_export.feature` | 4 |
| Security regressions (6 files — see the full breakdown) | 6 |
| **Total** | **22** |

```bash
php admin/tool/behat/cli/init.php
vendor/bin/behat --tags=@tiny_studiolms --profile=chrome
```

[Full test-by-test breakdown →]({{ '/testing.html' | relative_url }})
