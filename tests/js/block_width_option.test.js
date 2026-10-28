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
 * Tests of the width option of the blocks that hold little, run via `node --test`.
 *
 * Regression guard for a request: the profile card, the charts, the steps, the timeline, the comparison, the card and
 * the resources were capped, the table was not, and a teacher could not choose. The option lets each be reduced or
 * take the whole column, and a block saved before the option must look as it always did.
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

// Block file, template, popup that holds the field, default of the block.
const BLOCKS = [
    ['profilecard', 'block_profilecard', 'popup_profilecard_content', 'reduced'],
    ['chart', 'block_chart', 'popup_chart_edit', 'reduced'],
    ['chart_bar', 'block_chart_bar', 'popup_chart_bar_edit', 'reduced'],
    ['infographic_steps', 'block_infographic_steps', 'popup_infographic_steps_edit', 'reduced'],
    ['infographic_timeline', 'block_infographic_timeline', 'popup_infographic_timeline_edit', 'reduced'],
    ['infographic_comparison', 'block_infographic_comparison', 'popup_infographic_comparison_edit', 'reduced'],
    ['card', 'block_card', 'popup_card_design', 'reduced'],
    ['resources', 'block_resources', 'popup_resources_general', 'reduced'],
    ['table', 'block_table', 'popup_table_design', 'full'],
    ['heading', 'block_heading', 'popup_heading', 'full'],
    ['callout', 'block_callout', 'popup_callout_design', 'full'],
];

let width;

test.before(async() => {
    width = await import(require.resolve('../../amd/src/blocks/block_width.js'));
});

test('only a known width is drawn; anything else becomes the default of the block', () => {
    assert.equal(width.normalizeWidth('full', 'reduced'), 'full');
    assert.equal(width.normalizeWidth('reduced', 'full'), 'reduced');
    assert.equal(width.normalizeWidth('"><img src=x onerror=alert(1)>', 'reduced'), 'reduced');
    assert.equal(width.normalizeWidth(undefined, 'full'), 'full');
    assert.equal(width.normalizeWidth(null, 'reduced'), 'reduced');
});

test('the popup flags select exactly one option', () => {
    assert.deepEqual(width.widthVars('full', 'reduced'), {widthReduced: false, widthFull: true});
    assert.deepEqual(width.widthVars('reduced', 'full'), {widthReduced: true, widthFull: false});
    assert.deepEqual(width.widthVars('nope', 'full'), {widthReduced: false, widthFull: true});
});

test('the field of an open popup changes the block and redraws it', () => {
    let listener = null;
    const popup = {querySelector: (selector) => (selector === '#pop_block_width' ?
        {addEventListener: (type, fn) => {
            assert.equal(type, 'input');
            listener = fn;
        }} : null)};
    const data = {width: 'reduced'};
    const redraws = [];

    width.bindWidth(popup, data, (value) => redraws.push(value.width));
    listener({target: {value: 'full'}});
    listener({target: {value: 'evil'}});

    assert.equal(data.width, 'full', 'an unknown value keeps the last one');
    assert.deepEqual(redraws, ['full', 'full']);
});

test('a popup without the field is left alone', () => {
    assert.doesNotThrow(() => width.bindWidth({querySelector: () => null}, {}, () => null));
});

BLOCKS.forEach(([block, template, popup, fallback]) => {
    test(`${block}: the width is stored, drawn as a class and chosen in the popup`, () => {
        const source = read(`amd/src/blocks/${block}.js`);

        assert.match(source, new RegExp(`\\n\\s+width: '${fallback}',`), 'default of the block');
        assert.match(source, new RegExp(`widthVars\\(data\\.width, '${fallback}'\\)`));
        assert.match(source, /bindWidth\(popup, data, onUpdate\);/);
        assert.match(source, new RegExp(`normalizeWidth\\(data\\.width, '${fallback}'\\)`));
        assert.match(read(`templates/${template}.mustache`), /slms-width-\{\{width\}\}/);
        assert.match(read(`templates/${popup}.mustache`), /\{\{> tiny_studiolms\/popup_block_width\}\}/);
    });
});

['styles.css', 'editor_styles.css'].forEach((file) => {
    test(`${file}: "full" lifts the cap of every capped block and "reduced" caps the table`, () => {
        const css = read(file);
        const lift = /([^{}]*)\{\s*max-width: none;\s*\}/g;
        let selectors = '';
        let match = lift.exec(css);
        while (match) {
            selectors += match[1];
            match = lift.exec(css);
        }

        [
            '.studiolms-profilecard.slms-width-full', '.slms-chart-block.slms-width-full',
            '.slms-chart-bar-block.slms-width-full', '.slms-infographic-steps--vertical.slms-width-full',
            '.slms-infographic-timeline-block.slms-width-full', '.slms-infographic-comparison-block.slms-width-full',
            '.studiolms-resources-wrap.slms-width-full', '.studiolms-card-wrap.slms-width-full > .studiolms-card',
        ].forEach((selector) => assert.ok(selectors.includes(selector), selector));
        ['table', 'heading', 'callout'].forEach((name) => {
            assert.match(css, new RegExp(`\\.studiolms-${name}-wrap\\.slms-width-reduced[,\\s{]`), name);
        });
        assert.match(css, /\.studiolms-callout-wrap\.slms-width-reduced \{\s+max-width: 720px;\s+margin-inline: auto;/);
    });

    test(`${file}: the resources are capped by a class, not by a style attribute that nothing could lift`, () => {
        assert.match(read(file), /\.studiolms-resources-wrap \{\s+max-width: 900px;/);
        assert.ok(!read('templates/block_resources.mustache').includes('max-width: 900px'));
    });
});
