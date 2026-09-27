# 🔐 Segurança e Conformidade

### Controle de acesso

* Duas capabilities: `tiny/studiolms:use` (o botão da barra e todo web service, checada no contexto
  real de curso ou atividade em que o editor está aberto) e `tiny/studiolms:manageglobaltemplates`
  (Templates Oficiais, declarada com `RISK_XSS | RISK_CONFIG` e sempre checada no nível do sistema,
  então um gestor delegado só num curso ou categoria não consegue publicar, exportar nem apagar
  templates institucionais).
* Ownership e visibilidade são verificados no servidor em toda operação de template: um template
  privado só pode ser lido, favoritado, exportado ou apagado pelo dono, mesmo diante de uma linha de
  favorito forjada.
* Toda chamada que altera estado é uma função externa do Moodle protegida por sesskey.

### Conteúdo não confiável

Templates precisam manter os atributos próprios do plugin (`data-slms-*`), que o filtro de HTML do
Moodle removeria, então o plugin os sanitiza por conta própria antes de qualquer coisa chegar à
pré-visualização do editor:

* **Templates salvos** são filtrados no navegador antes de carregar: atributos de manipulador de
  evento, elementos capazes de script, elementos de texto bruto e de template (como `<noscript>`) e
  comentários HTML são removidos; atributos de URL mantêm só `http`, `https`, `mailto`, `tel` ou URL
  relativa; e o resultado é sanitizado de novo até parar de mudar.
* **Configurações de bloco salvas** (`data-slms-state`) são decodificadas contra o próprio schema de
  cada bloco: chaves desconhecidas são descartadas, tipos são impostos, campos de texto rico são
  relidos do conteúdo em vez de confiados a partir do estado, e campos de URL e de destino de link
  são validados.
* **Saída de IA** é tratada como entrada não confiável no servidor: os geradores dedicados limpam
  cada campo individualmente, configurações genéricas de bloco e layout passam pelo HTMLPurifier do
  Moodle, ícones gerados ficam restritos a uma lista fixa, e respostas do chat são reduzidas a texto
  puro.
* A pré-visualização do editor mantém seus links e botões fora da navegação por teclado, e o
  estudante sempre vê o conteúdo final pela filtragem de saída padrão do Moodle.

### IA

* Nenhuma chave de API é armazenada e nenhuma requisição HTTP a provedor de IA é feita por este
  plugin — veja [IA e Serviços de Terceiros](#ai).

### Privacy API

Implementação completa cobrindo as duas tabelas de armazenamento (templates e favoritos): descoberta
de contexto, exportação e exclusão para solicitações individuais e em lote. Templates Oficiais são
conteúdo institucional do qual outros professores dependem, então numa solicitação de exclusão eles
são mantidos, mas anonimizados (autor e último modificador são zerados) em vez de apagados.
