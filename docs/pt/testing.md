# 🧪 Testes Automatizados

O StudioLMS inclui **251 casos de teste PHPUnit** em **41 arquivos**, **257 testes de JavaScript** em **45 arquivos**, mais uma suíte Behat com
**77 cenários** em **20 arquivos de feature**, executados em todo push de CI na matriz completa
(Moodle 4.5 → 5.x, PostgreSQL e MariaDB).

### PHPUnit — Testes Unitários e de Integração

| Arquivo de teste | Casos | O que é coberto |
|-------------------|------:|------------------|
| `ai/chat_test.php` | 14 | Montagem do prompt de sistema do chat (inclui presets fornecidos, omite a seção quando nenhum é dado, tolera JSON de preset malformado, documenta os dois tipos de ação) e que uma resposta do modelo fora de JSON é limpa exatamente como o caminho JSON, nunca devolvida crua |
| `ai/generator_test.php` | 13 | O caminho seguro de "nenhuma IA configurada" em todo gerador e no `call_chat`; uma falha de provedor aparecendo como erro do próprio gerador (nunca como "não configurado"), com o detalhe cru fora da resposta; `generate_block` interpretando uma resposta do hub, rejeitando um tipo de bloco desconhecido e purificando marcação numa config genérica de IA (a regressão de mXSS via `<noscript>`); a mesma purificação para `generate_preset`; histórico de chat achatado em linhas rotuladas por papel; a lista de ícones permitidos aplicada de ponta a ponta via `generate_infographic_steps`/`generate_infographic` e testada diretamente por reflexão, inclusive um payload tentando escapar de um atributo de classe |
| `ai/provider_chain_test.php` | 12 | A cadeia local_aihub → core_ai: nada é tentado quando nenhum dos dois está disponível; um sucesso do hub é devolvido como está e registrado sob o componente deste plugin; uma falha do hub sem fallback para o core_ai mantém a mensagem de falha do próprio hub |
| `event/template_created_test.php` | 3 | O evento dispara com os dados corretos e pode ser acionado/observado; a string do nome resolve |
| `event/template_deleted_test.php` | 6 | A descrição inclui o nome do modelo quando fornecido e o omite quando não; o evento pode ser acionado/observado; a string do nome resolve |
| `external/chat_message_test.php` | 4 | Rejeição de convidado; checagem de capability; papéis de mensagem inválidos removidos do histórico; histórico cortado no máximo configurado; ausência de IA lança um `moodle_exception` limpo |
| `external/delete_template_test.php` | 8 | Um dono apaga o próprio modelo; outro usuário não consegue; um gestor apaga um modelo global mas não o privado de outro usuário; um gestor com papel só no curso é rejeitado no contexto real do curso (não num contexto de sistema fixo); a exclusão propaga para os favoritos e dispara `template_deleted`; apagar um modelo inexistente lança exceção |
| `external/export_templates_test.php` | 10 | Um professor exporta só os próprios modelos; um gestor exporta os próprios mais todos os globais; exportação por IDs explícitos devolve só os próprios e exclui os que não são; um gestor pode exportar um global por ID; a exportação nunca expõe modelos privados de outro usuário; um gestor com papel só no curso não consegue exportar globais; convidados são rejeitados |
| `external/generate_accordion_test.php`, `generate_block_test.php`, `generate_callout_test.php`, `generate_card_test.php`, `generate_infographic_test.php`, `generate_infographic_comparison_test.php`, `generate_infographic_features_test.php`, `generate_infographic_steps_test.php`, `generate_infographic_timeline_test.php`, `generate_preset_test.php`, `generate_resources_test.php` | 3 cada (36) | Os 12 web services de geração por IA compartilham o mesmo contrato: rejeição de convidado, checagem de capability e um `moodle_exception` limpo (nunca um erro cru) quando nenhuma fonte de IA está disponível |
| `external/get_templates_test.php` | 9 | "Meus" devolve só os próprios modelos do chamador e exclui os de outros; "globais" devolve só modelos globais; `isfavourite` reflete o estado real de favorito; "favoritos" devolve o conjunto correto e exclui o modelo privado de outro usuário alcançado por uma linha de favorito forjada; um gestor com papel só no curso nunca é marcado `ismine` para um modelo global; convidados são rejeitados |
| `external/import_templates_test.php` | 12 | Importar um ou vários modelos; um nome duplicado recebe sufixo numérico, resolvido sequencialmente em colisões repetidas; um professor não pode importar como global, um gestor do site pode, um gestor com papel só no curso não pode; a importação dispara um evento `template_created` por modelo |
| `external/save_template_test.php` | 8 | Um professor salva um modelo pessoal mas não consegue salvar um global; um gestor pode salvar um modelo global; salvar dispara `template_created`; convidados são rejeitados; um gestor com papel só no curso não consegue salvar um modelo global |
| `external/toggle_favourite_test.php` | 9 | Ativar cria um favorito, desativar remove, sem duplicatas; favoritar um modelo inexistente lança exceção; convidados são rejeitados; um modelo privado de outro usuário não pode ser favoritado, mas um global pode; um professor matriculado no curso pode usar o contexto real do curso e é rejeitado num contexto de sistema fixo |
| `hook_callbacks_test.php` | 2 | O módulo AMD do frontend do estudante é solicitado só em páginas de contexto de curso/módulo, e ignorado em qualquer outra |
| `plugininfo_test.php` | 15 | `is_enabled()` reflete a capability; a configuração devolvida repassa o ID de contexto real; `canmanageglobaltemplates` ignora uma concessão dessa capability só no curso; `hasai` segue a cadeia de provedores de ponta a ponta; o link "Minhas chaves de IA" da Central de IA só aparece quando as chaves pessoais estão habilitadas e o professor tem a capability; presets carregam para um idioma com arquivos reais, voltam vazios quando não existe nenhum, e caem para inglês quando o próprio diretório do idioma não existe; os botões e itens de menu disponíveis são declarados |
| `privacy/provider_test.php` | 18 | Descoberta de contexto para modelos, favoritos e um caso vazio; a exportação inclui modelos próprios; a exclusão remove dados pessoais preservando modelos globais, anonimizando a autoria tanto na exclusão de um usuário quanto em lote e para todos os usuários de um contexto; a listagem reversa de usuários por contexto; os metadados declaram só as duas tabelas próprias deste plugin (modelos e favoritos — nenhuma declaração de chave ou log de IA restou); tanto um contexto que não é de sistema quanto um caso sem dados não fazem nada em todo lugar onde são checados |
| `ai/generator_payload_test.php` | 24 | O modelo não é confiável: cada gerador interpreta o que ele devolve embrulhado em cercas de código, pela metade ou hostil — itens vazios descartados, HTML purificado, flags e padrões normalizados, campos de tipo errado (uma lista onde se espera texto, a string "false" como booleano) lidos com segurança; o schema do prompt oferece só o que os blocos aceitam |
| `ai_notice_test.php` | 1 | Cada uma das três abas de IA traz o aviso de que o texto vai para o provedor de IA do site |
| `alignment_test.php` | 8 | A classe de alinhamento que o professor escolhe (esquerda, centro, direita) está em cada um dos oito blocos que a aceitam e sobrevive ao limpador de HTML do Moodle |
| `card_template_test.php` | 8 | O template do cartão: o quadro de vídeo é nomeado por uma string de idioma (sem palavra fixa que o leitor de tela anunciaria em qualquer idioma); a posição da mídia e o detalhe lateral são classes, e não estilos inline que o limpador de HTML descartaria |
| `chart_templates_test.php` | 5 | Os templates de gráfico, de barras e de velocímetro não desenham SVG e sobrevivem ao limpador de HTML do Moodle (`clean_text()`) com todas as classes e larguras ou alturas; um rótulo é escapado uma vez |
| `db_definitions_test.php` | 3 | Os arquivos de definição de serviços web, cache e capabilities carregam e declaram o que o código usa |
| `db_upgrade_test.php` | 3 | O passo de upgrade que remove um índice que repete uma chave: dois índices iguais viram um, uma coluna sem nenhum recebe o índice da chave, um único índice é mantido |
| `editor_styles_test.php` | 2 | O tema serve a folha de estilo do editor do plugin, e `editor_styles.css` é uma cópia exata de `styles.css` |
| `event/event_mappings_test.php` | 1 | Todo evento que registra um objeto declara o próprio mapeamento de objectid para a restauração do curso |
| `external/generate_endpoints_test.php` | 5 | O que os serviços web de IA devolvem quando um provedor é alcançado: cada um devolve a estrutura declarada, uma exceção inesperada vira erro genérico, o chat devolve uma ação só quando há uma, descarta entradas de histórico com outros papéis e envia só o histórico mais recente |
| `generator_test.php` | 2 | O gerador de dados: um modelo pessoal pertence ao usuário informado e é listado só para ele |
| `interaction_classes_test.php` | 4 | O efeito de hover e o som de clique escolhidos pelo professor chegam à página como classes CSS (botão, cartão, destaque), e o script do frontend do estudante inicia para qualquer bloco |
| `presets_test.php` | 3 | Os layouts prontos: cada layout em inglês espelha o de português e não tem texto em português; um layout é feito só de blocos (nenhum título, botão, imagem ou caixa estilizada escrito à mão, as colunas de um grid têm blocos, e o título e a descrição de um grid são texto puro) |
| `templates_header_test.php` | 1 | Todo template abre com o comentário de licença e depois declara o nome em `@template` |
| `templates_text_test.php` | 2 | Nenhum title, aria-label, alt ou placeholder de um template tem uma palavra literal: são strings de idioma, então todo idioma as recebe |

