# 🛠️ Instalação

1. Baixe o arquivo `.zip` ou clone este repositório.
2. Extraia na pasta `lib/editor/tiny/plugins/` do seu Moodle.
3. Renomeie para `studiolms` (se necessário).
   Caminho final:
   `seu-moodle/lib/editor/tiny/plugins/studiolms/`
4. Acesse **Administração do site > Notificações** para concluir a instalação.
5. O botão **StudioLMS** aparece na barra do TinyMCE (e em **Ferramentas**) para quem tem
   `tiny/studiolms:use` no contexto da página — professores, professores sem edição e gestores por
   padrão. Gerenciar **Modelos do site** exige `tiny/studiolms:manageglobaltemplates`, concedida
   a gestores no nível do site por padrão.
6. Opcional: em **Administração do site > Plugins > Editores de texto > Editor TinyMCE > StudioLMS** o
   administrador pode desligar **Mostrar os modelos prontos**. A aba **Modelos prontos** some do diálogo;
   os modelos do site e os modelos de cada professor não são afetados. Vem ligada por padrão.
