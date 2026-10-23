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
 * Headless guard against visible text written into the JavaScript, run via `node --test`.
 *
 * Text a teacher sees must come from a language string: a literal in a block definition reaches the
 * course in the wrong language for part of the sites and no language pack can translate it. This
 * scans amd/src for the two shapes it took: an example label in an object literal (label, title,
 * topic, description, col1, col2) and a capitalized word used as a fallback after "||". Enum values
 * such as 'blue' or 'horizontal' are lower case and are not matched.
 *
 * @package    tiny_studiolms
 * @copyright  2026 Jean Lúcio
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// Located through a source file, so the test works from any working directory.
const SRC = path.dirname(require.resolve('../../amd/src/htmlsanitizer.js'));

/** Visible-text property with a non-empty string literal, e.g. title: 'Event 1'. */
const LABEL = /\b(label|title|topic|description|col1|col2)\s*:\s*'[A-Za-z\u00C0-\u00FF][^']*'/;

/** A capitalized word used as the value after "||", e.g. || 'Imported'. */
const FALLBACK = /\|\|\s*'[A-Z\u00C0-\u00DD][^']*'/;

const jsFiles = (dir) => fs.readdirSync(dir, {withFileTypes: true}).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
        return jsFiles(full);
    }
    return entry.name.endsWith('.js') ? [full] : [];
});

test('no visible text is written into the JavaScript sources', () => {
    const hits = [];
    jsFiles(SRC).forEach((file) => {
        fs.readFileSync(file, 'utf8').split('\n').forEach((line, index) => {
            const code = line.trim();
            if (code.startsWith('//') || code.startsWith('*') || code.startsWith('/*')) {
                return;
            }
            if (LABEL.test(code) || FALLBACK.test(code)) {
                hits.push(`${path.relative(SRC, file)}:${index + 1}: ${code}`);
            }
        });
    });
    assert.deepEqual(hits, [], 'Move these texts to lang/en and lang/pt_br and read them with getString().');
});

test('the guard itself recognises the shapes it is meant to catch', () => {
    assert.ok(LABEL.test("{label: 'Aprovados', value: 75}"));
    assert.ok(LABEL.test("title: 'Event 1', description: ''"));
    assert.ok(FALLBACK.test("name: String(t.name ?? '') || 'Imported'"));
    assert.ok(!LABEL.test("label: '', value: 1"));
    assert.ok(!LABEL.test("title: defaultText('default_step_title', 1)"));
    assert.ok(!FALLBACK.test("data.theme || 'blue'"));
});
