# 🔗 Integrations

StudioLMS Editor works on its own. The other two plugins of the [StudioLMS family](https://jeanlucio.github.io/studiolms/) build on it, and it recognises them when they are there. Every link is **soft**: nothing is required, and there are no hard `$plugin->dependencies`.

| Plugin | What it does with the editor |
|---|---|
| [`local_studiolms`](https://jeanlucio.github.io/moodle-local_studiolms/) (StudioLMS Course Builder) | Builds course content with AI **out of the blocks and the ready-made layouts of this editor**: the pages it generates are made of the same blocks, and the page it restyles from a text you wrote becomes blocks too. Every block keeps its settings inside the content, so you open the page in the editor and adjust it like one you built by hand. Without this editor the pages it writes are clean semantic HTML, and a restyle cannot be reopened as blocks |
| [`filter_studiolms`](https://jeanlucio.github.io/moodle-filter_studiolms/) (StudioLMS Widgets) | Adds the **Widgets** tab to the dialog, with a card for each widget of the filter: forum participation, course map and quiz rules. A card only writes the marker (`[FORUMSTATS]`, `[COURSEMAP]` or `[QUIZINFO]`) as a block; the filter draws the widget with live data when the page is shown. The tab appears only when the filter is installed and has a widget on, a widget turned off by the administrator leaves the tab, and a warning is shown when the filter is not active in the course |
| [`local_aihub`](https://github.com/jeanlucio/moodle-local_aihub) (AI Hub) | The first source of the AI tabs (personal and site keys). See [AI & Third-party Services](#ai) |

The editor also works with `filter_shortcodes`, a third-party filter, for the greeting in four ready-made layouts (see [Requirements](#requirements)).
