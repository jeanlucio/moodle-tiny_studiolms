# Ready-made layouts

One folder per language, one JSON file per layout: `presets/en` and `presets/pt_br`.

**This is a design decision, not an omission.** A layout is HTML with inline styles and block settings. It does
not belong in a language string, and splitting each layout into hundreds of translatable fragments would make it
impossible to read, review or edit as a whole.

- A language with no folder of its own gets the English layouts. The teacher is told once, with a notice in the
  Site Templates tab, that they can load a layout, write the text in their own language and keep it with
  "Save as template"; the saved template then lives in "My templates" in any language.
- To add a language, copy `presets/en` to `presets/<language code>` and translate the text. Keep the block types
  and the setting keys as they are: `tests/presets_test.php` checks that every language mirrors the Portuguese one.
- Moving the text to language strings, so that AMOS could translate it, is a possible future step, to be taken if
  translators ask for it.

## A layout is made of blocks only

Every layout is a list of blocks of the plugin with their settings (`type` and `config`). The text fields of a
block (a callout's content, a card's text) hold ordinary text with `<strong>`, lists and links, never a styled
heading, a button drawn as a link, a flex layout, an image or a box with a border or a background: those exist as
blocks (a heading, an action button, a profile card, a grid), and a hand-made copy cannot be changed with the
block's settings. The columns of a grid hold blocks too: their HTML is what the Studio writes when a block is
added to a column. `tests/presets_test.php` fails when a layout breaks this.
