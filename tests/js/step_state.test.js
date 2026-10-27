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
 * Tests of the current step of the steps infographic, run via `node --test`, and guard tests of the block.
 *
 * The steps could be laid out vertically or horizontally but not say where the class is. The block has a field, Current
 * step: the steps before it show as done, it is ringed, the ones after it are dimmed, and the state is also in visible
 * text because the cleaner of a forum or a question removes the names an assistive technology would read.
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

let state;

test.before(async() => {
    // The module imports nothing, so Node can load it as it stands.
    state = await import(require.resolve('../../amd/src/blocks/step_state.js'));
});

test('the current step is a whole number from 1 to the number of steps, and anything else is none', () => {
    assert.equal(state.normalizeCurrent(2, 4), 2);
    assert.equal(state.normalizeCurrent('3', 4), 3);
    assert.equal(state.normalizeCurrent(4, 4), 4);
    [0, -1, 5, 7, '', 'x', null, undefined, NaN].forEach((value) => {
        assert.equal(state.normalizeCurrent(value, 4), 0, String(value));
    });
});

test('a block saved before the field marks nothing', () => {
    assert.equal(state.normalizeCurrent(undefined, 3), 0);
});

test('a step that does not exist marks nothing, instead of marking every other one as done', () => {
    assert.equal(state.normalizeCurrent(5, 3), 0);
    // The popup offers 6; a block that holds fewer steps can still be given one of those numbers.
    assert.equal(state.normalizeCurrent(6, 6), 6);
    assert.equal(state.normalizeCurrent(6, 99), 6);
    assert.equal(state.normalizeCurrent(7, 99), 0);
});

test('the steps before the current one are done, it is the current one, the rest come next', () => {
    assert.deepEqual([1, 2, 3, 4].map((n) => state.stepState(n, 3)), ['done', 'done', 'current', 'next']);
    assert.deepEqual([1, 2, 3].map((n) => state.stepState(n, 1)), ['current', 'next', 'next']);
});

test('with none marked no step has a state', () => {
    assert.deepEqual([1, 2, 3].map((n) => state.stepState(n, 0)), ['', '', '']);
});

test('the block reads the field, draws a state class and a visible word in both layouts', () => {
    const block = read('amd/src/blocks/infographic_steps.js');

    assert.match(block, /current: 0,/);
    assert.match(block, /import \{MAX_STEPS, normalizeCurrent, stepState\} from '\.\/step_state';/);
    assert.equal(block.match(/const current = normalizeCurrent\(data\.current, items\.length\);/g).length, 2);
    assert.match(block, /const stateClass = \(state\) => \(state \? ` slms-steps-state-\$\{state\}` : ''\);/);
    assert.equal(block.match(/\$\{stateClass\(state\)\}/g).length, 2);
    assert.equal(block.match(/^\s+stateHtml\(state, c\),$/gm).length, 2);
    assert.match(block, /state === 'done'/);
    assert.match(block, /data\.current = normalizeCurrent\(ev\.target\.value, MAX_STEPS\);/);
});

test('the words of the state are strings, asked for with the other default texts', () => {
    const texts = read('amd/src/blocks/default_texts.js');

    assert.match(texts, /\['steps_state_current', \[\]\],/);
    assert.match(texts, /\['steps_state_done', \[\]\],/);
    ['en', 'pt_br'].forEach((lang) => {
        const source = read(`lang/${lang}/tiny_studiolms.php`);
        ['steps_state_current', 'steps_state_done', 'infographic_steps_current', 'infographic_steps_current_none',
            'infographic_steps_current_hint'].forEach((key) => assert.ok(source.includes(`$string['${key}'] = `), key));
        const keys = source.split('\n').map((line) => line.match(/^\$string\['([^']+)'\]/)?.[1]).filter(Boolean);
        assert.deepEqual(keys, [...keys].sort(), lang);
    });
});

test('the popup has the field, with an option for none and one for each step', () => {
    const popup = read('templates/popup_infographic_steps_edit.mustache');

    assert.match(popup, /<select id="st_current"/);
    for (let i = 0; i <= 6; i++) {
        const option = `<option value="${i}" {{#current${i}}}selected{{/current${i}}}>`;
        assert.ok(popup.includes(option), String(i));
    }
});

['styles.css', 'editor_styles.css'].forEach((file) => {
    test(`${file}: done is shown by a tick, current by a ring and the next ones are dimmed`, () => {
        const css = read(file);

        assert.match(css, /\.slms-steps-state-next \{\s+opacity: 0\.55;/);
        assert.match(css, /\.slms-steps-state-current \.slms-steps__badge \{\s+outline: 3px solid currentColor;/);
        assert.match(css, /\.slms-steps__state \{/);
    });
});
