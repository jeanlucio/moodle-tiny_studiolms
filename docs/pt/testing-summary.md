# 🧪 Testes Automatizados

O StudioLMS inclui **240 casos de teste PHPUnit**, **199 testes de JavaScript** e uma suíte Behat com **76 cenários**, executados
em todo push de CI na matriz completa (Moodle 4.5 → 5.x, PostgreSQL e MariaDB).

### PHPUnit — Testes Unitários e de Integração

| Área | Arquivos de teste | Casos |
|------|-------------------:|------:|
| IA (`ai/`, aviso das abas de IA — cadeia de provedores, geradores, interpretação do payload, chat) | 5 | 64 |
| Web services de IA (`external/generate_*`, `generate_endpoints`, `chat_message`) | 13 | 42 |
| Web services de modelos (salvar, buscar, apagar, favoritar, importar, exportar) | 6 | 56 |
| Eventos | 3 | 10 |
| Privacy API | 1 | 18 |
| Integração com o editor (`plugininfo`, hook callbacks, folha de estilo do editor) | 3 | 19 |
| Modelos e presets (cartão, gráficos, classes de hover, layouts prontos, textos) | 6 | 23 |
| Definições do banco, passo de upgrade e gerador de dados | 3 | 8 |
| **Total** | **40** | **240** |

```bash
vendor/bin/phpunit --testsuite tiny_studiolms_testsuite
```

Os testes de IA nunca chegam a um provedor real: o cliente da Central de IA é substituído por um
stub, e um site sem nenhuma IA configurada é usado para exercitar o caminho "sem IA".

### JavaScript — Testes sem navegador

**199 testes** em **39 arquivos** rodam com `node --test tests/js/*.test.js`, sem navegador nem Moodle: os modelos dos blocos, contraste e cores, escape e saneamento, a biblioteca de modelos e a janela do Studio.

### Behat — Testes de Aceitação

| Arquivos de feature | Cenários |
|----------------------|---------:|
| Biblioteca de modelos (`manage_templates`, `save_template`, `favourite_template`, `import_export`) | 16 |
| Ciclo de vida dos modelos (`template_lifecycle`) | 8 |
| Todos os blocos inseridos (`insert_blocks`) | 26 |
| Visão do estudante e blocos somente leitura (`student_view`, `text_blocks_view`) | 4 |
| Salvaguardas de edição (`clear_canvas`, `icon_picker`, `button_link_guard`, `toolbar_capability`, `ai_tabs_unavailable`) | 14 |
| Regressões de segurança (7 arquivos — veja o detalhamento) | 8 |
| **Total** | **76** |

```bash
php admin/tool/behat/cli/init.php
vendor/bin/behat --tags=@tiny_studiolms --profile=chrome
```

[Detalhamento completo teste por teste →]({{ '/testing.html' | relative_url }})
