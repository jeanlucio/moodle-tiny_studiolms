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
 * Headless tests for the geometry of the line between a block's settings and the component list, run via
 * `node --test`.
 *
 * @package    tiny_studiolms
 * @copyright  2026 Jean Lúcio
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const load = () => import('../../amd/src/split_geometry.js');

test('anywhere in the middle keeps both areas, and the list keeps its minimum', async() => {
    const {resolveSplit, MIN_LIST} = await load();

    assert.deepEqual(resolveSplit(600, 200), {state: 'both', height: 200});
    assert.deepEqual(resolveSplit(600, 600 - MIN_LIST), {state: 'both', height: 600 - MIN_LIST});
    // Between the minimum of the list and the point where it collapses, it stays at its minimum.
    assert.deepEqual(resolveSplit(600, 600 - 120), {state: 'both', height: 600 - MIN_LIST});
});

test('dragged near the top the line snaps and only the list is left', async() => {
    const {resolveSplit, SNAP_SETTINGS} = await load();

    assert.deepEqual(resolveSplit(600, SNAP_SETTINGS - 1), {state: 'list', height: 0});
    assert.deepEqual(resolveSplit(600, 0), {state: 'list', height: 0});
    assert.deepEqual(resolveSplit(600, -50), {state: 'list', height: 0});
    assert.equal(resolveSplit(600, SNAP_SETTINGS).state, 'both');
});

test('dragged near the bottom the line snaps and only the settings are left', async() => {
    const {resolveSplit, SNAP_LIST} = await load();

    assert.deepEqual(resolveSplit(600, 600 - SNAP_LIST + 1), {state: 'properties', height: 600});
    assert.deepEqual(resolveSplit(600, 900), {state: 'properties', height: 600});
    assert.equal(resolveSplit(600, 600 - SNAP_LIST).state, 'both');
});

test('a height that is not a number is the top end, never an error', async() => {
    const {resolveSplit} = await load();

    for (const bad of [undefined, null, NaN, 'tall', {}]) {
        assert.equal(resolveSplit(600, bad).state, 'list', String(bad));
    }
});

test('a small space still gives a line that can be at the ends', async() => {
    const {resolveSplit} = await load();

    for (const height of [0, 80, 200]) {
        const resolved = resolveSplit(220, height);
        assert.ok(['list', 'properties', 'both'].includes(resolved.state));
        assert.ok(resolved.height >= 0 && resolved.height <= 220);
    }
});

test('a key step moves the line, and from an end it comes back into the middle', async() => {
    const {stepSplit, MIN_LIST, SNAP_SETTINGS} = await load();

    assert.deepEqual(stepSplit('both', 300, 600, 24), {state: 'both', height: 324});
    assert.deepEqual(stepSplit('both', 300, 600, -24), {state: 'both', height: 276});
    // Down from the list-only end: back to the least that keeps both, not a few pixels that would snap again.
    assert.deepEqual(stepSplit('list', 0, 600, 24), {state: 'both', height: SNAP_SETTINGS});
    // Up from the settings-only end: back to the most that keeps the list at its minimum.
    assert.deepEqual(stepSplit('properties', 600, 600, -24), {state: 'both', height: 600 - MIN_LIST});
    // Further into the end that is already reached stays there.
    assert.equal(stepSplit('list', 0, 600, -24).state, 'list');
    assert.equal(stepSplit('properties', 600, 600, 24).state, 'properties');
    // A step that crosses the snap point reaches the end.
    assert.equal(stepSplit('both', SNAP_SETTINGS + 10, 600, -24).state, 'list');
});

test('the percentage for a screen reader is 0, 100 or between', async() => {
    const {splitPercent} = await load();

    assert.equal(splitPercent('list', 0, 600), 0);
    assert.equal(splitPercent('properties', 600, 600), 100);
    assert.equal(splitPercent('both', 300, 600), 50);
    assert.equal(splitPercent('both', 70, 600), 12);
    assert.equal(splitPercent('both', 1, 600), 1);
    assert.equal(splitPercent('both', 599, 600), 99);
    assert.equal(splitPercent('both', 100, 0), 50);
});

test('a saved height is used only when it can be one', async() => {
    const {parseStoredHeight, SNAP_SETTINGS} = await load();

    assert.equal(parseStoredHeight('240'), 240);
    assert.equal(parseStoredHeight(SNAP_SETTINGS), SNAP_SETTINGS);
    for (const bad of [null, undefined, '', 'tall', '10', '-5', NaN, {}]) {
        assert.equal(parseStoredHeight(bad), null, String(bad));
    }
});
