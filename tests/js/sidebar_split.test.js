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
 * Guard test for the handle between the settings and the component list, run via `node --test`.
 *
 * The arrows that move the line sit on the line itself, like the handle beside the canvas. In the middle both
 * are there; at either end only the one that comes back is left, and when the arrow that had the keyboard focus
 * is the one that goes, the focus moves to the one that stays. app.js needs the editor and the Moodle AMD loader,
 * so it cannot run headless; the test checks those rules in the source.
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

test('the arrows sit in a handle on the line above the component list', () => {
    const template = read('templates/modal.mustache');
    const heading = template.match(/id="slms-library-heading"[\s\S]*?<\/div>\s*<div class="slms-library-grid"/);

    assert.ok(heading, 'the heading of the list is in the modal template');
    assert.match(heading[0], /class="slms-split-handle"[\s\S]*?id="slms-split-up"[\s\S]*?id="slms-split-down"/);
    assert.ok(heading[0].indexOf('slms-split-handle') < heading[0].indexOf('role="heading"'));
});

test('an arrow with nowhere to go is removed, not left disabled', () => {
    const app = read('amd/src/app.js');

    assert.match(app, /up\.classList\.toggle\('d-none', sidebarSplit === SPLIT_LIST\)/);
    assert.match(app, /down\.classList\.toggle\('d-none', sidebarSplit === SPLIT_PROPERTIES\)/);
    assert.ok(!app.includes('aria-disabled'), 'the arrows are no longer marked as disabled');
    assert.ok(!read('templates/modal.mustache').includes('aria-disabled'));
});

test('the focus moves to the arrow that stays when its own arrow goes', () => {
    const app = read('amd/src/app.js');

    assert.match(app, /const focused = \[up, down\]\.find\(\(arrow\) => arrow === document\.activeElement\);/);
    assert.match(app, /if \(focused\?\.classList\.contains\('d-none'\)\) \{\s*\(focused === up \? down : up\)\.focus\(\);/);
});

test('the handle straddles the line and the list-only state leaves room for it', () => {
    for (const file of ['styles.css', 'editor_styles.css']) {
        const css = read(file);

        assert.match(css, /\.slms-split-handle \{[^}]*position: absolute;[^}]*top: 0;[^}]*height: 0;/s, file);
        assert.match(css, /\.slms-split-controls \{[^}]*transform: translateY\(-50%\);/s, file);
        assert.match(css, /\.slms-split-list \.slms-library-heading \{\s*margin-top: 0\.75rem;/, file);
    }
});

test('the line is a separator the pointer and the keyboard can move', () => {
    const template = read('templates/modal.mustache');
    const line = template.match(/<span id="slms-split-line"[\s\S]*?><\/span>/);

    assert.ok(line, 'the line is in the modal template');
    assert.match(line[0], /role="separator"/);
    assert.match(line[0], /aria-orientation="horizontal"/);
    // The range is given by app.js, not here: the HTML checker of the plugin CI refuses it on the element as written.
    assert.ok(!/aria-value/.test(line[0]), 'the template does not carry aria-value* attributes');
    assert.match(line[0], /tabindex="0"/);
    assert.match(line[0], /aria-keyshortcuts="ArrowUp ArrowDown Home End Enter"/);
});

