# 🔬 Learning Science Foundations

StudioLMS blocks are not cosmetic — each one is grounded in established learning science research.

**Multimedia Learning Theory — Richard Mayer (2001)**
Mayer's 12 principles describe how the brain processes multimedia information. StudioLMS blocks and its AI generator implement seven of them:

| Mayer's Principle | StudioLMS Block / AI Behaviour |
|---|---|
| Signalling — highlight essential information | `Callout` |
| Segmenting — break content into manageable chunks | `Card`, `Grid Cards` |
| Spatial contiguity — text and visuals side by side | `Infographic`, `Steps` |
| Coherence — remove irrelevant material | Visual structure forces content curation |
| Redundancy — replace descriptive text with visuals | Infographic instead of plain paragraphs |
| Pre-training — present key concepts before dense content | Place a `Callout` with key terms at the top of each section; `local_studiolms` does this automatically |
| Personalization — conversational style improves retention over formal style | The AI generator is prompted to write in conversational, not academic, language |

**Cognitive Load Theory — John Sweller (1988)**
The brain has limited processing capacity. Visual organisation (cards, grids, steps) reduces *extraneous* cognitive load — the mental effort spent decoding structure — freeing up capacity for *germane* load: actual learning and schema formation.

**Dual Coding Theory — Allan Paivio (1971)**
The brain processes information through two independent channels: verbal (text) and visual (images, diagrams). Activating both simultaneously creates stronger, more retrievable mental representations. StudioLMS charts, infographics, gauges and mind maps engage the visual channel while text complements through the verbal channel.

**Universal Design for Learning — CAST (2002)**
UDL requires offering *multiple means of representation* of the same content to serve diverse cognitive profiles. StudioLMS allows the same concept to be presented as text, visual, table or diagram — expanding accessibility across learning styles.

**Information Mapping — Robert Horn (1970s)**
Horn categorised information into structural types (procedure, process, concept, fact, structure), each with an optimal presentation format. StudioLMS blocks map directly to these types:

| Information Type (Horn) | StudioLMS Block |
|---|---|
| Procedure | Infographic — Steps |
| Chronological process | Infographic — Timeline |
| Concept comparison | Infographic — Comparison |
| Quantitative facts | Infographic — Stats, Bar/Pie Chart, Gauge |
| Hierarchical structure | Mind Map |
| Related item set | Grid Cards |
| Critical information | Callout |
