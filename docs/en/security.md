# 🔐 Security & Compliance

### Access control

* Two capabilities: `tiny/studiolms:use` (the toolbar button and every web service, checked in the
  real course or activity context the editor is open in) and `tiny/studiolms:manageglobaltemplates`
  (Official Templates, declared with `RISK_XSS | RISK_CONFIG` and always checked at site level, so a
  manager delegated only in one course or category cannot publish, export or delete institutional
  templates).
* Ownership and visibility are verified server-side on every template operation: a private template
  can only be read, favourited, exported or deleted by its owner, including through forged
  favourite rows.
* Every state-changing call is a Moodle external function with session-key protection.

### Untrusted content

Templates must keep the plugin's own `data-slms-*` attributes, which Moodle's HTML filter would
remove, so the plugin sanitises them itself before anything reaches the editor preview:

* **Stored templates** are filtered in the browser before loading: event-handler attributes,
  script-capable elements, raw-text and template elements (such as `<noscript>`) and HTML comments
  are removed; URL attributes keep only `http`, `https`, `mailto`, `tel` or relative URLs; and the
  result is re-sanitised until it stops changing.
* **Saved block settings** (`data-slms-state`) are decoded against each block's own schema: unknown
  keys are dropped, types are enforced, rich-text fields are re-read from the content rather than
  trusted from the state, and URL and link-target fields are validated.
* **AI output** is treated as untrusted input on the server: the dedicated generators clean every
  field individually, generic block and layout configurations are passed through Moodle's
  HTMLPurifier, generated icons are restricted to a fixed list, and chat replies are reduced to
  plain text.
* The editor preview keeps its links and buttons out of the keyboard tab order, and students always
  see the final content through Moodle's standard output filtering.

### AI

* No API keys are stored and no HTTP request is made to an AI provider by this plugin — see
  [AI & Third-party Services](#ai).

### Privacy API

Full implementation covering both storage tables (templates and favourites): context discovery,
export, and deletion for individual and bulk requests. Official Templates are institutional content
other teachers rely on, so on a deletion request they are kept but anonymised (their author and
last-modifier are cleared) instead of deleted.
