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
 * Guard test for the handle between the settings and the component list, run via `node --test`.
 *
 * The arrows that move the line sit on the line itself, like the handle beside the canvas. In the middle both
 * are there; at either end only the one that comes back is left, and when the arrow that had the keyboard focus
 * is the one that goes, the focus moves to the one that stays. app.js needs the editor and the Moodle AMD loader,
 * so it cannot run headless; the test checks those rules in the source.
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

test('the arrows sit in a handle on the line above the component list', () => {
    const template = read('templates/modal.mustache');
    const heading = template.match(/id="slms-library-heading"[\s\S]*?<\/div>\s*<div class="slms-library-grid"/);

    assert.ok(heading, 'the heading of the list is in the modal template');
    assert.match(heading[0], /class="slms-split-handle"[\s\S]*?id="slms-split-up"[\s\S]*?id="slms-split-down"/);
    assert.ok(heading[0].indexOf('slms-split-handle') < heading[0].indexOf('role="heading"'));
});

test('an arrow with nowhere to go is removed, not left disabled', () => {
    const app = read('amd/src/app.js');

    assert.match(app, /up\.classList\.toggle\('d-none', sidebarSplit === SPLIT_LIST\)/);
    assert.match(app, /down\.classList\.toggle\('d-none', sidebarSplit === SPLIT_PROPERTIES\)/);
    assert.ok(!app.includes('aria-disabled'), 'the arrows are no longer marked as disabled');
    assert.ok(!read('templates/modal.mustache').includes('aria-disabled'));
});

test('the focus moves to the arrow that stays when its own arrow goes', () => {
    const app = read('amd/src/app.js');

    assert.match(app, /const focused = \[up, down\]\.find\(\(arrow\) => arrow === document\.activeElement\);/);
    assert.match(app, /if \(focused\?\.classList\.contains\('d-none'\)\) \{\s*\(focused === up \? down : up\)\.focus\(\);/);
});

test('the handle straddles the line and the list-only state leaves room for it', () => {
    for (const file of ['styles.css', 'editor_styles.css']) {
        const css = read(file);

        assert.match(css, /\.slms-split-handle \{[^}]*position: absolute;[^}]*top: 0;[^}]*height: 0;/s, file);
        assert.match(css, /\.slms-split-controls \{[^}]*transform: translateY\(-50%\);/s, file);
        assert.match(css, /\.slms-split-list \.slms-library-heading \{\s*margin-top: 0\.75rem;/, file);
    }
});
