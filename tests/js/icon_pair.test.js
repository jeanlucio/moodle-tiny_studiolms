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
 * Tests of the icon pair of an accordion and of a list of resources, run via `node --test`, and guard tests of the
 * resources block that uses it.
 *
 * The resources list drew one icon and turned it a quarter when closed, which is what laid a folder on its side in
 * the accordion; it now draws the same pairs as the accordion, animates the same way and has the same switch.
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

let pair;

test.before(async() => {
    pair = await import(require.resolve('../../amd/src/blocks/icon_pair.js'));
});

test('a pair of two icons is drawn as two, the first closed and the second open', () => {
    assert.deepEqual(pair.iconView('\uD83D\uDCC1 / \uD83D\uDCC2'), {
        iconFirst: '\uD83D\uDCC1', iconSecond: '\uD83D\uDCC2', iconTurns: false,
    });
    assert.deepEqual(pair.iconView('\u2795 / \u2796'), {iconFirst: '\u2795', iconSecond: '\u2796', iconTurns: false});
});

test('a pair of one icon twice is one icon that turns', () => {
    assert.deepEqual(pair.iconView('\u276F / \u276F'), {iconFirst: '\u276F', iconSecond: '\u276F', iconTurns: true});
});

test('the triangle is a plain glyph in the pair that has it', () => {
    assert.deepEqual(pair.iconView('\u25B6 / \u25BC'), {iconFirst: '\u25B6\uFE0E', iconSecond: '\u25BC', iconTurns: false});
});

test('the dropped arrows pair is drawn as the triangles it looked like, and a missing second icon repeats the first', () => {
    assert.equal(pair.iconPair('\u25BC / \u25B2'), '\u25B6 / \u25BC');
    assert.equal(pair.iconPair('\u276F / \u276F'), '\u276F / \u276F');
    assert.equal(pair.iconView('\u276F').iconTurns, true);
});

test('the resources list draws the pairs, animates and can be switched, as the accordion does', () => {
    const block = read('amd/src/blocks/resources.js');
    const template = read('templates/block_resources.mustache');
    const popup = read('templates/popup_resources_general.mustache');

    assert.match(block, /icon: '\u276F \/ \u276F',/);
    assert.match(block, /animate: true,/);
    assert.match(block, /Object\.assign\(templateData, iconView\(data\.icon \|\| '\u276F \/ \u276F'\)\);/);
    assert.match(block, /templateData\.animate = data\.animate !== false;/);
    assert.match(block, /'#pop_res_icon': 'icon'/);
    assert.match(block, /data\.animate = animateEl\.checked;/);
    assert.match(popup, /id="pop_res_icon"/);
    assert.match(popup, /id="pop_res_animate"/);
    assert.ok(!popup.includes('\u25BC / \u25B2'), 'no option for the dropped arrows pair');
    assert.match(template, /slms-acc-icon\{\{#iconTurns\}\} slms-acc-icon-turns\{\{\/iconTurns\}\}/);
    assert.match(template, /\{\{\^animate\}\} slms-static\{\{\/animate\}\}/);
    assert.match(
        template,
        /<div class="studiolms-resources-body">\s*<div contenteditable="false" class="studiolms-resources-content">/
    );
    // The padding used to come from the p-4 utility, which cannot be taken to nothing while the list closes.
    assert.ok(!template.includes('studiolms-resources-content p-4'));
});

test('the stylesheets animate the resources list as the accordion, and the editor copy is the same', () => {
    ['styles.css', 'editor_styles.css'].forEach((file) => {
        const css = read(file);
        assert.match(css, /\.studiolms-resources:not\(\.slms-closed\) \.slms-acc-icon-closed \{\s*opacity: 0;/);
        assert.match(css, /\.studiolms-resources-body \{\s*display: grid;/);
        assert.match(css, /\.studiolms-resources\.slms-closed > \.studiolms-resources-body \{\s*grid-template-rows: 0fr;/);
        assert.match(css, /\.studiolms-resources\.slms-static > \.studiolms-resources-body,/);
        assert.match(css, /\.studiolms-resources-content \{\s*padding: 1\.5rem;/);
    });
});
