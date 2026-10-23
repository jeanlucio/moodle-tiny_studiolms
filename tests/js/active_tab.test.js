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
 * Guard test for the active tab of the composer, run via `node --test`.
 *
 * Regression test: after saving a template as official the list showed the official templates while the tab
 * that stayed marked as active was the previous one, because only the personal case marked its tab. The
 * search, the properties panel and the screen reader all read that mark. app.js needs the editor and the
 * Moodle AMD loader, so it cannot run headless; the test checks the rule that prevents the bug instead: the
 * mark is set in one place, switchTab(), and nowhere else.
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
const source = fs.readFileSync(require.resolve('../../amd/src/app.js'), 'utf8');

test('only markActiveTab() writes the selected state of a tab', () => {
    const writes = [...source.matchAll(/setAttribute\('aria-selected'/g)];

    assert.equal(writes.length, 1);
    assert.match(source, /const markActiveTab = \(tabName\) => \{[\s\S]*?aria-selected[\s\S]*?\n\};/);
});

test('every tab change goes through switchTab(), which marks the tab first', () => {
    assert.match(source, /const switchTab = async\(tabName\) => \{\n {4}markActiveTab\(tabName\);/);
});

test('no caller toggles the active class of a tab by hand', () => {
    const byHand = [...source.matchAll(/\[data-slms-tab\][^\n]*\n?[^\n]*classList\.(add|remove)\('active'\)/g)];

    assert.equal(byHand.length, 0);
});
