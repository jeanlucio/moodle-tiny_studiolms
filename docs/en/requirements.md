# 📦 Requirements

| Component | Version |
|-----------|---------|
| Moodle    | 4.5 – 5.3 |
| PHP       | 8.1+    |

**Optional, for the AI features only:** the [AI Hub](https://github.com/jeanlucio/moodle-local_aihub)
(`local_aihub`) with an API key, or at least one text-generation provider enabled under
**Site administration → AI → AI providers**. Without either, every non-AI feature works normally and
the AI tabs show a short notice instead of the generator.

**Optional, for the greeting in four ready-made layouts:** the *Course Welcome*, *Graded Forum with Rubric* and
*Live Sessions* (teal and green) layouts greet the student with `[firstname]`, a shortcode of the
[Filter Shortcodes](https://github.com/branchup/moodle-filter_shortcodes) plugin (`filter_shortcodes`) that is replaced by the
first name of whoever reads the page. The plugin does not depend on it. On a site without that filter the student would read
the text `[firstname]` as it is, so replace it with a name or delete it, as you would any other bracketed text of a layout.
The editor always shows the shortcode as plain text, because filters only act on the published page.
