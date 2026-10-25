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
 * Guard test for the layout options of the card, run via `node --test`.
 *
 * The media can be above, beside, after the text or below it, and the coloured accent on the side can be off.
 * Both are classes, which the purifier keeps. The block needs the Moodle AMD loader, so the test reads the
 * sources.
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

test('the media popup offers the four positions and the block knows them', () => {
    const popup = read('templates/popup_card_media.mustache');
    ['vertical', 'horizontal', 'horizontal_end', 'vertical_end'].forEach((value) => {
        assert.ok(popup.includes(`<option value="${value}"`), `option ${value}`);
    });
    const block = read('amd/src/blocks/card.js');
    assert.match(block, /data\.layout === 'horizontal' \|\| data\.layout === 'horizontal_end'/);
    assert.match(block, /data\.layout === 'horizontal_end' \|\| data\.layout === 'vertical_end'/);
});

test('a card saved before the accent could be turned off keeps it', () => {
    const block = read('amd/src/blocks/card.js');
    assert.match(block, /accent: true,/);
    assert.match(block, /templateData\.accent = data\.accent !== false;/);
    assert.match(block, /tplData\.accent = data\.accent !== false;/);
});

test('the border colour goes with the accent it colours', () => {
    const popup = read('templates/popup_card_design.mustache');
    assert.match(popup, /id="pop_card_accent"/);
    assert.match(popup, /id="pop_card_border_row" class="[^"]*\{\{\^accent\}\} d-none\{\{\/accent\}\}"/);
    assert.match(read('amd/src/blocks/card.js'), /toggle\('d-none', !accentEl\.checked\)/);
});

test('the stylesheets lay the media out for every position, on a narrow screen too, and the editor copy is the same', () => {
    ['styles.css', 'editor_styles.css'].forEach((file) => {
        const css = read(file);
        assert.match(css, /\.studiolms-card\.slms-media-end \{\s*flex-direction: column-reverse;/);
        assert.match(css, /\.studiolms-card\.slms-horizontal\.slms-media-end \{\s*flex-direction: row-reverse;/);
        assert.match(css, /\.studiolms-card\.slms-no-accent \{\s*border-inline-start: 1px solid/);
        // Narrow screens keep the media after the text, and the editor frame is left as authored.
        assert.match(
            css,
            /body:not\(\.mce-content-body\) \.studiolms-card\.slms-horizontal\.slms-media-end \{\s*flex-direction: column-reverse;/
        );
    });
});

test('the strings of the options exist in both languages', () => {
    ['card_accent', 'layout_horizontal_end', 'layout_vertical_end'].forEach((key) => {
        ['en', 'pt_br'].forEach((lang) => {
            assert.ok(read(`lang/${lang}/tiny_studiolms.php`).includes(`$string['${key}'] = `), `${lang} ${key}`);
        });
    });
});
