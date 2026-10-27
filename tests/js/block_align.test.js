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
 * Guard test for the alignment of the blocks that are narrower than the page, run via `node --test`.
 *
 * Regression test: the profile card, the charts, the steps, the timeline, the comparison, the card and the list of
 * resources stop short of the page width, and the TinyMCE alignment buttons cannot move them (a block is not editable
 * text, so the command changes nothing). Each block carries its own align field, set in its design popup, drawn as a
 * class on the block.
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

// Block file, root template, popup template and what the block did before it had the field.
const BLOCKS = [
    ['profilecard', 'block_profilecard', 'popup_profilecard_content', 'center'],
    ['chart', 'block_chart', 'popup_chart_edit', 'center'],
    ['chart_bar', 'block_chart_bar', 'popup_chart_bar_edit', 'center'],
    ['infographic_steps', 'block_infographic_steps', 'popup_infographic_steps_edit', 'center'],
    ['infographic_timeline', 'block_infographic_timeline', 'popup_infographic_timeline_edit', 'center'],
    ['infographic_comparison', 'block_infographic_comparison', 'popup_infographic_comparison_edit', 'center'],
    ['card', 'block_card', 'popup_card_design', 'left'],
    ['resources', 'block_resources', 'popup_resources_general', 'left'],
    ['gauge', 'block_gauge', 'popup_gauge_edit', 'center'],
    ['infographic', 'block_infographic', 'popup_infographic_edit', 'center'],
];

let align;

test.before(async() => {
    // The module imports nothing, so Node can load it as it stands.
    align = await import(require.resolve('../../amd/src/blocks/block_align.js'));
});

test('a stored value that is not one of the three falls back to the default of the block', () => {
    ['left', 'center', 'right'].forEach((value) => assert.equal(align.normalizeAlign(value, 'left'), value));
    ['', undefined, null, 'full', 'x" onclick="y', 'LEFT'].forEach((value) => {
        assert.equal(align.normalizeAlign(value, 'center'), 'center');
    });
});

test('the popup flags select exactly one option', () => {
    assert.deepEqual(align.alignVars('right', 'left'), {alignLeft: false, alignCenter: false, alignRight: true});
    assert.deepEqual(align.alignVars(undefined, 'left'), {alignLeft: true, alignCenter: false, alignRight: false});
});

test('the popup field changes the data and redraws the block', () => {
    let listener = null;
    const popup = {querySelector: (selector) => (selector === '#pop_block_align' ?
        {addEventListener: (type, fn) => {
            assert.equal(type, 'input');
            listener = fn;
        }} : null)};
    const data = {align: 'center'};
    const calls = [];

    align.bindAlign(popup, data, (updated) => calls.push(updated.align));
    listener({target: {value: 'right'}});
    listener({target: {value: 'nonsense'}});

    // An unknown value never reaches the data.
    assert.deepEqual(calls, ['right', 'right']);
    assert.equal(data.align, 'right');
});

test('the text-align the editor buttons write on a heading is read back as a known alignment', () => {
    ['left', 'center', 'right'].forEach((value) => assert.equal(align.alignFromTextAlign(value), value));
    assert.equal(align.alignFromTextAlign(' Center '), 'center');
    ['justify', 'start', '', undefined, null].forEach((value) => assert.equal(align.alignFromTextAlign(value), null));
});

test('a popup without the field is left alone', () => {
    assert.doesNotThrow(() => align.bindAlign({querySelector: () => null}, {}, () => null));
});

BLOCKS.forEach(([file, template, popup, fallback]) => {
    test(`${file}: the field is stored, drawn as a class and set in the popup`, () => {
        const source = read(`amd/src/blocks/${file}.js`);

        assert.match(source, /import \{alignVars, bindAlign, normalizeAlign\} from '\.\/block_align';/);
        assert.match(source, new RegExp(`defaultData: \\{\\n\\s+align: '${fallback}',`));
        assert.match(source, new RegExp(`alignVars\\(data\\.align, '${fallback}'\\)`));
        assert.match(source, new RegExp(`normalizeAlign\\(data\\.align, '${fallback}'\\)`));
        assert.match(source, /bindAlign\(popup, data, onUpdate\);/);

        assert.match(read(`templates/${template}.mustache`), /class="[^"]*\bslms-align-\{\{align\}\}/);
        assert.match(read(`templates/${popup}.mustache`), /\{\{> tiny_studiolms\/popup_block_align\}\}/);
    });
});

['styles.css', 'editor_styles.css'].forEach((file) => {
    test(`${file}: every aligned block has a rule for left, centre and right`, () => {
        const css = read(file);
        const margins = {left: '0 auto', center: 'auto', right: 'auto 0'};

        Object.entries(margins).forEach(([value, margin]) => {
            const start = css.indexOf(`.studiolms-profilecard.slms-align-${value},`);
            assert.ok(start >= 0, `a ${value} rule`);
            const rule = css.slice(start, css.indexOf('}', start));

            ['.slms-chart-block', '.slms-chart-bar-block', '.slms-infographic-steps--vertical',
                '.slms-infographic-timeline-block', '.slms-infographic-comparison-block', '.studiolms-resources-wrap',
            ].forEach((selector) => assert.ok(rule.includes(`${selector}.slms-align-${value},`), `${selector} ${value}`));
            // The card is inside its wrap, which is as wide as the page.
            assert.ok(rule.includes(`.studiolms-card-wrap.slms-align-${value} > .studiolms-card`), `card ${value}`);
            assert.ok(rule.includes(`margin-inline: ${margin};`), `${value} margin`);
        });
    });
});

test('heading: the field moves icon and text together and keeps what the editor buttons wrote', () => {
    const source = read('amd/src/blocks/heading.js');
    const template = read('templates/block_heading.mustache');

    assert.match(source, /defaultData: \{\n\s+align: 'left',/);
    assert.match(source, /alignFromTextAlign\(node\.querySelector\('h3, h4'\)\?\.style\.textAlign\)/);
    assert.match(source, /bindAlign\(popup, data, onUpdate\);/);
    assert.match(template, /class="studiolms-heading-wrap w-100 slms-align-\{\{align\}\}/);
    // Bootstrap's flex-grow-1 is !important, so the text only grows on the left, where it always did.
    assert.equal(template.match(/slms-heading-text\{\{#alignLeft\}\} flex-grow-1\{\{\/alignLeft\}\}/g).length, 2);
    assert.match(read('templates/popup_heading.mustache'), /\{\{> tiny_studiolms\/popup_block_align\}\}/);
});

['styles.css', 'editor_styles.css'].forEach((file) => {
    test(`${file}: heading, gauge and stat cards have a rule for the ends of the row`, () => {
        const css = read(file);

        assert.ok(css.includes('.studiolms-heading-wrap.slms-align-center .studiolms-heading-h3,'));
        assert.ok(css.includes('.studiolms-heading-wrap.slms-align-right .studiolms-heading-h4 {'));
        ['left', 'right'].forEach((value) => {
            const start = css.indexOf(`.slms-gauge-block.slms-align-${value} .slms-gauge__row,`);
            assert.ok(start >= 0, `gauge ${value}`);
            const rule = css.slice(start, css.indexOf('}', start));
            assert.ok(rule.includes(`.slms-infographic--stats.slms-align-${value} .slms-infographic__grid`), `stats ${value}`);
        });
    });
});
