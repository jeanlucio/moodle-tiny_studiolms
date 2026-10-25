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
 * Guard test for the stylesheet the editor frame gets from plugin.js, run via `node --test`.
 *
 * Regression test: that inline stylesheet kept the old way of laying a block out, with CSS variables set in a
 * style attribute, and its `body.mce-content-body` selectors outweigh the class rules of editor_styles.css that
 * replaced it (the purifier strips the variables, the classes survive). A card set side by side showed stacked
 * in the editor, and a grid kept two columns and the default gap, while the Studio and the course page were
 * right. A rule written with a variable for something a class now sets must not come back.
 *
 * @package    tiny_studiolms
 * @copyright  2026 Jean Lúcio
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const source = fs.readFileSync(require.resolve('../../amd/src/plugin.js'), 'utf8');

test('a card set side by side is laid out in a row in the editor too', () => {
    assert.match(source, /body\.mce-content-body \.studiolms-card\.slms-horizontal \{ flex-direction: row; \}/);
});

test('the columns and the gap of a grid come from the classes, not from variables nothing sets', () => {
    assert.ok(!source.includes('var(--slms-cols'), 'the columns are the slms-cols-N classes');
    assert.ok(!source.includes('var(--slms-gap'), 'the gap is the slms-gap-N classes');
});

test('a list of resources set as a grid is laid out in a row in the editor too', () => {
    assert.match(
        source,
        /\.studiolms-resources-list\.slms-dir-row \{\s*flex-direction: row;\s*flex-wrap: wrap; \}/
    );
});