```bash
vendor/bin/phpunit --testsuite tiny_studiolms_testsuite
```

Os testes de IA nunca chegam a um provedor real: o cliente da `local_aihub` é substituído por um
stub (`tests/fixtures/hub_stub_client.php`), e um site de teste recém-criado, sem chave na Central de
IA e sem provedor `core_ai`, é usado para exercitar o caminho "sem IA disponível".

### JavaScript — Testes sem navegador (`node --test`)

| Área | Arquivos | Casos | O que é coberto |
|------|---------:|------:|------------------|
| Blocos | 22 | 153 | O que os blocos desenham e como se comportam: os modelos de gráfico, barras e velocímetro, o limite de largura dos blocos que mostram pouco, as opções do acordeão e da webteca, o layout e a sombra do cartão, o título e a descrição do grid, os blocos dentro de uma coluna do grid, o texto digitado no canvas, cores e contraste (razões WCAG), pares de ícones, colunas do grid, o efeito de hover em todos os blocos, o emoji decorativo escondido |
| Segurança e limpeza | 10 | 41 | Segurança e limpeza de HTML: escape, saneamento de URLs e de configuração de IA, URLs de vídeo, blocos encontrados por classe onde o Moodle remove atributos, eventos do frontend, nenhum texto visível literal nas fontes AMD, nenhum utilitário exclusivo do Bootstrap 5, o CSS inline do editor |
| Modelos e biblioteca | 9 | 33 | Modelos e biblioteca: o cache de modelos, a importação de arquivo, o carregamento de um modelo no canvas em uma só etapa, o botão de exportar mostrando Exportar tudo ou Exportar selecionados (n), os campos de link empilhados do cartão de perfil, os textos de exemplo no idioma do site, a correspondência de presets e o aviso de idioma |
| Janela do Studio | 4 | 30 | A janela do Studio: a divisão da barra lateral e sua geometria, a aba ativa, o portão da política de uso de IA |
| **Total** | **45** | **257** | |

