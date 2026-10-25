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
 * Guard test for typing in a block's preview on the canvas, run via `node --test`.
 *
 * Regression test: the text fields of a block in the canvas could be typed in or not, depending on where the
 * browser put the caret for that content, and what was typed never reached the block's configuration, so it
 * vanished at the next redraw and was not inserted. app.js needs the editor and the Moodle AMD loader, so it
 * cannot run headless; the test checks the rules that keep the typing and the configuration together.
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

test('what is typed in the preview goes back to the configuration, through the stored-template filter', () => {
    const app = read('amd/src/app.js');
    const sync = app.slice(app.indexOf('const syncPreviewText'), app.indexOf('const wirePreviewEditing'));

    assert.match(sync, /sanitizeUntrustedHtml\(root\.outerHTML\)/);
    assert.match(sync, /entry\.blockDef\.extractDOM\(clean, entry\.config\);/);
    assert.match(app, /entry\.previewEl = previewEl;\s*wirePreviewEditing\(entry\);/);
});

test('only the text fields sync, never the columns of a grid, and a one-line field takes no line break', () => {
    const app = read('amd/src/app.js');
    const wire = app.slice(app.indexOf('const wirePreviewEditing'), app.indexOf('const renderBlockPreview'));

    assert.match(wire, /closest\?\.\('\[contenteditable="true"\]'\)/);
    assert.match(wire, /!field\.closest\('\.slms-grid-slot'\)/);
    assert.match(wire, /event\.key === 'Enter' && field && field\.tagName === 'SPAN'/);
    assert.match(wire, /closest\?\.\('a'\)[\s\S]*preventDefault\(\)/);
});

test('the stylesheets let the pointer reach the text fields and nothing else of the preview', () => {
    ['styles.css', 'editor_styles.css'].forEach((file) => {
        const css = read(file);

        assert.match(css, /\.slms-canvas-block-preview \{\s*padding: 0\.75rem;\s*pointer-events: none;/);
        assert.match(
            css,
            /\.slms-canvas-block-preview \[contenteditable="true"\] \{\s*pointer-events: auto;\s*cursor: text;/
        );
    });
});
