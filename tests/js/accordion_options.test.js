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
 * Guard test for the accordion options, run via `node --test`.
 *
 * The title is typed on the canvas, so it has no field in the settings; the title bar has a background of its
 * own; the pair of icons is the closed icon and the open one, each shown in its own state, instead of one icon
 * turned a quarter; and the icon opens and closes the accordion on the canvas. The block needs the Moodle AMD
 * loader, so the test reads the sources.
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

test('the title has no field in the settings, since it is typed on the canvas', () => {
    assert.ok(!read('templates/popup_accordion_design.mustache').includes('pop_acc_title'));
    assert.ok(!read('amd/src/blocks/accordion.js').includes('pop_acc_title'));
    assert.match(read('templates/block_accordion.mustache'), /class="slms-acc-title flex-grow-1" contenteditable="true"/);
});

test('the settings are one tab: design, with the state it starts in and the AI generator in it', () => {
    const toolbar = read('templates/toolbar_accordion.mustache');
    const design = read('templates/popup_accordion_design.mustache');
    const block = read('amd/src/blocks/accordion.js');

    assert.ok(!toolbar.includes('tb-acc-content'), 'no tab of its own for what is left of the content');
    assert.match(toolbar, /id="tb-acc-design"/);
    const popupOfTheOldTab = require.resolve('../../templates/toolbar_accordion.mustache')
        .replace('toolbar_accordion', 'popup_accordion_content');
    assert.ok(!fs.existsSync(popupOfTheOldTab), 'the popup of the old tab is gone');
    assert.match(design, /id="pop_acc_state"/);
    assert.match(design, /id="accordion-ai-btn"/);
    assert.match(block, /'#pop_acc_state': 'state'/);
    assert.match(block, /tplData\.isClosed = data\.state === 'closed';/);
    assert.match(block, /methodname: 'tiny_studiolms_generate_accordion'/);
    assert.ok(!block.includes('tb-acc-content'));
});