test('the range of the separator is given by the script, and the value follows the line', () => {
    const app = read('amd/src/app.js');

    assert.match(app, /line\.setAttribute\('aria-valuemin', '0'\);\s*line\.setAttribute\('aria-valuemax', '100'\);/);
    assert.match(app, /line\.setAttribute\('aria-valuenow', String\(splitPercent\(/);
});

test('dragging the line keeps the pointer on it and tells a drag from a click', () => {
    const app = read('amd/src/app.js');

    assert.match(app, /line\.setPointerCapture\(event\.pointerId\)/);
    assert.match(app, /Math\.abs\(delta\) < SPLIT_DRAG_THRESHOLD/);
    assert.match(app, /moveTo\(resolveSplit\(drag\.total, drag\.startHeight \+ delta\)\)/);
    assert.match(app, /line\.addEventListener\('pointercancel', endDrag\)/);
});

test('the keys move, hide and restore, and a double click restores too', () => {
    const app = read('amd/src/app.js');

    for (const key of ['ArrowUp', 'ArrowDown', 'Home', 'End', 'Enter']) {
        assert.ok(app.includes(`event.key === '${key}'`), key);
    }
    assert.match(app, /stepSplit\(sidebarSplit, height, total, -SPLIT_KEY_STEP\)/);
    assert.match(app, /line\.addEventListener\('dblclick'/);
});

test('the height is remembered in the browser and a failure of the storage is not an error', () => {
    const app = read('amd/src/app.js');

    assert.ok(app.includes("'tiny_studiolms.sidebarSplitHeight'"));
    assert.match(app, /parseStoredHeight\(window\.localStorage\.getItem\(SPLIT_HEIGHT_STORAGE_KEY\)\)/);
    assert.match(app, /const storeSplitHeight = \(\) => \{\s*try \{/);
});

test('a height the author set holds only while both areas are shown', () => {
    const app = read('amd/src/app.js');

    assert.match(app, /const explicit = sidebarSplit === SPLIT_BOTH && splitHeight !== null;/);
    for (const file of ['styles.css', 'editor_styles.css']) {
        const css = read(file);

        assert.match(css, /\.slms-has-split-height \.slms-properties-panel \{\s*flex: 0 1 var\(--slms-props-h\);/, file);
        assert.match(css, /\.slms-split-line \{[^}]*touch-action: none;/s, file);
        assert.match(css, /\.slms-split-line \{[^}]*cursor: row-resize;/s, file);
    }
});

test('the labels of the line come from lang strings in both languages', () => {
    for (const file of ['lang/en/tiny_studiolms.php', 'lang/pt_br/tiny_studiolms.php']) {
        const lang = read(file);

        assert.ok(lang.includes("$string['split_line'] = '"), file);
        assert.ok(lang.includes("$string['split_line_hint'] = '"), file);
    }
});

test('the divider beside the canvas shows the resize cursor over the theme\'s pointer for buttons', () => {
    for (const file of ['styles.css', 'editor_styles.css']) {
        const css = read(file);

        // The class alone loses to the reboot's rule for enabled buttons, so the state is named as well.
        assert.match(css, /\.tiny_studiolms \.slms-sidebar-toggle:not\(:disabled\) \{\s*cursor: col-resize;/, file);
        // Collapsed, and in the drawer layout, there is nothing to resize: the hand comes back.
        assert.match(css, /\.slms-sidebar-collapsed \+ \.slms-sidebar-toggle \{\s*cursor: pointer;/, file);
        assert.match(css, /\.slms-sidebar-toggle:not\(:disabled\) \{\s*cursor: pointer;/, file);
    }
});

test('the area under the settings follows the tab and is named after it', () => {
    const app = read('amd/src/app.js');
    const open = app.slice(app.indexOf('open: async(btnElement'));

    // Every tab keeps its content under the settings; none of them hides the list any more.
    assert.ok(!open.includes('showLibrary'), 'no tab is excluded from the area under the settings');
    assert.match(open, /grid\.classList\.remove\('d-none'\);/);
    assert.match(open, /await setLibraryHeading\(/);

    ['components', 'global', 'mine', 'favourites', 'ai-block', 'ai-model', 'ai-chat'].forEach((tab) => {
        assert.match(app, new RegExp(`'${tab}': '[a-z_]+'`), `the bar has a title for the ${tab} tab`);
        assert.match(read('templates/modal.mustache'), new RegExp(`data-slms-tab="${tab}"`));
    });
});

test('the import and export buttons of My templates stay with the list, under the bar', () => {
    const template = read('templates/modal.mustache');

    assert.ok(template.indexOf('id="slms-library-heading"') < template.indexOf('id="slms-tab-toolbar"'));
    assert.ok(template.indexOf('id="slms-tab-toolbar"') < template.indexOf('id="slms-library-grid"'));
    ['styles.css', 'editor_styles.css'].forEach((file) => {
        assert.match(read(file), /slms-split-properties \.slms-sidebar-tab-toolbar/);
    });
});
