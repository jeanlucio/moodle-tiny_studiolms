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
 * Guard test for the blocks inside the columns of a grid, run via `node --test`.
 *
 * Regression test: a block in a column of a grid was a static preview in the Studio window. Its text and its settings
 * could not be changed there, and it could be neither moved nor removed, so to change one the author had to insert the
 * grid, select the block in the editor and open the Studio again. A block in a column is now picked with a click,
 * its own settings replace those of the grid in the toolbar, its text is typed on the canvas, and it can be moved
 * up or down in its column and removed.
 *
 * The code that does it works on the DOM of the window, so what is checked here is that it is wired as it has to be;
 * the behaviour itself was checked in the Studio window of a real Moodle site.
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

test('a click on a block in a column selects it, and a click on the grid itself brings the grid back', () => {
    const app = read('amd/src/app.js');

    // The click handler of a canvas block looks for a nested block first.
    assert.match(app, /const nested = blockDef\.id === 'gridcards' \? nestedBlockAt\(entry, e\) : null;/);
    assert.match(app, /selectNestedBlock\(entry, nested\.slot, nested\.index\);/);
    // With one of its blocks selected the grid is still the active block: a click on the grid must not be ignored.
    assert.match(app, /propertiesOpen && !nestedOfThis/);
    // Picking any other block, or none, forgets the nested one.
    assert.match(app, /const previousNested = nestedSelection;\n\s+nestedSelection = null;/);
    // The block is found by where the pointer is, since what a column holds is inert.
    assert.match(app, /event\.clientX >= box\.left && event\.clientX <= box\.right/);
});

test('the toolbar of a nested block is its own, with the way back to the grid', () => {
    const app = read('amd/src/app.js');

    assert.match(app, /await blockDef\.buildToolbar\(toolbarContainer, selection\.data, onUpdate, PopupManager\);/);
    assert.match(app, /await addNestedBackButton\(toolbarContainer, entry\);/);
    assert.match(app, /button\.addEventListener\('click', \(\) => selectCanvasBlock\(entry\.id\)\);/);
    // The effect tab is shared by the blocks that have none of their own, nested or not.
    assert.match(app, /addInteractivityTab\(toolbarContainer, \(\) => selection\.data, onUpdate\)/);
    assert.match(app, /addInteractivityTab\(toolbarContainer, \(\) => entry\.config, \(\) => renderBlockPreview\(entry\)\)/);
});

test('what is typed in a nested block is stored, and the columns of the grid are not read back from the preview', () => {
    const app = read('amd/src/app.js');

    assert.match(app, /if \(field\.closest\('\.slms-grid-slot'\)\) \{\n\s+syncNestedText\(entry\);/);
    // Only the selected nested block takes typing.
    assert.match(app, /field\.closest\('\.slms-nested-selected'\)/);
    // The preview of a column is decorated, so reading the columns from it would store the decoration.
    assert.match(app, /const slots = entry\.config\.slots;\n\s+entry\.blockDef\.extractDOM\(clean, entry\.config\);/);
    assert.match(app, /if \(entry\.blockDef\.id === 'gridcards'\) \{\n\s+entry\.config\.slots = slots;/);
    // The insert and the template wait for the last write, so the last keystrokes are not lost.
    assert.equal((read('amd/src/app.js').match(/await nestedWrites;\n\s+const parts = \[\];/g) || []).length, 2);
});

test('a nested block can be moved up, moved down and removed, and the new one is selected', () => {
    const app = read('amd/src/app.js');

    assert.match(app, /\['fa-arrow-up', strUp, -1, selection\.index === 0\]/);
    assert.match(app, /\['fa-arrow-down', strDown, 1, selection\.index === blocks\.length - 1\]/);
    assert.match(app, /\['fa-xmark', strRemove, 0, false\]/);
    assert.match(app, /await selectNestedBlock\(gridEntry, slotIndex, blocksOfSlot\(parseSlot\(slots\[slotIndex\]\)\)\.length - 1/);
});

['styles.css', 'editor_styles.css'].forEach((file) => {
    test(`${file}: the selected nested block is outlined, typed in, and has its buttons`, () => {
        const css = read(file);

        assert.match(css, /div\.slms-grid-slot \.slms-nested-selected \{\s*outline: 2px solid/);
        assert.match(css, /\.slms-nested-selected \[contenteditable="true"\] \{\s*pointer-events: auto;/);
        assert.match(css, /\.slms-nested-actions \{\s*position: absolute;\s*top: var\(--slms-nested-top, 0\);/);
        assert.match(css, /\.slms-nested-actions \*? ?\{?[\s\S]*?pointer-events: auto;/);
        // The buttons are placed in the column, which is the box they are placed against.
        assert.match(css, /div\.slms-grid-slot \{\s*position: relative;\s*\}/);
    });
});

test('the way back to the grid has a string in both languages', () => {
    ['en', 'pt_br'].forEach((lang) => {
        assert.match(read(`lang/${lang}/tiny_studiolms.php`), /\$string\['grid_nested_back'\] = '[^']+';/);
    });
});
