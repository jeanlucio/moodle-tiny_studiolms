# 🤖 IA e Serviços de Terceiros

O StudioLMS inclui criação assistida por IA opcional. O professor descreve o que quer em
linguagem natural e recebe blocos ou layouts inteiros prontos para revisar e inserir.

### O recurso de IA é obrigatório?

Não. Todo bloco pode ser montado e configurado manualmente pelos formulários padrão; a IA é uma
ferramenta de produtividade, nunca uma exigência.

### De onde vem a IA

O StudioLMS não conversa com nenhum provedor de IA diretamente e não tem configuração de chaves.
Cada requisição segue, nesta ordem, para:

| Ordem | Fonte |
|------|--------|
| 1 | **Central de IA (`local_aihub`)** — plugin complementar opcional. Resolve primeiro a chave pessoal do professor, depois a chave do site (Google Gemini, Groq, DeepSeek ou qualquer endpoint compatível com OpenAI), e registra o uso por plugin. |
| 2 | **Moodle AI (`core_ai`)** — o subsistema nativo, usado quando a Central não está instalada ou não consegue atender. Roda no contexto real do curso ou atividade e respeita "Permitir ferramentas de IA para este curso" nas versões do Moodle que têm essa opção. |

Quando nenhuma das duas está disponível, as abas de IA mostram um aviso curto no lugar do gerador.
Se a Central de IA estiver instalada e com chaves pessoais habilitadas, o aviso leva o professor
para **Central de IA → Minhas chaves de IA** (abrindo em nova aba, para não perder o trabalho no
canvas).

As chaves são configuradas na Central de IA (**Administração do site → Plugins → Plugins locais →
Central de IA**, ou na página **Minhas chaves de IA** de cada professor) ou em **Administração do
site → IA → Provedores de IA** para o `core_ai`. Os serviços externos seguem seus próprios termos de
uso e políticas de privacidade.

### Transmissão de dados

Quando a IA é usada, o prompt ou mensagem de chat do professor é entregue à Central de IA ou ao
`core_ai`, que o enviam ao provedor resolvido. Ambos declaram esses provedores nos próprios
metadados da Privacy API e mantêm seus próprios registros de uso.

O StudioLMS em si:

* não armazena prompts, respostas da IA nem chaves de API;
* armazena só o conteúdo que o professor escolhe inserir ou salvar como template;
* não envia nada a lugar nenhum a menos que o professor use explicitamente um recurso de IA.
