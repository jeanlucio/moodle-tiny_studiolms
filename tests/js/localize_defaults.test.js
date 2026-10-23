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
 * Headless tests for applyDefaultTexts(), run via `node --test`. The block definitions cannot be
 * loaded here (they import RequireJS modules), so the blocks are stand-ins with the same shape as
 * the real defaultData; the Behat scenario "A new block shows its example texts in the site
 * language" checks the real ones in a browser.
 *
 * @package    tiny_studiolms
 * @copyright  2026 Jean Lúcio
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const load = () => import('../../amd/src/blocks/localize_defaults.js');

/** A lookup that makes every text visible in the result: "key" or "key:param". */
const text = (key, param) => (param === undefined ? key : `${key}:${param}`);

const makeBlocks = () => ({
    chart: {defaultData: {slices: [{label: '', value: 75}, {label: '', value: 15}, {label: '', value: 10}]}},
    chartBar: {defaultData: {items: [{label: '', value: 75}, {label: '', value: 15}, {label: '', value: 10}]}},
    gauge: {defaultData: {gauges: [{value: 75, label: ''}]}},
    mindmap: {defaultData: {topic: '', branches: [{label: '', children: []}, {label: '', children: []},
        {label: '', children: []}, {label: '', children: []}]}},
    infographic: {defaultData: {items: [{label: ''}, {label: ''}, {label: ''}]}},
    infographicSteps: {defaultData: {items: [{title: ''}, {title: ''}, {title: ''}]}},
    infographicTimeline: {defaultData: {items: [{date: '2020', title: ''}, {date: '2021', title: ''}, {date: '2022', title: ''}]}},
    infographicFeatures: {defaultData: {items: [{title: ''}, {title: ''}, {title: ''}]}},
    infographicComparison: {defaultData: {col1: '', col2: '', items: [{label: ''}, {label: ''}, {label: ''}]}},
});

test('every example label of every block is filled from a string', async() => {
    const {applyDefaultTexts} = await load();
    const blocks = makeBlocks();

    applyDefaultTexts(blocks, text);

    assert.deepEqual(blocks.chart.defaultData.slices.map((s) => s.label),
        ['default_label_approved', 'default_label_inprogress', 'default_label_failed']);
    assert.deepEqual(blocks.chartBar.defaultData.items.map((s) => s.label),
        ['default_label_approved', 'default_label_inprogress', 'default_label_failed']);
    assert.equal(blocks.gauge.defaultData.gauges[0].label, 'default_gauge_label');
    assert.equal(blocks.mindmap.defaultData.topic, 'default_mindmap_topic');
    assert.deepEqual(blocks.mindmap.defaultData.branches.map((b) => b.label),
        ['default_mindmap_branch:A', 'default_mindmap_branch:B', 'default_mindmap_branch:C', 'default_mindmap_branch:D']);
    assert.deepEqual(blocks.infographic.defaultData.items.map((i) => i.label),
        ['default_stat_approval', 'default_stat_modules', 'default_stat_participants']);
    assert.deepEqual(blocks.infographicSteps.defaultData.items.map((i) => i.title),
        ['default_step_title:1', 'default_step_title:2', 'default_step_title:3']);
    assert.deepEqual(blocks.infographicTimeline.defaultData.items.map((i) => i.title),
        ['default_event_title:1', 'default_event_title:2', 'default_event_title:3']);
    assert.deepEqual(blocks.infographicFeatures.defaultData.items.map((i) => i.title),
        ['default_feature_title:1', 'default_feature_title:2', 'default_feature_title:3']);
    assert.equal(blocks.infographicComparison.defaultData.col1, 'default_option_label:A');
    assert.equal(blocks.infographicComparison.defaultData.col2, 'default_option_label:B');
    assert.deepEqual(blocks.infographicComparison.defaultData.items.map((i) => i.label),
        ['default_feature_title:1', 'default_feature_title:2', 'default_feature_title:3']);
});

test('what is not a label is left alone', async() => {
    const {applyDefaultTexts} = await load();
    const blocks = makeBlocks();

    applyDefaultTexts(blocks, text);

    assert.deepEqual(blocks.chart.defaultData.slices.map((s) => s.value), [75, 15, 10]);
    assert.deepEqual(blocks.infographicTimeline.defaultData.items.map((i) => i.date), ['2020', '2021', '2022']);
    assert.deepEqual(blocks.mindmap.defaultData.branches.map((b) => b.children), [[], [], [], []]);
});

test('a block the registry does not have is skipped', async() => {
    const {applyDefaultTexts} = await load();
    const blocks = makeBlocks();
    delete blocks.mindmap;

    assert.doesNotThrow(() => applyDefaultTexts(blocks, text));
    assert.equal(blocks.gauge.defaultData.gauges[0].label, 'default_gauge_label');
});
