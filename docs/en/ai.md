# 🤖 AI & Third-party Services

StudioLMS includes optional AI-assisted authoring. Teachers describe what they want in plain
language and get blocks or whole layouts ready to review and insert.

### Is the AI feature required?

No. Every block can be built and configured by hand through the standard forms; the AI is a
productivity aid, never a requirement.

### Where the AI comes from

StudioLMS does not talk to any AI provider itself and has no key settings. Every request goes, in
order, to:

| Order | Source |
|------|--------|
| 1 | **AI Hub (`local_aihub`)** — optional companion plugin. Resolves the teacher's personal key first, then the site key (Google Gemini, Groq, DeepSeek or any OpenAI-compatible endpoint), and logs usage per plugin. |
| 2 | **Moodle AI (`core_ai`)** — the built-in subsystem, used when the hub is not installed or cannot serve the request. It runs in the real course or activity context and respects "Allow AI tools for this course" on the Moodle versions that have that setting. |

When neither is available, the AI tabs show a short notice instead of the generator. If the AI Hub
is installed and personal keys are enabled there, the notice links the teacher to **AI Hub → My AI
keys** (opening in a new tab, so the work on the canvas is not lost).

Keys are configured in the AI Hub (**Site administration → Plugins → Local plugins → AI Hub**, or
each teacher's **My AI keys** page) or under **Site administration → AI → AI providers** for
`core_ai`. External services operate under their own terms of service and privacy policies.

### Data transmission

When the AI is used, the teacher's prompt or chat message is handed to the AI Hub or `core_ai`,
which sends it to the provider they resolve. Both declare those providers in their own Privacy API
metadata and keep their own usage records.

StudioLMS itself:

* does not store prompts, AI responses or API keys;
* stores only the content the teacher chooses to insert or save as a template;
* sends nothing anywhere unless the teacher explicitly uses an AI feature.
