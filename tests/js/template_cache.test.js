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
 * Guard test for the template list cache of the composer, run via `node --test`.
 *
 * Regression test: saving the preview of an AI block or layout as a template wrote the row but left
 * the cached "My templates" list in place, so the new template was missing until the page was
 * reloaded and the teacher saved it again. app.js needs the editor and the Moodle AMD loader, so it
 * cannot run headless; the test checks the rule that prevents the bug instead: the web service
 * call is made only by the helper that also drops the cached list.
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

test('saveTemplate() is only called by the helper that refreshes the cache', () => {
    const calls = [...source.matchAll(/(?<![\w.])saveTemplate\(/g)];

    assert.equal(calls.length, 1);

    const helper = source.match(/const saveTemplateAndRefresh = async[\s\S]*?\n};\n/);
    assert.ok(helper, 'the saveTemplateAndRefresh helper exists');
    assert.ok(helper[0].includes('saveTemplate(name, content, isglobal)'));
    assert.ok(helper[0].includes('invalidateTabCache('));
});

test('every place that saves a template goes through the helper', () => {
    const uses = [...source.matchAll(/saveTemplateAndRefresh\(/g)];

    // The two callers: the composer and the AI preview.
    assert.equal(uses.length, 2);
});
