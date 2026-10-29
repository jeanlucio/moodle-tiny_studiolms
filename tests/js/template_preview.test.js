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
 * Headless tests for the document drawn in the thumbnail of a template card, run via `node --test`.
 *
 * @package    tiny_studiolms
 * @copyright  2026 Jean Lúcio
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const load = () => import('../../amd/src/template_preview.js');

// A stand-in for a CSSStyleRule and for a CSSMediaRule, as the browser hands them over.
const styleRule = (selectorText, cssText = `${selectorText} { color: red; }`) => ({selectorText, cssText});
const mediaRule = (conditionText, rules) => ({cssText: `@media ${conditionText} { ... }`, conditionText, cssRules: rules});

test('only the rules of the blocks are collected, not the dialog and not the rest of the theme', async() => {
    const {collectBlockCss} = await load();

    const css = collectBlockCss([{cssRules: [
        styleRule('.studiolms-profilecard .slms-pc-link'),
        styleRule('.card'),
        styleRule('.tiny_studiolms .slms-tpl-card'),
        styleRule('.slms-sidebar .slms-card'),
        styleRule('.studiolms-btn:hover, .tiny_studiolms .x'),
        styleRule(':root', ':root { --slms-brand: #0d47a1; }'),
        styleRule(':root', ':root { --bs-body-bg: #fff; }'),
    ]}]);

    assert.ok(css.includes('.studiolms-profilecard .slms-pc-link'));
    assert.ok(css.includes('.studiolms-btn:hover'));
    assert.ok(css.includes('--slms-brand'));
    assert.ok(!css.includes('.card {'));
    assert.ok(!css.includes('.slms-tpl-card'));
    assert.ok(!css.includes('.slms-sidebar'));
    assert.ok(!css.includes('--bs-body-bg'));
});

test('a media query keeps its condition around the rules of the blocks and is dropped when it has none', async() => {
    const {collectBlockCss} = await load();

    const css = collectBlockCss([{cssRules: [
        mediaRule('(max-width: 575.98px)', [styleRule('.studiolms-gridcards')]),
        mediaRule('(min-width: 1400px)', [styleRule('.navbar')]),
    ]}]);

    assert.ok(css.includes('@media (max-width: 575.98px)'));
    assert.ok(css.includes('.studiolms-gridcards'));
    assert.ok(!css.includes('1400px'));
});

test('a sheet that cannot be read is skipped and the others still count', async() => {
    const {collectBlockCss} = await load();
    const blocked = {get cssRules() {
        throw new Error('SecurityError');
    }};

    assert.ok(collectBlockCss([blocked, {cssRules: [styleRule('.studiolms-btn')]}]).includes('.studiolms-btn'));
    assert.equal(collectBlockCss([blocked]), '');
});

test('only the theme sheet is linked when the rules cannot be read, and only from a web address', async() => {
    const {previewStylesheets} = await load();
    const scriptScheme = ['java', 'script'].join('') + ':alert(1)';

    assert.deepEqual(
        previewStylesheets([
            'https://x.test/theme/styles.php/boost/1/all',
            'https://x.test/theme/yui_combo.php?3.18.1/cssbutton/cssbutton-min.css',
            'https://x.test/lib/editor/tiny/loader.php/1/skins/ui/oxide/skin.min.css',
            scriptScheme, 'data:text/css,a{}', '', null,
        ]),
        ['https://x.test/theme/styles.php/boost/1/all']
    );
});

test('the document carries the rules of the blocks before the content, so the classes apply', async() => {
    const {buildPreviewDocument} = await load();

    const doc = buildPreviewDocument('<div class="studiolms-profilecard">x</div>', {css: '.studiolms-profilecard { color: red; }'});

    assert.ok(doc.includes('<style>.studiolms-profilecard { color: red; }</style>'));
    assert.ok(doc.indexOf('<style>.studiolms') < doc.indexOf('<body>'));
    assert.ok(doc.includes('<body><div class="studiolms-profilecard">x</div></body>'));
});

test('the rules cannot close the style tag, and an address cannot break out of the href attribute', async() => {
    const {buildPreviewDocument} = await load();

    const doc = buildPreviewDocument('', {
        css: '.a { content: "</style><script>1</script>"; }',
        stylesheets: ['https://x.test/a.css?a=1&b="><script>1</script>'],
    });

    // Only the two style tags of the document itself close: the one with the rules and the one of the frame.
    assert.equal(doc.split('</style>').length - 1, 2);
    assert.ok(doc.includes('a=1&amp;b=&quot;&gt;&lt;script&gt;'));
});

test('without rules or stylesheets the content is still shown', async() => {
    const {buildPreviewDocument} = await load();

    assert.ok(buildPreviewDocument('<p>a</p>').includes('<body><p>a</p></body>'));
});
