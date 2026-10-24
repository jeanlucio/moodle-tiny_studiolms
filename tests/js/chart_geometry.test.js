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
 * Headless tests for slicePathData(), run via `node --test`.
 *
 * Regression test: a chart with a single slice drew nothing. That slice sweeps a whole turn, so its arc starts
 * and ends at the same point, and an SVG arc whose two ends coincide is not drawn: only the legend, with
 * "100%", reached the page. The fallback of an emptied chart is a single slice too.
 *
 * @package    tiny_studiolms
 * @copyright  2026 Jean Lúcio
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const load = () => import('../../amd/src/blocks/chart_geometry.js');

/**
 * Splits path data into its arcs, each with the point it starts at and the point it ends at.
 *
 * @param {string} d Path data made of M, L, A and Z commands.
 * @returns {{from: number[], to: number[]}[]} The arcs.
 */
const arcs = (d) => {
    const tokens = d.split(/\s+/);
    const found = [];
    let current = null;
    for (let i = 0; i < tokens.length;) {
        const command = tokens[i];
        if (command === 'M' || command === 'L') {
            current = [Number(tokens[i + 1]), Number(tokens[i + 2])];
            i += 3;
        } else if (command === 'A') {
            const to = [Number(tokens[i + 6]), Number(tokens[i + 7])];
            found.push({from: current, to});
            current = to;
            i += 8;
        } else {
            i += 1;
        }
    }
    return found;
};

test('the only slice of a pie is drawn as two arcs whose ends differ', async() => {
    const {slicePathData} = await load();
    const found = arcs(slicePathData(0, 2 * Math.PI, 'pie'));

    assert.equal(found.length, 2);
    for (const arc of found) {
        assert.notDeepEqual(arc.from, arc.to, 'an arc with the same two ends is not drawn');
    }
});

test('the only slice of a donut is drawn as an outer circle and a hole, each in two arcs', async() => {
    const {slicePathData} = await load();
    const d = slicePathData(0, 2 * Math.PI, 'donut');
    const found = arcs(d);

    assert.equal(found.length, 4);
    for (const arc of found) {
        assert.notDeepEqual(arc.from, arc.to);
    }
    assert.equal((d.match(/M /g) || []).length, 2, 'outer circle and hole');
    assert.match(d, /A 56 56 0 1 0/, 'the hole runs the other way round');
});

test('a sweep a hair short of a whole turn is a whole turn too', async() => {
    const {slicePathData} = await load();

    assert.equal(arcs(slicePathData(0, 2 * Math.PI - 1e-9, 'pie')).length, 2);
});

test('slices that do not fill the circle keep their single arc', async() => {
    const {slicePathData} = await load();

    assert.equal(slicePathData(0, Math.PI / 2, 'pie'), 'M 140 140 L 140.00 22.00 A 118 118 0 0 1 258.00 140.00 Z');
    assert.equal(arcs(slicePathData(0, Math.PI * 1.5, 'pie')).length, 1);
    assert.match(slicePathData(0, Math.PI * 1.5, 'pie'), /A 118 118 0 1 1/, 'more than half a turn is a large arc');
    assert.equal(arcs(slicePathData(0, Math.PI / 2, 'donut')).length, 2);
});
