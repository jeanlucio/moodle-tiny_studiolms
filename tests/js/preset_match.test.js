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
 * Headless tests for findPreset(), run via `node --test`.
 *
 * Regression test: the chat looked the layout up by exact equality, so a name with another case or spacing found
 * nothing, and the confirmed card ended in silence.
 *
 * @package    tiny_studiolms
 * @copyright  2026 Jean Lúcio
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const load = () => import('../../amd/src/preset_match.js');
const presets = [{name: 'Module Start'}, {name: 'Mission Board'}];

test('a name is found whatever its case or spacing', async() => {
    const {findPreset} = await load();

    for (const name of ['Module Start', 'module start', 'MODULE START', '  Module   Start  ', 'module\tstart']) {
        assert.equal(findPreset(presets, name), presets[0], JSON.stringify(name));
    }
    assert.equal(findPreset(presets, 'mission board'), presets[1]);
});

test('anything else is not a layout of the library', async() => {
    const {findPreset} = await load();

    for (const name of ['Module Starting', 'Fechamento de Módulo', '', '   ', null, undefined, 5, {}, []]) {
        assert.equal(findPreset(presets, name), undefined, JSON.stringify(name));
    }
});

test('an empty or malformed list finds nothing', async() => {
    const {findPreset} = await load();

    for (const list of [[], undefined, null, 'x', {}]) {
        assert.equal(findPreset(list, 'Module Start'), undefined);
    }
    assert.equal(findPreset([null, {name: 'Module Start'}], 'module start')?.name, 'Module Start');
});

test('a confirmed card that finds no layout says so instead of ending in silence', () => {
    const source = fs.readFileSync(require.resolve('../../amd/src/app.js'), 'utf8');

    assert.ok(source.includes('findPreset(presetsData, presetName)'));
    assert.match(source, /if \(!found\) \{[\s\S]*?ai_chat_preset_not_found[\s\S]*?return;/);
});
