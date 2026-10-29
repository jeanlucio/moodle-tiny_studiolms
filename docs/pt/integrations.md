# 🔗 Integrações

O StudioLMS Editor funciona sozinho. Os outros dois plugins da [família StudioLMS](https://jeanlucio.github.io/studiolms/) se apoiam nele, e ele os reconhece quando estão presentes. Todo vínculo é **suave**: nada é obrigatório e não há `$plugin->dependencies` rígidas.

| Plugin | O que faz com o editor |
|---|---|
| [`local_studiolms`](https://jeanlucio.github.io/moodle-local_studiolms/) (StudioLMS Course Builder) | Monta conteúdo de curso com IA **a partir dos blocos e dos modelos prontos deste editor**: as páginas que ele gera são feitas dos mesmos blocos, e a página que ele estiliza a partir de um texto seu também vira blocos. Cada bloco guarda suas configurações dentro do conteúdo, então você abre a página no editor e ajusta como uma que montou à mão. Sem este editor as páginas que ele escreve são HTML semântico limpo, e uma estilização não pode ser reaberta como blocos |
| [`filter_studiolms`](https://jeanlucio.github.io/moodle-filter_studiolms/pt.html) (StudioLMS Widgets) | Acrescenta ao diálogo a aba **Widgets**, com um cartão para cada widget do filtro: participação do fórum, mapa do curso e regras do questionário. O cartão só escreve a marca (`[FORUMSTATS]`, `[COURSEMAP]` ou `[QUIZINFO]`) como um bloco; o filtro desenha o widget com dados ao vivo quando a página é exibida. A aba só aparece com o filtro instalado e com um widget ligado, um widget desligado pelo administrador sai da aba, e um aviso é mostrado quando o filtro não está ativo no curso |
| [`local_aihub`](https://github.com/jeanlucio/moodle-local_aihub) (Central de IA) | A primeira fonte das abas de IA (chaves pessoais e do site). Veja [IA e Serviços de Terceiros](#ai) |

O editor também funciona com o `filter_shortcodes`, um filtro de terceiros, para a saudação de quatro modelos prontos (veja [Requisitos](#requirements)).
