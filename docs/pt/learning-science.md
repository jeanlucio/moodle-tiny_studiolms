# 🔬 Fundamentos em Ciência da Aprendizagem

Os blocos do StudioLMS não são cosméticos — cada um tem base em teorias consolidadas de ciência da aprendizagem.

**Teoria da Aprendizagem Multimídia — Richard Mayer (2001)**
Os 12 princípios de Mayer descrevem como o cérebro processa informação multimídia. Os blocos do StudioLMS e o gerador de IA implementam sete deles:

| Princípio de Mayer | Bloco do StudioLMS / Comportamento da IA |
|---|---|
| Signaling — destacar informação essencial | `Callout` |
| Segmenting — dividir conteúdo em partes gerenciáveis | `Card`, `Grid de Cards` |
| Spatial contiguity — texto e visual lado a lado | `Infográfico`, `Passos` |
| Coherence — eliminar material irrelevante | A estrutura visual força curadoria do conteúdo |
| Redundancy — substituir texto descritivo por visual | Infográfico em lugar de parágrafos |
| Pre-training — apresentar conceitos-chave antes do conteúdo denso | Use um `Callout` com os termos essenciais no início de cada seção; o `local_studiolms` faz isso automaticamente |
| Personalization — linguagem conversacional retém mais que linguagem formal | O gerador de IA é instruído a escrever em tom conversacional, não acadêmico |

**Teoria da Carga Cognitiva — John Sweller (1988)**
O cérebro tem capacidade limitada de processamento. A organização visual (cards, grids, steps) reduz a *carga estranha* — o esforço mental gasto decodificando a estrutura — liberando capacidade para a *carga germânica*: o aprendizado real e a formação de esquemas mentais.

**Teoria da Codificação Dual — Allan Paivio (1971)**
O cérebro processa informação por dois canais independentes: verbal (texto) e visual (imagens, diagramas). Acionar os dois simultaneamente cria representações mentais mais fortes e mais fáceis de recuperar. Os gráficos, infográficos, gauges e mapas mentais do StudioLMS acionam o canal visual enquanto o texto complementa pelo canal verbal.

**Universal Design for Learning — CAST (2002)**
O UDL exige oferecer *múltiplas formas de representação* do mesmo conteúdo para atender diferentes perfis cognitivos. O StudioLMS permite apresentar o mesmo conceito como texto, visual, tabela ou diagrama — ampliando a acessibilidade para diferentes estilos de aprendizagem.

**Information Mapping — Robert Horn (décadas de 1970)**
Horn categorizou a informação em tipos estruturais (procedimento, processo, conceito, fato, estrutura), cada um com um formato de apresentação ideal. Os blocos do StudioLMS mapeiam diretamente esses tipos:

| Tipo de informação (Horn) | Bloco do StudioLMS |
|---|---|
| Procedimento | Infográfico — Passos |
| Processo cronológico | Infográfico — Linha do Tempo |
| Comparação de conceitos | Infográfico — Comparação |
| Fatos quantitativos | Infográfico — Stats, Gráfico de Barras/Pizza, Gauge |
| Estrutura hierárquica | Mapa Mental |
| Conjunto de itens relacionados | Grid de Cards |
| Informação crítica | Callout |
