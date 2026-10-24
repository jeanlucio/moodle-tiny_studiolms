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
 * Headless tests for the names of the icons of the infographic picker, run via `node --test`.
 *
 * Regression test: the picker named each button after its CSS class in English ("graduation cap"), as the
 * tooltip and, since the icon is aria-hidden, as the name a screen reader announces. No language pack could
 * translate it. The names now come from lang strings, one per icon of the list.
 *
 * @package    tiny_studiolms
 * @copyright  2026 Jean Lúcio
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const load = () => import('../../amd/src/blocks/icon_names.js');
const read = (file) => fs.readFileSync(require.resolve(`../../${file}`), 'utf8');

const pickerIcons = () => {
    const list = read('amd/src/blocks/infographic_shared.js').match(/export const ICONS = \[([\s\S]*?)\];/);
    assert.ok(list, 'the icon list is in infographic_shared.js');
    return [...list[1].matchAll(/'(fa-solid fa-[a-z-]+)'/g)].map((match) => match[1]);
};

test('the key of an icon is built from its class', async() => {
    const {iconStringKey} = await load();

    assert.equal(iconStringKey('fa-solid fa-graduation-cap'), 'igicon_graduation_cap');
    assert.equal(iconStringKey('fa-solid fa-users'), 'igicon_users');
    assert.equal(iconStringKey('fa-solid fa-magnifying-glass'), 'igicon_magnifying_glass');
});

test('every icon of the picker has a name in both languages', async() => {
    const {iconStringKey} = await load();
    const icons = pickerIcons();
    assert.equal(icons.length, 40);

    for (const file of ['lang/en/tiny_studiolms.php', 'lang/pt_br/tiny_studiolms.php']) {
        const lang = read(file);
        for (const icon of icons) {
            assert.ok(lang.includes(`$string['${iconStringKey(icon)}'] = '`), `${file} has no name for ${icon}`);
        }
    }
});

test('the picker takes the names from the lang strings and not from the class', () => {
    const source = read('amd/src/blocks/infographic_shared.js');

    assert.ok(!source.includes("cls.replace('fa-solid fa-'"), 'the name is no longer derived from the class');
    assert.ok(source.includes('iconNames.get(cls)'));
    assert.match(source, /setAttribute\('aria-label', iconNames\.get\(cls\)\)/);
});

test('the Escape that closes the picker does not reach the dialog around it', () => {
    const source = read('amd/src/blocks/infographic_shared.js');
    const dismiss = source.match(/const dismiss = \(e\) => \{[\s\S]*?\n {4}\};/);

    assert.ok(dismiss, 'the dismiss handler is in infographic_shared.js');
    assert.match(dismiss[0], /e\.type === 'keydown'[\s\S]*?e\.stopPropagation\(\)/);
});
