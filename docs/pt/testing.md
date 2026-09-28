# 🧪 Testes Automatizados

O StudioLMS inclui **142 casos de teste PHPUnit** em **27 arquivos**, mais uma suíte Behat com
**22 cenários** em **10 arquivos de feature**, executados em todo push de CI na matriz completa
(Moodle 4.5 → 5.x, PostgreSQL e MariaDB).

### PHPUnit — Testes Unitários e de Integração

| Arquivo de teste | Casos | O que é coberto |
|-------------------|------:|------------------|
| `ai/chat_test.php` | 5 | Montagem do prompt de sistema do chat (inclui presets fornecidos, omite a seção quando nenhum é dado, tolera JSON de preset malformado, documenta os dois tipos de ação) e que uma resposta do modelo fora de JSON é limpa exatamente como o caminho JSON, nunca devolvida crua |
| `ai/generator_test.php` | 11 | O caminho seguro de "nenhuma IA configurada" em todo gerador e no `call_chat`; uma falha de provedor aparecendo como erro do próprio gerador (nunca como "não configurado"), com o detalhe cru fora da resposta; `generate_block` interpretando uma resposta do hub, rejeitando um tipo de bloco desconhecido e purificando marcação numa config genérica de IA (a regressão de mXSS via `<noscript>`); a mesma purificação para `generate_preset`; histórico de chat achatado em linhas rotuladas por papel; a lista de ícones permitidos aplicada de ponta a ponta via `generate_infographic_steps`/`generate_infographic` e testada diretamente por reflexão, inclusive um payload tentando escapar de um atributo de classe |
| `ai/provider_chain_test.php` | 3 | A cadeia local_aihub → core_ai: nada é tentado quando nenhum dos dois está disponível; um sucesso do hub é devolvido como está e registrado sob o componente deste plugin; uma falha do hub sem fallback para o core_ai mantém a mensagem de falha do próprio hub |
| `event/template_created_test.php` | 2 | O evento dispara com os dados corretos e pode ser acionado/observado; a string do nome resolve |
| `event/template_deleted_test.php` | 4 | A descrição inclui o nome do template quando fornecido e o omite quando não; o evento pode ser acionado/observado; a string do nome resolve |
| `external/chat_message_test.php` | 5 | Rejeição de convidado; checagem de capability; papéis de mensagem inválidos removidos do histórico; histórico cortado no máximo configurado; ausência de IA lança um `moodle_exception` limpo |
| `external/delete_template_test.php` | 8 | Um dono apaga o próprio template; outro usuário não consegue; um gestor apaga um template global mas não o privado de outro usuário; um gestor com papel só no curso é rejeitado no contexto real do curso (não num contexto de sistema fixo); a exclusão propaga para os favoritos e dispara `template_deleted`; apagar um template inexistente lança exceção |
| `external/export_templates_test.php` | 8 | Um professor exporta só os próprios templates; um gestor exporta os próprios mais todos os globais; exportação por IDs explícitos devolve só os próprios e exclui os que não são; um gestor pode exportar um global por ID; a exportação nunca expõe templates privados de outro usuário; um gestor com papel só no curso não consegue exportar globais; convidados são rejeitados |
| `external/generate_accordion_test.php`, `generate_block_test.php`, `generate_callout_test.php`, `generate_card_test.php`, `generate_infographic_test.php`, `generate_infographic_comparison_test.php`, `generate_infographic_features_test.php`, `generate_infographic_steps_test.php`, `generate_infographic_timeline_test.php`, `generate_mindmap_test.php`, `generate_preset_test.php`, `generate_resources_test.php` | 3 cada (36) | Os 12 web services de geração por IA compartilham o mesmo contrato: rejeição de convidado, checagem de capability e um `moodle_exception` limpo (nunca um erro cru) quando nenhuma fonte de IA está disponível |
| `external/get_templates_test.php` | 9 | "Meus" devolve só os próprios templates do chamador e exclui os de outros; "globais" devolve só templates globais; `isfavourite` reflete o estado real de favorito; "favoritos" devolve o conjunto correto e exclui o template privado de outro usuário alcançado por uma linha de favorito forjada; um gestor com papel só no curso nunca é marcado `ismine` para um template global; convidados são rejeitados |
| `external/import_templates_test.php` | 8 | Importar um ou vários templates; um nome duplicado recebe sufixo numérico, resolvido sequencialmente em colisões repetidas; um professor não pode importar como global, um gestor do site pode, um gestor com papel só no curso não pode; a importação dispara um evento `template_created` por template |
| `external/save_template_test.php` | 6 | Um professor salva um template pessoal mas não consegue salvar um global; um gestor pode salvar um template global; salvar dispara `template_created`; convidados são rejeitados; um gestor com papel só no curso não consegue salvar um template global |
| `external/toggle_favourite_test.php` | 9 | Ativar cria um favorito, desativar remove, sem duplicatas; favoritar um template inexistente lança exceção; convidados são rejeitados; um template privado de outro usuário não pode ser favoritado, mas um global pode; um professor matriculado no curso pode usar o contexto real do curso e é rejeitado num contexto de sistema fixo |
| `hook_callbacks_test.php` | 2 | O módulo AMD do frontend do estudante é solicitado só em páginas de contexto de curso/módulo, e ignorado em qualquer outra |
| `plugininfo_test.php` | 10 | `is_enabled()` reflete a capability; a configuração devolvida repassa o ID de contexto real; `canmanageglobaltemplates` ignora uma concessão dessa capability só no curso; `hasai` segue a cadeia de provedores de ponta a ponta; o link "Minhas chaves de IA" da Central de IA só aparece quando as chaves pessoais estão habilitadas e o professor tem a capability; presets carregam para um idioma com arquivos reais, voltam vazios quando não existe nenhum, e caem para inglês quando o próprio diretório do idioma não existe; os botões e itens de menu disponíveis são declarados |
| `privacy/provider_test.php` | 16 | Descoberta de contexto para templates, favoritos e um caso vazio; a exportação inclui templates próprios; a exclusão remove dados pessoais preservando templates globais, anonimizando a autoria tanto na exclusão de um usuário quanto em lote e para todos os usuários de um contexto; a listagem reversa de usuários por contexto; os metadados declaram só as duas tabelas próprias deste plugin (templates e favoritos — nenhuma declaração de chave ou log de IA restou); tanto um contexto que não é de sistema quanto um caso sem dados não fazem nada em todo lugar onde são checados |

