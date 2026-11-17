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
 * Tests of the size limits of the table block, run via `node --test`, and a guard test of the block that uses them.
 *
 * Regression test: renderHtml() took the rows and columns from the block data with only a lower bound, and that data
 * also comes from the data-slms-state attribute of stored content and from AI output. A table with no rows and a state
 * of a hundred million rows made the composer build cells until the tab froze.
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

let logic;

test.before(async() => {
    // The module imports nothing, so Node can load it as it stands.
    logic = await import(require.resolve('../../amd/src/blocks/table_logic.js'));
});

const rows = (value) => logic.normalizeTableSize(value, logic.MIN_ROWS, logic.MAX_ROWS, 4);
const cols = (value) => logic.normalizeTableSize(value, logic.MIN_COLS, logic.MAX_COLS, 3);

test('the limits are those of the setup popup', () => {
    const popup = read('templates/popup_table_setup.mustache');

    assert.match(popup, new RegExp(`id="pop_table_cols"[^>]*min="${logic.MIN_COLS}" max="${logic.MAX_COLS}"`));
    assert.match(popup, new RegExp(`id="pop_table_rows"[^>]*min="${logic.MIN_ROWS}" max="${logic.MAX_ROWS}"`));
});

test('a size inside the limits is kept', () => {
    assert.equal(rows(2), 2);
    assert.equal(rows(50), 50);
    assert.equal(rows('7'), 7);
    assert.equal(cols(1), 1);
    assert.equal(cols(10), 10);
});

test('a size above the limit is cut to it, however large', () => {
    assert.equal(rows(51), 50);
    assert.equal(rows(100000000), 50);
    assert.equal(rows(Number.MAX_SAFE_INTEGER), 50);
    assert.equal(cols(11), 10);
    assert.equal(cols(100000000), 10);
    assert.equal(cols('99999999999'), 10);
});

test('a size below the limit is raised to it', () => {
    assert.equal(rows(1), 2);
    assert.equal(rows(-5), 2);
    assert.equal(cols(-5), 1);
});

test('a value that is not a number, or is zero, gives the fallback', () => {
    ['', 'x', null, undefined, NaN, 0].forEach((value) => {
        assert.equal(rows(value), 4, String(value));
        assert.equal(cols(value), 3, String(value));
    });
    assert.equal(rows(Infinity), 4);
});

test('the block builds its grid only from the limited size', () => {
    const block = read('amd/src/blocks/table.js');

    assert.match(block, /normalizeTableSize\(data\.rows, MIN_ROWS, MAX_ROWS, 4\)/);
    assert.match(block, /normalizeTableSize\(data\.cols, MIN_COLS, MAX_COLS, 3\)/);
    assert.ok(!/parseInt\(data\.(rows|cols)\)/.test(block), 'no loop bound is read straight from the data');
});
