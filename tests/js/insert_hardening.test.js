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
 * Guard tests for two places the security audit of 2026-10-27 pointed at, run via `node --test`.
 *
 * Regression tests: (1) the address and target of a block were validated when the block entered the canvas, but what
 * the teacher typed into a popup afterwards went into the HTML for the editor and into the saved state unchecked, so the
 * validation now also runs where every block is rendered for the editor; (2) the template grid had a branch that put a
 * template into the editor with no filtering, reached only if a caller left out the callback that every caller passes,
 * and it is gone: the callback is required.
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
const read = (file) => fs.readFileSync(require.resolve(`../../${file}`), 'utf8');

test('a block is rendered for the editor from a configuration whose addresses and targets were checked', () => {
    const app = read('amd/src/app.js');
    const start = app.indexOf('const renderSingleBlockForInsert = async(blockDef, rawConfig) => {');

    assert.ok(start > 0, 'the function takes the raw configuration');
    const body = app.slice(start, app.indexOf('\n};', start));
    assert.match(body, /const config = sanitizeUrlFields\(rawConfig\);/);
    assert.match(body, /await blockDef\.renderHtml\(config\)/);
    assert.match(body, /StateManager\.encode\(config, excludeKeys\)/);
    const inside = body.slice(body.indexOf('\n')).replace('const config = sanitizeUrlFields(rawConfig);', '');
    assert.ok(!inside.includes('rawConfig'), 'the raw configuration is used only there');
});

test('the template grid has no way to put a template into the editor without the canvas', () => {
    const library = read('amd/src/templateslibrary.js');

    assert.ok(!library.includes('handleInsertTemplate'), 'the unfiltered branch is gone');
    assert.match(library, /export const renderTemplateGrid = async\(container, templates, options = \{\}\) => \{/);
    assert.match(library, /if \(typeof options\.onLoadToCanvas !== 'function'\) \{\s+throw new Error\(/);
    assert.match(read('amd/src/app.js'), /await renderTemplateGrid\(grid, templates, \{\s+onLoadToCanvas: loadTemplateToCanvas,/);
});

test('only one place inserts HTML into the editor, and it is the insertion of what the canvas built', () => {
    const dir = path.dirname(require.resolve('../../amd/src/app.js'));
    const files = fs.readdirSync(dir, {recursive: true}).filter((name) => name.endsWith('.js'));
    const found = files.filter((name) => /\b(insertContent|setContent)\(/.test(fs.readFileSync(path.join(dir, name), 'utf8')));

    assert.deepEqual(found, ['app.js']);
});