```bash
vendor/bin/phpunit --testsuite tiny_studiolms_testsuite
```

Os testes de IA nunca chegam a um provedor real: o cliente da `local_aihub` é substituído por um
stub (`tests/fixtures/hub_stub_client.php`), e um site de teste recém-criado, sem chave na Central de
IA e sem provedor `core_ai`, é usado para exercitar o caminho "sem IA disponível".

### Behat — Testes de Aceitação

| Arquivo de feature | Cenários | O que é coberto |
|----------------------|---------:|------------------|
| `manage_templates.feature` | 4 | O botão da barra é visível para um professor e para um gestor; a troca entre abas funciona; as seis abas existem no diálogo |
| `save_template.feature` | 4 | Abrir o diálogo; todos os botões de aba obrigatórios estão presentes; clicar em "Meus Templates" a ativa; a grade da biblioteca renderiza após clicar numa aba |
| `favourite_template.feature` | 4 | O botão da aba Favoritos existe; clicar nele a ativa; a grade da biblioteca renderiza; sair e voltar para Componentes a reativa corretamente |
| `import_export.feature` | 4 | Os botões Exportar, Importar e Salvar como template estão presentes em "Meus Templates", cada um e os três juntos |
| `global_template_sanitization.feature` | 1 | Carregar um template global malicioso no canvas não executa o payload (o caso clássico `<img onerror>`) |
| `callout_state_sanitization.feature` | 1 | Marcação digitada no campo de ícone do destaque nunca renderiza como elemento na pré-visualização |
| `state_restore_sanitization.feature` | 1 | Carregar um template cujo bloco não tem filho DOM correspondente para seu campo rico não cai para executar o payload de estado controlado pelo atacante |
| `animation_payload_sanitization.feature` | 1 | Um manipulador disparado por animação (`onanimationstart`) numa tag `<p>` — que o próprio schema do TinyMCE manteria intacto — não executa |
| `url_scheme_sanitization.feature` | 1 | Um template com URLs de script ofuscadas por caractere de tabulação, caractere de controle no início e `xlink:href`/`<set>` de SVG mantém só o único link `https` seguro |
| `noscript_payload_sanitization.feature` | 1 | Um payload escondido dentro de um comentário HTML envolto em `<noscript>` — inerte enquanto o sanitizador o analisa com scripting desativado, vivo quando a página real o analisa — não executa |

```bash
php admin/tool/behat/cli/init.php
vendor/bin/behat --tags=@tiny_studiolms --profile=chrome
```

Seis dos dez arquivos de feature são testes de regressão de segurança, um para cada correção
produzida por duas rodadas de auditoria de segurança contra este plugin — veja
[Segurança e Conformidade](/pt.html#security) para o que cada um protege.
