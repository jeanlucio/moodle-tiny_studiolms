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
 * Guard test for the link fields of the profile card popup, run via `node --test`.
 *
 * The label and the address of a link sat side by side in a flex row. The label was fixed at 90px and the address
 * field cannot shrink below its own minimum width, so the row was wider than the sidebar of the Studio and the
 * sidebar got a horizontal scrollbar that hid most of the address. Each link is now a label field above an
 * address field, and each field has a name of its own for a screen reader (a placeholder is not a label).
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

test('each link of the profile card is a stacked pair of fields with a name each', () => {
    const popup = read('templates/popup_profilecard_content.mustache').replace(/\{\{!.*?\}\}/gs, '');

    assert.equal(popup.match(/class="slms-link-pair"/g).length, 6);
    assert.doesNotMatch(popup, /slms-input-label/);
    for (let n = 0; n < 6; n++) {
        const number = n + 1;
        assert.match(popup, new RegExp(`id="pop_pc_link${n}label"[^>]*\\s+aria-label="\\{\\{#str\\}\\} profilecard_link_label_n, `
            + `tiny_studiolms, ${number} \\{\\{/str\\}\\}"`, 's'), `label ${number}`);
        assert.match(popup, new RegExp(`id="pop_pc_link${n}url"[^>]*\\s+aria-label="\\{\\{#str\\}\\} profilecard_link_url_n, `
            + `tiny_studiolms, ${number} \\{\\{/str\\}\\}"`, 's'), `address ${number}`);
    }
});

test('the strings of the link fields exist in both languages and the stylesheet has the pair', () => {
    ['en', 'pt_br'].forEach((lang) => {
        const strings = read(`lang/${lang}/tiny_studiolms.php`);

        ['profilecard_link_label_n', 'profilecard_link_n', 'profilecard_link_url_n'].forEach((key) => {
            assert.ok(strings.includes(`$string['${key}'] = `), `${lang} ${key}`);
        });
    });
    ['styles.css', 'editor_styles.css'].forEach((file) => {
        const css = read(file);

        assert.match(css, /\.tiny_studiolms \.slms-link-pair \{/, file);
        assert.doesNotMatch(css, /\.slms-input-label/, file);
    });
});

test('the card has six contact links, in its defaults, its settings and its markup', () => {
    const block = read('amd/src/blocks/profilecard.js');

    for (let n = 0; n < 6; n++) {
        assert.match(block, new RegExp(`link${n}label: '',\\n\\s+link${n}url:\\s+'',`), `default ${n}`);
    }
    // The slots are listed once: the settings and the markup read the same six.
    assert.match(block, /const LINK_SLOTS = \[0, 1, 2, 3, 4, 5\];/);
    assert.match(block, /textFields\[`#pop_pc_link\$\{i\}label`\] = `link\$\{i\}label`;/);
    assert.match(block, /const links = LINK_SLOTS\n\s+\.filter\(/);
    assert.match(read('classes/ai/generator.php'), /link3label \/ link3url, link4label \/ link4url, link5label \/ link5url/);
});
