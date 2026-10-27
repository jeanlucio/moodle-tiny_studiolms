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
 * Guard test for the shape of the image of the advanced card, run via `node --test`.
 *
 * Regression test: the picture of the card was always a rectangle, cropped to fill its area; the round one existed only
 * in the profile card. The card has a field, Image shape: rectangle, as before, or circle. A card saved before the field
 * has no such key and stays a rectangle, and only an image can be round.
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

test('the card keeps a shape, a rectangle by default, and offers it with the media', () => {
    const card = read('amd/src/blocks/card.js');
    const popup = read('templates/popup_card_media.mustache');

    assert.match(card, /mediaShape: 'rect',/);
    assert.match(card, /'#pop_card_mediaShape': 'mediaShape',/);
    assert.match(card, /tplData\.shapeCircle = data\.mediaShape === 'circle';/);
    assert.match(card, /tplData\.shapeRect = data\.mediaShape !== 'circle';/);
    assert.match(popup, /id="pop_card_mediaShape"/);
    assert.match(popup, /value="circle" \{\{#shapeCircle\}\}selected\{\{\/shapeCircle\}\}/);
});

test('only an image is drawn round, and anything but "circle" is the rectangle', () => {
    const card = read('amd/src/blocks/card.js');

    assert.match(card, /templateData\.mediaCircle = data\.mediaShape === 'circle' && data\.mediaType === 'image';/);
});

test('the template puts a class on the card and drops the important sizes from a round picture', () => {
    const template = read('templates/block_card.mustache');

    assert.match(template, /\{\{#mediaCircle\}\} slms-media-circle\{\{\/mediaCircle\}\}"/);
    assert.match(template, /class="\{\{\^mediaCircle\}\}w-100 h-100 \{\{\/mediaCircle\}\}object-fit-cover d-block"/);
});

['styles.css', 'editor_styles.css'].forEach((file) => {
    test(`${file}: a round picture is 120px with a round border, in every layout`, () => {
        const css = read(file);

        const start = css.indexOf('.studiolms-card.slms-media-circle .slms-card-media-placeholder {');
        assert.ok(start > 0, 'the rule of the picture');
        const rule = css.slice(start, css.indexOf('}', start));
        assert.ok(rule.includes('width: 120px;') && rule.includes('height: 120px;'), 'the size');
        assert.match(css, /border-radius: 50%;\s+object-fit: cover;/);
        ['.slms-media-end', '.slms-horizontal', '.slms-horizontal.slms-media-end'].forEach((layout) => {
            assert.ok(css.includes(`.studiolms-card.slms-media-circle${layout} .studiolms-card-media {`), layout);
        });
        assert.ok(css.includes(
            'body:not(.mce-content-body) .studiolms-card.slms-media-circle.slms-horizontal .studiolms-card-media {'
        ));
    });
});

['en', 'pt_br'].forEach((lang) => {
    test(`${lang}: the three strings are there, in order`, () => {
        const source = read(`lang/${lang}/tiny_studiolms.php`);

        ['media_shape', 'media_shape_circle', 'media_shape_rect'].forEach((key) => {
            assert.ok(source.includes(`$string['${key}'] = `), key);
        });
        const keys = source.split('\n').map((line) => line.match(/^\$string\['([^']+)'\]/)?.[1]).filter(Boolean);
        assert.deepEqual(keys, [...keys].sort());
    });
});
