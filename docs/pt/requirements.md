# 📦 Requisitos

| Componente | Versão |
|------------|--------|
| Moodle     | 4.5 – 5.3 |
| PHP        | 8.1+   |

**Opcional, só para os recursos de IA:** a [Central de IA](https://github.com/jeanlucio/moodle-local_aihub)
(`local_aihub`) com uma chave de API, ou pelo menos um provedor de geração de texto habilitado em
**Administração do site → IA → Provedores de IA**. Sem nenhum dos dois, todo o resto do plugin
funciona normalmente e as abas de IA mostram um aviso curto no lugar do gerador.

**Opcional, para a saudação em quatro modelos prontos:** os modelos *Boas-vindas ao curso*, *Fórum avaliativo com rubrica* e
*Encontros síncronos* (petróleo e verde) cumprimentam o estudante com `[firstname]`, um atalho do plugin
[Filter Shortcodes](https://github.com/branchup/moodle-filter_shortcodes) (`filter_shortcodes`) que vira o primeiro nome de
quem lê a página. O plugin não depende dele. Num site sem esse filtro o estudante leria o texto `[firstname]` como está, então
troque por um nome ou apague, como faria com qualquer outro texto entre colchetes de um modelo. O editor sempre mostra o
atalho como texto simples, porque os filtros só agem na página publicada.
