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
 * Headless tests for slotCount() and gridGap(), run via `node --test`.
 *
 * Regression test: the grid cards block drew exactly as many slots as columns and ignored the rest
 * of data.slots. A generated config puts every card in one block, so the cards beyond the column
 * count were dropped from the preview and, once inserted, from the content for good.
 *
 * Regression test: the spacing control moves in steps of 5 up to 60, but the stylesheet had a class for
 * only 0, 4, 8, 12, 16, 20, 24 and 32, so 11 of its 13 positions drew the 20px default.
 *
 * @package    tiny_studiolms
 * @copyright  2026 Jean Lúcio
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

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

const read = (file) => fs.readFileSync(require.resolve(`../../${file}`), 'utf8');

test('every position of the spacing control has a class in both stylesheets', () => {
    const popup = read('templates/popup_gridcards_layout.mustache');
    const range = popup.match(/id="pop_grid_gap"[^>]*min="(\d+)"[^>]*max="(\d+)"[^>]*step="(\d+)"/);
    assert.ok(range, 'the spacing range is in the layout popup');
    const [min, max, step] = range.slice(1).map(Number);

    for (const file of ['styles.css', 'editor_styles.css']) {
        const css = read(file);
        for (let gap = min; gap <= max; gap += step) {
            assert.ok(css.includes(`.studiolms-grid-content.slms-gap-${gap} {`), `${file} has no class for ${gap}`);
        }
    }
});

test('a spacing keeps its value when it has a class and otherwise moves to the closest one', async() => {
    const {gridGap} = await load();

    for (const gap of [0, 4, 5, 10, 20, 25, 32, 60, '15', '40']) {
        assert.equal(gridGap(gap), Number(gap), String(gap));
    }
    assert.equal(gridGap(17), 16);
    assert.equal(gridGap(18.5), 20);
    assert.equal(gridGap(70), 60);
    assert.equal(gridGap(-5), 0);
});

test('a spacing that is not a number is the default of 20', async() => {
    const {gridGap} = await load();

    for (const gap of [undefined, null, '', 'wide', NaN, {}, []]) {
        assert.equal(gridGap(gap), 20, String(gap));
    }
});
