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
 * Guard test of the number of cards of the Infographic (stats) block, run via `node --test`.
 *
 * The edit popup has one row per card, and the code that builds, reads and binds the rows takes the number from one
 * constant. Five cards fit in a line on a wide page; the popup, the example of its template, the prompt of the AI and
 * the docs must all say the same number.
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

const COUNT = 5;

test('the block takes its number of rows from one constant, with no loop of its own', () => {
    const block = read('amd/src/blocks/infographic.js');

    assert.match(block, new RegExp(`^const ITEM_COUNT = ${COUNT};`, 'm'));
    assert.ok(!/i <= [0-9]+;/.test(block) && !/i < [0-9]+;/.test(block), 'a loop with a literal number is left');
    assert.equal((block.match(/ITEM_COUNT/g) || []).length, 6, 'the constant and its five uses');
});

test('the popup has one row of fields for each card, no more and no less', () => {
    const template = read('templates/popup_infographic_edit.mustache');

    for (let i = 1; i <= COUNT; i++) {
        ['icon', 'value', 'label'].forEach((field) => {
            assert.match(template, new RegExp(`id="ig_item${i}_${field}"`), `ig_item${i}_${field}`);
        });
        assert.match(template, new RegExp(`data-item="${i}"`), `button of the item ${i}`);
        assert.match(template, new RegExp(`"item${i}_label": `), `example of the item ${i}`);
    }
    assert.ok(!template.includes(`ig_item${COUNT + 1}_`), 'no row beyond the last');
    assert.match(template, new RegExp(`Up to ${COUNT} items`));
});

test('the prompt of the AI and the docs say the same number', () => {
    assert.match(read('classes/ai/generator.php'), new RegExp(`Generate 3 to ${COUNT} items`));
    assert.match(read('classes/ai/generator.php'), new RegExp(`array_slice\\(\\$safeitems, 0, ${COUNT}\\)`));
    assert.match(read('docs/en/features.md'), new RegExp(`up to ${COUNT} items`));
    assert.match(read('docs/pt/features.md'), new RegExp(`até ${COUNT} itens`));
});
