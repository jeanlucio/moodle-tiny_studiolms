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
 * Headless tests for slotCount(), run via `node --test`.
 *
 * Regression test: the grid cards block drew exactly as many slots as columns and ignored the rest
 * of data.slots. A generated config puts every card in one block, so the cards beyond the column
 * count were dropped from the preview and, once inserted, from the content for good.
 *
 * @package    tiny_studiolms
 * @copyright  2026 Jean Lúcio
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const load = () => import('../../amd/src/blocks/grid_slots.js');

test('a slot with content beyond the columns is kept', async() => {
    const {slotCount} = await load();
    const slots = ['<p>1</p>', '<p>2</p>', '<p>3</p>', '<p>4</p>', '<p>5</p>', '<p>6</p>'];

    assert.equal(slotCount('3', slots), 6);
    assert.equal(slotCount(3, slots), 6);
});

test('a new block has one empty slot per column', async() => {
    const {slotCount} = await load();

    for (const columns of [2, '3', 4]) {
        assert.equal(slotCount(columns, []), parseInt(columns, 10));
        assert.equal(slotCount(columns, undefined), parseInt(columns, 10));
    }
});

test('empty slots after the last one with content do not add rows', async() => {
    const {slotCount} = await load();

    assert.equal(slotCount(2, ['<p>1</p>', '', '', '<p><br></p>']), 2);
    assert.equal(slotCount(2, ['', '', '<p>3</p>', '']), 3);
});

test('an unusable columns value falls back to two', async() => {
    const {slotCount} = await load();

    for (const columns of [undefined, null, '', 'abc', 0, NaN]) {
        assert.equal(slotCount(columns, []), 2, String(columns));
    }
});

test('a slot that is not text counts as empty', async() => {
    const {slotCount} = await load();

    assert.equal(slotCount(2, [5, null, {}, ['x'], '<p>ok</p>']), 5);
    assert.equal(slotCount(2, [5, null, {}, ['x']]), 2);
});
