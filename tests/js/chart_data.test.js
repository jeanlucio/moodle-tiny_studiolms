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
 * Tests of the view models and the stylesheet of the chart, bar chart and gauge blocks, run via `node --test`.
 *
 * The three blocks drew SVG, which the HTML cleaner of a forum post, a glossary entry, a question or an assignment
 * removes, so nothing of them reached the reader there. They now draw plain HTML: a class for what is a choice
 * (colour, zone, whole percent of a gauge) and a width or a height in percent for what is a measure.
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

let data;

test.before(async() => {
    data = await import(require.resolve('../../amd/src/blocks/chart_data.js'));
});

test('a slice is as wide as its share of the total, and the colours go round after six', () => {
    const model = data.sliceModel([
        {label: 'A', value: 75}, {label: 'B', value: 15}, {label: 'C', value: 10},
        {label: 'D', value: 1}, {label: 'E', value: 1}, {label: 'F', value: 1}, {label: 'G', value: 1},
    ]);

    assert.equal(model[0].pct, 72);
    assert.equal(model[0].width, 72.12);
    assert.deepEqual(model.map((s) => s.color), [1, 2, 3, 4, 5, 6, 1]);
    assert.equal(data.sliceModel([]).length, 0);
});

test('a bar is as long as its share of the largest value; the percentage is the share of the total', () => {
    const model = data.barModel([{label: 'A', value: 60}, {label: 'B', value: 30}, {label: 'C', value: 10}]);

    assert.deepEqual(model.map((b) => b.size), [100, 50, 16.67]);
    assert.deepEqual(model.map((b) => b.pct), [60, 30, 10]);
    assert.equal(model[0].label, 'A');
});

test('a gauge is clamped to whole percents and given the zone of the traffic light', () => {
    assert.deepEqual(data.gaugeModel('150', 'x'), {value: 100, label: 'x', zone: 'ok'});
    assert.deepEqual(data.gaugeModel(-4, ''), {value: 0, label: '', zone: 'low'});
    assert.equal(data.gaugeModel('abc', 'y').value, 0);
    assert.equal(data.gaugeZone(67), 'ok');
    assert.equal(data.gaugeZone(66), 'warn');
    assert.equal(data.gaugeZone(34), 'warn');
    assert.equal(data.gaugeZone(33), 'low');
});

test('the stylesheet has a colour class per palette entry and a turn per whole percent of a gauge', () => {
    ['styles.css', 'editor_styles.css'].forEach((file) => {
        const css = read(file);

        data.PALETTE.forEach((colour, i) => {
            assert.match(css, new RegExp(`\\.slms-bar-c${i + 1} \\{\\s*background-color: ${colour};`), `${file} c${i + 1}`);
        });
        for (let n = 0; n <= 100; n++) {
            const turn = parseFloat((45 + 1.8 * n).toFixed(1));
            assert.match(css, new RegExp(`\\.slms-gp-${n} \\.slms-gauge__fill \\{\\s*transform: rotate\\(${turn}deg\\);`),
                `${file} gauge ${n}`);
        }
    });
});

test('the three blocks no longer build SVG', () => {
    ['chart', 'chart_bar', 'gauge'].forEach((block) => {
        assert.doesNotMatch(read(`amd/src/blocks/${block}.js`), /<svg|xmlns/, block);
    });
});

test('bars with nothing to compare give no bars at all, instead of a share of zero', () => {
    assert.deepEqual(data.barModel([{label: 'A', value: 0}, {label: 'B', value: 0}]), []);
});
