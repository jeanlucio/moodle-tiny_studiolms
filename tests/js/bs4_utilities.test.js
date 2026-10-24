// This file is part of Moodle - https://moodle.org/
//
// Moodle is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// Moodle is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with Moodle.  If not, see <https://www.gnu.org/licenses/>.

/**
 * Guard test for the Bootstrap 5 utilities of the composer, run via `node --test`.
 *
 * Regression test: the composer used gap-1, gap-2 and form-select, which Bootstrap 4, the theme of Moodle 4.5
 * that the plugin declares to support, does not have: the save form, the footer buttons, the toolbar and the
 * chat field were drawn with no space between them and the selects of the settings panels without the theme's
 * look. The stylesheet now defines them without specificity, so Bootstrap 5 keeps using its own.
 *
 * @package    tiny_studiolms
 * @copyright  2026 Jean Lúcio
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.dirname(require.resolve('../../amd/src/app.js')) + '/..';
const read = (file) => fs.readFileSync(path.join(root, '..', file), 'utf8');

/** Every file of a folder that can carry class names. */
const sources = (dir) => fs.readdirSync(path.join(root, '..', dir), {recursive: true, withFileTypes: true})
    .filter((entry) => entry.isFile() && /\.(js|mustache)$/.test(entry.name))
    .map((entry) => path.join(entry.parentPath ?? entry.path, entry.name));

test('every gap-N the composer uses is defined for Bootstrap 4', () => {
    const used = new Set();
    for (const file of [...sources('amd/src'), ...sources('templates')]) {
        for (const match of fs.readFileSync(file, 'utf8').matchAll(/(?<![\w-])gap-(\d)\b/g)) {
            used.add(match[1]);
        }
    }
    assert.ok(used.size > 0, 'the composer uses gap utilities');

    for (const file of ['styles.css', 'editor_styles.css']) {
        const css = read(file);
        for (const n of used) {
            assert.ok(css.includes(`:where(.tiny_studiolms) :where(.gap-${n}) {`), `${file} has no gap-${n} for Bootstrap 4`);
        }
    }
});

test('the select is defined for Bootstrap 4 without taking over from Bootstrap 5', () => {
    for (const file of ['styles.css', 'editor_styles.css']) {
        const css = read(file);

        assert.ok(css.includes(':where(.tiny_studiolms) :where(.form-select) {'), file);
        assert.ok(css.includes(':where(.tiny_studiolms) :where(.form-select-sm) {'), file);
        // A rule with specificity would override the theme's own on Bootstrap 5.
        assert.ok(!/^\.tiny_studiolms \.form-select\s*\{/m.test(css), `${file} gives form-select a specificity`);
    }
});