test('the title bar and the content have a background each, and a block saved before keeps one', () => {
    const block = read('amd/src/blocks/accordion.js');
    const design = read('templates/popup_accordion_design.mustache');

    assert.match(block, /headerBg: '',/);
    assert.match(block, /'#pop_acc_header_bg': 'headerBg'/);
    assert.match(block, /tplData\.headerBgValue = data\.headerBg \|\| data\.bg;/);
    assert.match(design, /id="pop_acc_header_bg"/);
    assert.match(design, /id="pop_acc_bg"/);
    assert.match(
        read('templates/block_accordion.mustache'),
        /\{\{#headerBg\}\} background-color: \{\{headerBg\}\};\{\{\/headerBg\}\}/
    );
});

test('the pair of icons is drawn as two, cross-fading, and a pair of one icon is a single icon that turns', () => {
    const block = read('amd/src/blocks/accordion.js');
    const pair = read('amd/src/blocks/icon_pair.js');
    const template = read('templates/block_accordion.mustache');

    assert.match(block, /Object\.assign\(templateData, iconView\(data\.icon\)\);/);
    assert.match(pair, /const \[first, second\] = iconPair\(icon\)\.split\(' \/ '\);/);
    assert.match(pair, /const iconSecond = textGlyph\(second \|\| first\);/);
    assert.match(pair, /iconTurns: iconFirst === iconSecond/);
    assert.match(
        template,
        /slms-acc-icon-closed">\{\{iconFirst\}\}<\/span>\{\{\^iconTurns\}\}<span class="slms-acc-icon-open">/
    );
    ['styles.css', 'editor_styles.css'].forEach((file) => {
        const css = read(file);
        assert.match(css, /\.slms-acc-icon > span \{\s*grid-area: 1 \/ 1;\s*transition: opacity 0\.25s ease,/);
        assert.match(css, /\.slms-acc-icon-open \{\s*opacity: 0;/);
        assert.match(css, /\.studiolms-accordion:not\(\.slms-closed\) \.slms-acc-icon-closed,[^{]*\{\s*opacity: 0;/);
        assert.match(css, /\.studiolms-accordion:not\(\.slms-closed\) \.slms-acc-icon-open,[^{]*\{\s*opacity: 1;/);
        assert.match(
            css,
            /icon-turns > \.slms-acc-icon-closed,[^{]*\{\s*opacity: 1;\s*transform: rotate\(90deg\);/
        );
    });
});

test('the arrows pair is not offered any more, and a block that has it keeps the look it had', () => {
    const popup = read('templates/popup_accordion_design.mustache');
    assert.ok(!popup.includes('\u25BC / \u25B2'), 'no option for down / up');
    assert.match(popup, /<option value="\u276F \/ \u276F"/);
    assert.match(read('amd/src/blocks/icon_pair.js'), /icon === DROPPED_ARROWS \? TRIANGLES : icon/);
    ['en', 'pt_br'].forEach((lang) => {
        const strings = read(`lang/${lang}/tiny_studiolms.php`);
        assert.ok(!strings.includes("$string['icon_arrows']"), `${lang}: no string for the dropped option`);
        assert.ok(strings.includes("$string['icon_chevron']"), `${lang}: string for the chevron`);
    });
});

test('the content opens and closes by its height, hidden from reader and keyboard once closed', () => {
    const template = read('templates/block_accordion.mustache');

    assert.match(
        template,
        /<div class="studiolms-accordion-body">\s*<div class="studiolms-editable-area studiolms-accordion-content"/
    );
    ['styles.css', 'editor_styles.css'].forEach((file) => {
        const css = read(file);
        assert.match(
            css,
            /\.studiolms-accordion-body,[^{]*\{\s*display: grid;\s*grid-template-rows: 1fr;\s*transition: grid-template-rows 0\.3s/
        );
        const closed = /slms-closed > \.studiolms-accordion-body,[^{]*\{\s*grid-template-rows: 0fr;\s*visibility: hidden;\s*/;
        assert.match(css, closed);
        assert.match(css, /visibility 0s linear 0\.3s;/);
        // The movement stops for whoever asks the system for less of it.
        assert.match(css, /prefers-reduced-motion: reduce\) \{[^}]*\.slms-acc-icon > span,[^}]*transition: none;/);
    });
});

test('the title and the content have a text colour each', () => {
    const block = read('amd/src/blocks/accordion.js');
    const design = read('templates/popup_accordion_design.mustache');

    assert.match(design, /id="pop_acc_color"/);
    assert.match(design, /id="pop_acc_content_color"/);
    assert.match(block, /contentColor: '',/);
    assert.match(block, /'#pop_acc_content_color': 'contentColor'/);
    assert.match(block, /tplData\.contentColorValue = data\.contentColor \|\| '#212529';/);
    assert.match(
        read('templates/block_accordion.mustache'),
        /accordion-content" contenteditable="true"\{\{#contentColor\}\} style="color: \{\{contentColor\}\};"\{\{\/contentColor\}\}>/
    );
});

test('the opening can be switched off per accordion, and is on unless a block says otherwise', () => {
    const block = read('amd/src/blocks/accordion.js');

    assert.match(block, /animate: true,/);
    assert.match(block, /templateData\.animate = data\.animate !== false;/);
    assert.match(block, /tplData\.animate = data\.animate !== false;/);
    assert.match(block, /data\.animate = animateEl\.checked;/);
    assert.match(read('templates/popup_accordion_design.mustache'), /id="pop_acc_animate"/);
    assert.match(read('templates/block_accordion.mustache'), /\{\{\^animate\}\} slms-static\{\{\/animate\}\}/);
    ['styles.css', 'editor_styles.css'].forEach((file) => {
        const css = read(file);
        assert.match(css, /\.studiolms-accordion\.slms-static \.slms-acc-icon > span,/);
        assert.match(css, /slms-static\.slms-closed > \.studiolms-accordion-body,[^{]*\{\s*transition: none;/);
    });
});

test('the icon opens and closes the accordion on the canvas and the state it starts in is left alone', () => {
    const app = read('amd/src/app.js');
    const css = read('styles.css');

    assert.match(app, /closest\?\.\('\.slms-acc-icon'\)[\s\S]*classList\.toggle\('slms-closed'\)/);
    // The resources list has the same icon, and opens and closes in the canvas the same way.
    assert.match(app, /closest\('\.studiolms-accordion, \.studiolms-resources'\)\?\.classList\.toggle/);
    assert.match(css, /\.slms-canvas-block-preview \.slms-acc-icon \{\s*pointer-events: auto;\s*cursor: pointer;/);
    // The toggle is on the preview markup only: nothing in it writes the configuration.
    const toggle = app.slice(app.indexOf("closest?.('.slms-acc-icon')"), app.indexOf("closest?.('.slms-acc-icon')") + 200);
    assert.ok(!toggle.includes('config'));
});

test('the strings of the options exist in both languages', () => {
    const keys = [
        'accordion_header_bg', 'accordion_content_bg', 'accordion_title_color', 'accordion_content_color', 'animate_opening',
    ];
    keys.forEach((key) => {
        ['en', 'pt_br'].forEach((lang) => {
            assert.ok(read(`lang/${lang}/tiny_studiolms.php`).includes(`$string['${key}'] = `), `${lang} ${key}`);
        });
    });
});
