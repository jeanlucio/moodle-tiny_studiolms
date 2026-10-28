# 🔬 Learning Science Foundations

StudioLMS blocks are not cosmetic — each one is grounded in established learning science research.

**Multimedia Learning Theory — Richard Mayer (2001)**
Mayer's 12 principles describe how the brain processes multimedia information. StudioLMS blocks and its AI generator implement seven of them:

| Mayer's Principle | StudioLMS Block / AI Behaviour |
|---|---|
| Signalling — highlight essential information | `Callout`; the **current step** of `Steps`, with the earlier steps shown as done and the later ones dimmed |
| Segmenting — break content into manageable chunks | `Card`, `Grid Cards`, `Accordion`, and `Tabs`, which show one panel at a time |
| Spatial contiguity — text and visuals side by side | `Infographic`, `Steps` |
| Coherence — remove irrelevant material | Visual structure forces content curation |
| Redundancy — replace descriptive text with visuals | Infographic instead of plain paragraphs |
| Pre-training — present key concepts before dense content | Place a `Callout` with key terms at the top of each section; the *Module Start* layout opens with the learning objectives before any detail, and [`local_studiolms`](https://github.com/jeanlucio/moodle-local_studiolms), the AI course builder of the same family, puts a *Key concepts* callout at the top of every page it builds |
| Personalization — conversational style improves retention over formal style | The AI generator is prompted to write in conversational, not academic, language; the welcome layouts greet the student in the first person |

**Cognitive Load Theory — John Sweller (1988)**
The brain has limited processing capacity. Visual organisation (cards, grids, steps, tabs) reduces *extraneous* cognitive load — the mental effort spent decoding structure — freeing up capacity for *germane* load: actual learning and schema formation. `Tabs` and `Accordion` go one step further: a page with a lot of parallel material shows one panel at a time instead of all of it at once.

**Dual Coding Theory — Allan Paivio (1971)**
The brain processes information through two independent channels: verbal (text) and visual (images, diagrams). Activating both simultaneously creates stronger, more retrievable mental representations. StudioLMS charts, infographics and gauges engage the visual channel while text complements through the verbal channel.

**Advance Organizers — David Ausubel (1960)**
Presenting a short, general framework *before* the detailed material gives the learner something to attach it to. The *Course Map* layout does this with a "You are here" steps block that marks the current stage of the course, and *Module Start* places the learning objectives ahead of the content.

**Social Presence — Community of Inquiry, Garrison, Anderson & Archer (2000)**
In online courses, learners engage more when the people behind the course are visible. The `Profile Card` block and the *Course Team*, *Teacher Contacts* and *Course Welcome* layouts put a face, a role and a way to get in touch at the start of the course.

**Universal Design for Learning — CAST (2002)**
UDL requires offering *multiple means of representation* of the same content to serve diverse cognitive profiles. StudioLMS allows the same concept to be presented as text, visual, table or diagram — expanding accessibility across learning styles.

**Information Mapping — Robert Horn (1970s)**
Horn categorised information into structural types (procedure, process, concept, fact, structure), each with an optimal presentation format. StudioLMS blocks map directly to these types:

| Information Type (Horn) | StudioLMS Block |
|---|---|
| Procedure | Infographic — Steps |
| Chronological process | Infographic — Timeline |
| Concept comparison | Infographic — Comparison |
| Quantitative facts | Infographic — Stats, Bar/Composition Chart, Gauge |
| Hierarchical structure | Accordion, Infographic Steps |
| Parallel alternatives or categories | Tabs |
| Reference material (files, videos, links) | Resources |
| A person and their role | Profile Card |
| Connecting prose between blocks | Text Box |
| Related item set | Grid Cards |
| Critical information | Callout |
