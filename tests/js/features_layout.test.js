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
 * Headless tests for featureColumns(), run via `node --test`.
 *
 * Regression test: the block compared the field with === 2, so a "2" that came as a string from a
 * generated config or a template was drawn with three columns.
 *
 * @package    tiny_studiolms
 * @copyright  2026 Jean Lúcio
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const load = () => import('../../amd/src/blocks/features_layout.js');

test('two columns are kept whether the value is a number or a string', async() => {
    const {featureColumns} = await load();
    for (const value of [2, '2', ' 2', '2px']) {
        assert.equal(featureColumns(value), 2, String(value));
    }
});

test('everything else is three columns, the block default', async() => {
    const {featureColumns} = await load();
    for (const value of [3, '3', 4, '4', 0, 1, undefined, null, '', 'abc', {}, [], NaN]) {
        assert.equal(featureColumns(value), 3, String(value));
    }
});
