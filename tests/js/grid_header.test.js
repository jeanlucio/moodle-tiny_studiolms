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
 * Guard test for the heading and the description of the grid cards block, run via `node --test`.
 *
 * Regression test: the Mission Board layout put the heading and the line under it in one field, with a line break
 * and a small tag, and the settings showed that markup in a text box. The heading and the description are now two
 * plain text fields, and the description is a paragraph of its own, outside the heading.
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

test('the block stores the description apart from the heading and reads both back from the canvas', () => {
    const source = read('amd/src/blocks/gridcards.js');

    assert.match(source, /containerDesc: '',/);
    assert.match(source, /excludeFromState: \['containerTitle', 'containerDesc', 'slots'\]/);
    assert.match(source, /querySelector\('\.slms-grid-desc'\)/);
    // Read back as text: the description never carries markup.
    assert.match(source, /descNode \? descNode\.textContent\.trim\(\)/);
    assert.match(source, /'#pop_grid_desc': 'containerDesc'/);
});

test('the description is a paragraph of its own, outside the heading, and escaped', () => {
    const template = read('templates/block_gridcards.mustache');

    assert.match(template, /<p class="slms-grid-desc mceEditable">\{\{containerDesc\}\}<\/p>/);
    const heading = template.slice(template.indexOf('<h3'), template.indexOf('</h3>'));
    assert.ok(!heading.includes('containerDesc'), 'the description is not inside the heading');
    // The rule under the heading and the line is the head's.
    assert.match(template, /<div class="slms-grid-head pb-2 mb-3 border-bottom">/);
    assert.ok(!/<h3[^>]*border-bottom/.test(template));
});

test('the settings have a field for it, with a string in both languages', () => {
    assert.match(read('templates/popup_gridcards_design.mustache'), /id="pop_grid_desc" value="\{\{containerDesc\}\}"/);
    ['en', 'pt_br'].forEach((lang) => {
        assert.match(read(`lang/${lang}/tiny_studiolms.php`), /\$string\['grid_container_desc'\] = '[^']+';/);
    });
});

['styles.css', 'editor_styles.css'].forEach((file) => {
    test(`${file}: the description is a muted line under the heading`, () => {
        const css = read(file);

        assert.match(css, /\.slms-grid-head \.slms-grid-title \{\s*margin: 0;/);
        assert.match(css, /\.slms-grid-head \.slms-grid-desc \{[^}]*font-size: 0\.875rem;[^}]*color: var\(--bs-secondary-color/);
    });
});
