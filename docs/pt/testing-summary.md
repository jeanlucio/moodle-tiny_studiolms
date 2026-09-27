# 🧪 Testes Automatizados

O StudioLMS inclui **142 casos de teste PHPUnit** e uma suíte Behat com **22 cenários**, executados
em todo push de CI na matriz completa (Moodle 4.5 → 5.x, PostgreSQL e MariaDB).

### PHPUnit — Testes Unitários e de Integração

| Área | Arquivos de teste | Casos |
|------|-------------------:|------:|
| IA (`ai/` — cadeia de provedores, geradores, chat) | 3 | 19 |
| Web services de IA (`external/generate_*`, `chat_message`) | 13 | 41 |
| Web services de templates (salvar, buscar, apagar, favoritar, importar, exportar) | 6 | 48 |
| Eventos | 2 | 6 |
| Privacy API | 1 | 16 |
| Integração com o editor (`plugininfo`, hook callbacks) | 2 | 12 |
| **Total** | **27** | **142** |

```bash
vendor/bin/phpunit --testsuite tiny_studiolms_testsuite
```

Os testes de IA nunca chegam a um provedor real: o cliente da Central de IA é substituído por um
stub, e um site sem nenhuma IA configurada é usado para exercitar o caminho "sem IA".

### Behat — Testes de Aceitação

| Arquivo de feature | Cenários |
|---------------------|---------:|
| `manage_templates.feature` | 4 |
| `save_template.feature` | 4 |
| `favourite_template.feature` | 4 |
| `import_export.feature` | 4 |
| Regressões de segurança (6 arquivos — ver detalhamento completo) | 6 |
| **Total** | **22** |

```bash
php admin/tool/behat/cli/init.php
vendor/bin/behat --tags=@tiny_studiolms --profile=chrome
```

[Detalhamento completo teste por teste →]({{ '/testing.html' | relative_url }})
