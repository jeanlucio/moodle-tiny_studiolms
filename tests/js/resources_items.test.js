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
 * Guard test for the rows of the items popup of the resources block, run via `node --test`.
 *
 * Regression test: each row spent a bordered delete button beside the two text boxes, which left the web address a
 * narrow box in a narrow popup. The type, the title and a small remove button share the first line, and the address
 * has the second line to itself.
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

test('the remove button sits on the line of the title and the address has a line of its own', () => {
    const source = read('amd/src/blocks/resources.js');
    const row = source.slice(source.indexOf('row.innerHTML = `'), source.indexOf("row.querySelector('.res-title').value"));
    const firstLine = row.slice(row.indexOf('<div class="d-flex'), row.indexOf('</div>'));

    assert.ok(firstLine.includes('res-type'), 'type');
    assert.ok(firstLine.includes('res-title'), 'title');
    assert.ok(firstLine.includes('res-del'), 'remove button');
    assert.ok(!firstLine.includes('res-url'), 'address');
    assert.ok(row.indexOf('res-url') > row.indexOf('</div>'), 'address after the first line');
});

test('the remove button is a small icon with a name for screen readers, not an emoji', () => {
    const source = read('amd/src/blocks/resources.js');

    assert.match(source, /class="btn btn-sm btn-link text-danger res-del p-1"\s+aria-label="\$\{removeAria\}">/);
    assert.match(source, /<i class="fa-solid fa-trash-can" aria-hidden="true"><\/i>/);
    assert.ok(!source.includes('🗑'), 'no emoji');
});

['styles.css', 'editor_styles.css'].forEach((file) => {
    test(`${file}: the type fits its words and the title can shrink`, () => {
        const css = read(file);

        assert.match(css, /\.slms-resources-select \{\s+flex: 0 0 auto;\s+width: auto;/);
        assert.match(css, /\.slms-resources-list \.res-title \{\s+min-width: 0;/);
    });
});
