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
 * Headless tests for mergeAiConfig(), run via `node --test`.
 *
 * Regression test: the config of a generated block was merged over the block defaults as it came.
 * A number in a table cell threw in the block ("content.trim is not a function") and aborted the
 * insertion of the whole layout; a null button text threw the same way; the text "false" in a
 * comparison column was truthy and drew a check mark.
 *
 * @package    tiny_studiolms
 * @copyright  2026 Jean Lúcio
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const load = () => import('../../amd/src/ai_config_types.js');

test('numbers and nulls in text lists and text fields become text', async() => {
    const {mergeAiConfig} = await load();

    const table = mergeAiConfig({cols: 3, cellData: []}, {cellData: [['Student', 'Grade'], ['Ana', 10], [null, {}]]});
    assert.deepEqual(table.cellData, [['Student', 'Grade'], ['Ana', '10'], ['', '']]);

    const card = mergeAiConfig({btnText: '', content: ''}, {btnText: null, content: 7});
    assert.equal(card.btnText, '');
    assert.equal(card.content, '7');
});

test('flags written as text keep their meaning', async() => {
    const {mergeAiConfig} = await load();
    const defaults = {items: [{label: '', col1: true, col2: true}]};

    const merged = mergeAiConfig(defaults, {items: [{label: 'X', col1: 'false', col2: 'true'}, {label: 'Y', col1: 0, col2: 'no'}]});

    assert.deepEqual(merged.items.map((item) => [item.col1, item.col2]), [[false, true], [false, false]]);
});

test('a list field that is not a list falls back to the default', async() => {
    const {mergeAiConfig} = await load();
    const defaults = {branches: [{label: '', children: []}]};

    const merged = mergeAiConfig(defaults, {branches: [{label: 'A', children: 'one, two'}, {label: 'B', children: ['x', 3]}]});

    assert.deepEqual(merged.branches[0].children, []);
    assert.deepEqual(merged.branches[1].children, ['x', '3']);
    assert.deepEqual(mergeAiConfig(defaults, {branches: 'none'}).branches, defaults.branches);
});

test('numeric fields accept a leading number and otherwise keep the default', async() => {
    const {mergeAiConfig} = await load();
    const defaults = {radius: 8, slices: [{label: '', value: 10}]};

    const merged = mergeAiConfig(defaults, {radius: '12px', slices: [{label: 'A', value: '45%'}, {label: 'B', value: 'many'}]});

    assert.equal(merged.radius, 12);
    assert.deepEqual(merged.slices.map((slice) => slice.value), [45, 10]);
    assert.equal(mergeAiConfig(defaults, {radius: null}).radius, 8);
});

test('missing fields keep their defaults and unknown fields are kept', async() => {
    const {mergeAiConfig} = await load();
    const defaults = {title: 'Default', theme: 'blue'};

    assert.deepEqual(mergeAiConfig(defaults, {extra: 1}), {title: 'Default', theme: 'blue', extra: 1});
    assert.deepEqual(mergeAiConfig(defaults, null), defaults);
    assert.deepEqual(mergeAiConfig(defaults, 'text'), defaults);
});

test('the defaults are not changed and a __proto__ key does not reach the result', async() => {
    const {mergeAiConfig} = await load();
    const defaults = {items: [{label: ''}], theme: 'blue'};
    const snapshot = JSON.stringify(defaults);

    const merged = mergeAiConfig(defaults, JSON.parse('{"theme":"red","__proto__":{"polluted":true}}'));

    assert.equal(JSON.stringify(defaults), snapshot);
    assert.equal(merged.theme, 'red');
    assert.equal(Object.getPrototypeOf(merged), Object.prototype);
    assert.equal(merged.polluted, undefined);
});
