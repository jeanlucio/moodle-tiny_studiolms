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
 * Guard test for the stripe of the items of the resources block, run via `node --test`.
 *
 * Regression test: the stripe on the left of each item always took the colour of its media type (red, orange,
 * purple, blue), which clashes with any palette chosen for the block. The block now has a field: the stripe follows
 * the media type, as before, or the colour of the block. Blocks saved without the field keep the media type.
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

test('a new block follows the media type, and a block saved before the field does too', () => {
    const source = read('amd/src/blocks/resources.js');

    assert.match(source, /defaultData: \{[\s\S]*?\n\s+stripe: 'type',/);
    assert.match(source, /const stripeColor = data\.stripe === 'block' \? data\.color : typeColor;/);
    assert.match(source, /tplData\.stripeBlock = data\.stripe === 'block';/);
    assert.match(source, /tplData\.stripeType = data\.stripe !== 'block';/);
    assert.match(source, /'#pop_res_stripe': 'stripe',/);
});

test('the item and the popup use it', () => {
    assert.match(read('templates/block_resources.mustache'), /border-left-color: \{\{stripeColor\}\};/);

    const popup = read('templates/popup_resources_general.mustache');
    assert.match(popup, /id="pop_res_stripe"/);
    assert.match(popup, /value="type" \{\{#stripeType\}\}selected\{\{\/stripeType\}\}/);
    assert.match(popup, /value="block" \{\{#stripeBlock\}\}selected\{\{\/stripeBlock\}\}/);
});

['en', 'pt_br'].forEach((lang) => {
    test(`${lang}: the three strings are there, in order`, () => {
        const keys = read(`lang/${lang}/tiny_studiolms.php`).split('\n')
            .map((line) => line.match(/^\$string\['(resources_[a-z_]+)'\]/)?.[1]).filter(Boolean);
        const at = keys.indexOf('resources_stripe');

        assert.ok(at > 0);
        assert.deepEqual(keys.slice(at, at + 3), ['resources_stripe', 'resources_stripe_block', 'resources_stripe_type']);
        assert.deepEqual(keys, [...keys].sort());
    });
});

['pt_br/encontros_sincronos', 'pt_br/encontros_sincronos_verde', 'en/live_sessions', 'en/live_sessions_green'].forEach((file) => {
    test(`${file}: the layout uses the colour of the block for the stripes`, () => {
        const block = JSON.parse(read(`presets/${file}.json`)).blocks.find((item) => item.type === 'resources');

        assert.equal(block.config.stripe, 'block');
    });
});

test('the icon of an item is a Font Awesome icon in the colour of the stripe, not an emoji', () => {
    const source = read('amd/src/blocks/resources.js');
    const template = read('templates/block_resources.mustache');

    ['fa-file-pdf', 'fa-circle-play', 'fa-headphones', 'fa-link'].forEach((name) => assert.ok(source.includes(`'${name}'`), name));
    assert.ok(!/icon = '[^']*'/.test(source), 'no emoji assigned as the icon of a type');
    assert.match(
        template,
        /<i class="fa-solid \{\{iconClass\}\} fa-fw me-3 fs-5" aria-hidden="true" style="color: \{\{stripeColor\}\};"><\/i>/
    );
    assert.match(template, /<i class="fa-solid fa-book me-2" aria-hidden="true"><\/i>/);
});