Estes rodam sem navegador nem Moodle: os módulos importados pelos testes não importam nada, e um teste que precisa do `app.js` ou de um template lê o arquivo-fonte.

```bash
node --test tests/js/*.test.js
```

### Behat — Testes de Aceitação

| Arquivo de feature | Cenários | O que é coberto |
|----------------------|---------:|------------------|
| `manage_templates.feature` | 4 | O botão da barra é visível para um professor e para um gestor; a troca entre abas funciona; todas as abas existem no diálogo |
| `save_template.feature` | 4 | Abrir o diálogo; todos os botões de aba obrigatórios estão presentes; clicar em "Meus modelos" a ativa; a grade da biblioteca renderiza após clicar numa aba |
| `favourite_template.feature` | 4 | O botão da aba Favoritos existe; clicar nele a ativa; a grade da biblioteca renderiza; sair e voltar para Componentes a reativa corretamente |
| `import_export.feature` | 4 | Os botões Exportar, Importar e Salvar como modelo estão presentes em "Meus modelos", cada um e os três juntos |
| `global_template_sanitization.feature` | 1 | Carregar um modelo global malicioso no canvas não executa o payload (o caso clássico `<img onerror>`) |
| `callout_state_sanitization.feature` | 1 | Marcação digitada no campo de ícone do destaque nunca renderiza como elemento na pré-visualização |
| `state_restore_sanitization.feature` | 1 | Carregar um modelo cujo bloco não tem filho DOM correspondente para seu campo rico não cai para executar o payload de estado controlado pelo atacante |
| `animation_payload_sanitization.feature` | 1 | Um manipulador disparado por animação (`onanimationstart`) numa tag `<p>` — que o próprio schema do TinyMCE manteria intacto — não executa |
| `url_scheme_sanitization.feature` | 1 | Um modelo com URLs de script ofuscadas por caractere de tabulação, caractere de controle no início e `xlink:href`/`<set>` de SVG mantém só o único link `https` seguro |
| `noscript_payload_sanitization.feature` | 1 | Um payload escondido dentro de um comentário HTML envolto em `<noscript>` — inerte enquanto o sanitizador o analisa com scripting desativado, vivo quando a página real o analisa — não executa |
| `ai_tabs_unavailable.feature` | 4 | Cada aba de IA mostra o aviso de "nenhuma IA disponível" em vez de um formulário que nunca produziria nada; as outras abas continuam funcionando |
| `block_payload_sanitization.feature` | 2 | Marcação digitada nas configurações de qualquer bloco nunca roda na pré-visualização, e um modelo hostil de qualquer bloco não executa nada ao ser carregado |
| `button_link_guard.feature` | 2 | Clicar no texto de um botão de ação no editor não segue o link, e as ferramentas de link não o removem |
| `clear_canvas.feature` | 3 | O botão Limpar canvas aparece só com dois ou mais blocos; confirmar remove todos, cancelar os mantém |
| `icon_picker.feature` | 1 | Escape fecha o seletor de ícones, mas mantém o compositor e seus blocos |
| `insert_blocks.feature` | 26 | Cada um dos 17 blocos pode ser adicionado ao canvas, inserido na página e lido de volta; todo bloco abre painéis de configurações com campos editáveis; um bloco novo mostra os textos de exemplo no idioma do site |
| `student_view.feature` | 3 | Os blocos salvos pelo professor chegam ao estudante sem atributos de edição; o estudante pode abrir e fechar um acordeão e recolher e reabrir a lista de materiais |
| `template_lifecycle.feature` | 9 | Salvar um modelo e vê-lo em Meus modelos; salvá-lo como modelo do site; Meus modelos lista só os do professor; os layouts prontos têm uma aba própria; os modelos do site aparecem para um professor que não pode apagá-los; favoritar e desfavoritar; apagar após confirmação; carregar no canvas e inserir |
| `text_blocks_view.feature` | 1 | Uma página com só um título e um botão não carrega atributos de edição |
| `toolbar_capability.feature` | 4 | O botão do StudioLMS segue `tiny/studiolms:use` no curso: presente com a capability, ausente para estudante, perdido onde negada, e não escondido em outro curso |

```bash
php admin/tool/behat/cli/init.php
vendor/bin/behat --tags=@tiny_studiolms --profile=chrome
```

Sete dos vinte arquivos de feature são testes de regressão de segurança, um para cada correção
produzida por duas rodadas de auditoria de segurança contra este plugin — veja
[Segurança e Conformidade](/pt.html#security) para o que cada um protege.
