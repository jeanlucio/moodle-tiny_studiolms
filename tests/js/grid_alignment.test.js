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
 * Guard test for the heights of the blocks of a grid row, run via `node --test`.
 *
 * Regression test: the first block of each column of a grid started at a different height (a button 16px down, a
 * card 24px), because the button and the list of resources took their spacing from Bootstrap's my-3 and my-4, which
 * are marked important, so no rule could take the top margin away. In the editor the dashed border of a column hid
 * it; on the course page it showed.
 *
 * @package    tiny_studiolms
 * @copyright  2026 Jean Lúcio
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

// Located through a source file, so the test works from any working directory.
const read = (file) => fs.readFileSync(require.resolve(`../../${file}`), 'utf8');

test('no block takes its top margin from an important Bootstrap utility', () => {
    ['block_button', 'block_heading', 'block_resources'].forEach((template) => {
        assert.ok(!/class="[^"]*\bmy-[0-5]\b/.test(read(`templates/${template}.mustache`)), `${template}`);
    });
});

test('the spacing those utilities gave is in the stylesheet, with nothing important', () => {
    ['styles.css', 'editor_styles.css'].forEach((file) => {
        const css = read(file);

        assert.match(css, /\.studiolms-btn-wrap \{\s*margin-top: 1rem;\s*margin-bottom: 1rem;/);
        assert.match(css, /\.studiolms-heading-wrap,\s*\.studiolms-resources-wrap \{\s*margin-top: 1\.5rem;/);
        assert.match(css, /\.slms-grid-slot > :first-child,\s*\.studiolms-grid-content > \.slms-grid-slot > :first-child >/);
        assert.match(css, /> :first-child > \.studiolms-card \{\s*margin-top: 0;/);
        assert.ok(!/!important/.test(css.slice(css.indexOf('.studiolms-btn-wrap {'), css.indexOf('/* Grid Container */'))));
    });
});

test('a block inserted before the change is mended on the page, by the utility it carries', () => {
    const front = read('amd/src/frontend.js');

    assert.match(front, /'\.studiolms-btn-wrap': 'my-3',/);
    assert.match(front, /'\.studiolms-heading-wrap': 'my-4',/);
    assert.match(front, /'\.studiolms-resources-wrap': 'my-4',/);
    assert.match(front, /block\.classList\.remove\(utility\)/);
    assert.match(front, /mendLegacySpacing\(root\);/);
});
