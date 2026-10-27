# 🔬 Fundamentos em Ciência da Aprendizagem

Os blocos do StudioLMS não são cosméticos — cada um tem base em teorias consolidadas de ciência da aprendizagem.

**Teoria da Aprendizagem Multimídia — Richard Mayer (2001)**
Os 12 princípios de Mayer descrevem como o cérebro processa informação multimídia. Os blocos do StudioLMS e o gerador de IA implementam sete deles:

| Princípio de Mayer | Bloco do StudioLMS / Comportamento da IA |
|---|---|
| Signaling — destacar informação essencial | `Callout`; a **etapa atual** de `Passos`, com as anteriores marcadas como concluídas e as seguintes esmaecidas |
| Segmenting — dividir conteúdo em partes gerenciáveis | `Card`, `Grid de Cards`, `Accordion` e `Abas`, que mostram um painel de cada vez |
| Spatial contiguity — texto e visual lado a lado | `Infográfico`, `Passos` |
| Coherence — eliminar material irrelevante | A estrutura visual força curadoria do conteúdo |
| Redundancy — substituir texto descritivo por visual | Infográfico em lugar de parágrafos |
| Pre-training — apresentar conceitos-chave antes do conteúdo denso | Use um `Callout` com os termos essenciais no início de cada seção; o modelo *Início de módulo* abre com os objetivos de aprendizagem antes de qualquer detalhe |
| Personalization — linguagem conversacional retém mais que linguagem formal | O gerador de IA é instruído a escrever em tom conversacional, não acadêmico; os modelos de boas-vindas cumprimentam o estudante em primeira pessoa |

**Teoria da Carga Cognitiva — John Sweller (1988)**
O cérebro tem capacidade limitada de processamento. A organização visual (cards, grids, passos, abas) reduz a *carga estranha* — o esforço mental gasto decodificando a estrutura — liberando capacidade para a *carga germânica*: o aprendizado real e a formação de esquemas mentais. `Abas` e `Accordion` vão um passo além: uma página com muito material paralelo mostra um painel de cada vez, e não tudo de uma só vez.

**Teoria da Codificação Dual — Allan Paivio (1971)**
O cérebro processa informação por dois canais independentes: verbal (texto) e visual (imagens, diagramas). Acionar os dois simultaneamente cria representações mentais mais fortes e mais fáceis de recuperar. Os gráficos, infográficos e velocímetros do StudioLMS acionam o canal visual enquanto o texto complementa pelo canal verbal.

**Organizadores Prévios — David Ausubel (1960)**
Apresentar uma estrutura curta e geral *antes* do conteúdo detalhado dá ao estudante onde ancorá-lo. O modelo *Mapa do curso* faz isso com um bloco de passos "Você está aqui" que marca a etapa atual do curso, e o *Início de módulo* coloca os objetivos de aprendizagem antes do conteúdo.

**Presença Social — Comunidade de Investigação, Garrison, Anderson e Archer (2000)**
Em cursos online, os estudantes se engajam mais quando as pessoas por trás do curso estão visíveis. O bloco `Cartão de Perfil` e os modelos *Equipe do curso*, *Contatos do professor* e *Boas-vindas ao curso* colocam um rosto, um papel e um jeito de falar com a equipe logo no começo do curso.

**Universal Design for Learning — CAST (2002)**
O UDL exige oferecer *múltiplas formas de representação* do mesmo conteúdo para atender diferentes perfis cognitivos. O StudioLMS permite apresentar o mesmo conceito como texto, visual, tabela ou diagrama — ampliando a acessibilidade para diferentes estilos de aprendizagem.

**Information Mapping — Robert Horn (décadas de 1970)**
Horn categorizou a informação em tipos estruturais (procedimento, processo, conceito, fato, estrutura), cada um com um formato de apresentação ideal. Os blocos do StudioLMS mapeiam diretamente esses tipos:

| Tipo de informação (Horn) | Bloco do StudioLMS |
|---|---|
| Procedimento | Infográfico — Passos |
| Processo cronológico | Infográfico — Linha do Tempo |
| Comparação de conceitos | Infográfico — Comparação |
| Fatos quantitativos | Infográfico — Stats, Gráfico de Barras/Composição, Gauge |
| Estrutura hierárquica | Accordion, Infográfico de Passos |
| Alternativas ou categorias paralelas | Abas |
| Material de consulta (arquivos, vídeos, links) | Webteca |
| Uma pessoa e o seu papel | Cartão de Perfil |
| Texto de ligação entre blocos | Caixa de texto |
| Conjunto de itens relacionados | Grid de Cards |
| Informação crítica | Callout |
