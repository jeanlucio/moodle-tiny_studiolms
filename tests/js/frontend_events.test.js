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
 * Guard test for the front-end script that wires the blocks of a page, run via `node --test`.
 *
 * Regression test: the script wired the accordions the page held when it loaded and nothing else. The course
 * editor replaces a whole activity when it is moved, shown or hidden, and some pages load content by AJAX,
 * and the stylesheet hides the panel of a closed accordion, so a closed accordion in such content could never
 * be opened until the page was reloaded. The core announces new content with filterContentUpdated. The script
 * needs the Moodle AMD loader, so it cannot run headless; the test checks the rules that keep it right.
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
const source = fs.readFileSync(require.resolve('../../amd/src/frontend.js'), 'utf8');

test('content that enters the page later is wired through filterContentUpdated', () => {
    assert.ok(source.includes("from 'core_filters/events'"));
    assert.match(source, /document\.addEventListener\(filterEventTypes\.filterContentUpdated,/);
    assert.match(source, /forEach\(initIn\)/);
});

test('the listener is registered even when the page holds no block yet', () => {
    const init = source.match(/export const init = \(\) => \{[\s\S]*?\n\};/);

    assert.ok(init, 'init() exists');
    // The page is wired first and the listener is not behind an early return.
    assert.ok(!/return;/.test(init[0]));
    assert.ok(init[0].indexOf('initIn(document)') < init[0].indexOf('addEventListener'));
});

test('an element that is already wired is not wired a second time', () => {
    assert.match(source, /summary\.dataset\.slmsBound === '1'/);
    assert.match(source, /el\.dataset\.slmsSoundBound === '1'/);
});

test('the root itself is considered, not only what it contains', () => {
    // A node announced by the core can be a block itself, which querySelectorAll() on it would skip.
    assert.match(source, /root\.matches\?\.\(selector\) \? \[root, \.\.\.found\] : found/);
});
