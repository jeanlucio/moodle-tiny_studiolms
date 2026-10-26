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
 * Guard test for loading a template into the canvas, run via `node --test`.
 *
 * A template of twelve blocks was added one block at a time, and each addition selected its block: the canvas grew
 * in twelve steps, the toolbar and the settings panel were rebuilt twenty-four times and the highlight jumped from
 * block to block, which showed as a rapid flicker. The blocks are now built into a detached fragment that is added
 * once, and one block is selected once. app.js needs Moodle's modules, so this reads the source.
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
const app = fs.readFileSync(require.resolve('../../amd/src/app.js'), 'utf8');

test('a staged block is neither selected nor scrolled to, and leaves the empty placeholder alone', () => {
    const add = app.slice(app.indexOf('const addBlockToCanvas = async('), app.indexOf('const syncPreviewText'));

    assert.match(add, /stage = null\) => \{/);
    assert.match(add, /\(stage \|\| blocksList\)\.appendChild\(blockEl\);/);
    assert.match(add, /if \(stage\) \{\s*return;\s*\}\s*selectCanvasBlock\(blockId\);/);
    assert.match(add, /const emptyState = stage \? null : /);
    assert.match(add, /const raceEmptyState = stage \? null : /);
});

test('only the blocks at the top of a template are loaded, not the ones inside the columns of a grid', () => {
    const from = app.indexOf('export const loadTemplateToCanvas = async(');
    const load = app.slice(from, app.indexOf('const renderSingleBlockForInsert'));

    assert.match(load, /\[\.\.\.parsed\.body\.querySelectorAll\('\[data-slms-block-type\]'\)\]/);
    assert.match(load, /\.filter\(\(el\) => !el\.parentElement\?\.closest\('\[data-slms-block-type\]'\)\);/);
});

test('a template is built into one fragment, added once and one block is selected once', () => {
    const from = app.indexOf('export const loadTemplateToCanvas = async(');
    const load = app.slice(from, app.indexOf('const renderSingleBlockForInsert'));

    assert.match(load, /const stage = document\.createDocumentFragment\(\);/);
    assert.match(load, /await stageTemplateBlock\(el, stage\);/);
    assert.match(load, /\} finally \{[^}]*blocksList\.appendChild\(stage\);/s);
    assert.equal(load.match(/selectCanvasBlock\(/g).length, 1);
    assert.doesNotMatch(load, /addBlockToCanvas\(/);
    assert.match(app, /await addBlockToCanvas\(blockDef, blockConfig, true, stage\);/);
});

test('a block saved under a name it had before the first release is still found', () => {
    const registry = fs.readFileSync(require.resolve('../../amd/src/blocks/registry.js'), 'utf8');

    assert.match(registry, /const BLOCK_ALIASES = \{webteca: 'resources'\};/);
    assert.match(registry, /export const blockForType = \(type\) => \{/);
    assert.equal((app.match(/blockForType\(/g) || []).length, 2);
    assert.doesNotMatch(app, /Blocks\[(editData\.type|type)\]/);
});
