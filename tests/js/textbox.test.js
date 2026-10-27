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
 * Guard test for the Text Box block, run via `node --test`.
 *
 * Regression test: a template holds only blocks, so a paragraph typed in the editor between two blocks was left out of
 * it. The block is that paragraph: no frame and no colour, typed on the canvas, with the alignment of its lines as the
 * one setting, drawn as a class (the cleaner of a forum or a question drops what is not one).
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

let align;

test.before(async() => {
    // The module imports nothing, so Node can load it as it stands.
    align = await import(require.resolve('../../amd/src/blocks/block_align.js'));
});

test('the alignment of the lines is one of four, and anything else is the left', () => {
    ['left', 'center', 'right', 'justify'].forEach((value) => assert.equal(align.normalizeTextAlign(value), value));
    ['', undefined, null, 'full', 'x" onclick="y', 'JUSTIFY'].forEach((value) => {
        assert.equal(align.normalizeTextAlign(value), 'left', String(value));
    });
});

test('the block is registered, typed on the canvas and read back from its own markup', () => {
    const block = read('amd/src/blocks/textbox.js');
    const registry = read('amd/src/blocks/registry.js');

    assert.match(block, /id: 'textBox',/);
    assert.match(block, /excludeFromState: \['content'\],/);
    assert.match(block, /state\.content = contentNode \? contentNode\.innerHTML : '';/);
    assert.match(block, /templateData\.textAlign = normalizeTextAlign\(data\.textAlign\);/);
    assert.match(registry, /import textBox from '\.\/textbox';/);
    assert.match(registry, /\n {4}callout,\n {4}textBox,\n {4}table,/);
});

test('the template is the text alone, with the class of the alignment and nothing a page cleaner drops', () => {
    const template = read('templates/block_textbox.mustache').replace(/\{\{!.*?\}\}/gs, '');

    assert.match(
        template,
        /<div class="studiolms-textbox-wrap w-100\{\{#hoverEffect\}\} slms-hov-\{\{hoverEffect\}\}\{\{\/hoverEffect\}\}">/
    );
    assert.match(template, /class="slms-textbox-content slms-textalign-\{\{textAlign\}\} mceEditable" contenteditable="true"/);
    assert.ok(!/style=/.test(template), 'no inline style');
    assert.match(read('templates/popup_textbox_design.mustache'), /id="pop_textbox_align"/);
});

test('the page script cleans the editing attributes of it, as of every block', () => {
    assert.match(read('amd/src/frontend.js'), /'\.studiolms-textbox-wrap',/);
});

['styles.css', 'editor_styles.css'].forEach((file) => {
    test(`${file}: a rule for each alignment`, () => {
        const css = read(file);

        ['left: start', 'center: center', 'right: end', 'justify: justify'].forEach((pair) => {
            const [name, value] = pair.split(': ');
            assert.match(css, new RegExp(`\\.slms-textalign-${name} \\{\\s+text-align: ${value};`), name);
        });
    });
});

['en', 'pt_br'].forEach((lang) => {
    test(`${lang}: the strings of the block are there, in order`, () => {
        const source = read(`lang/${lang}/tiny_studiolms.php`);

        ['align_justify', 'block_textbox_title', 'default_textbox_text'].forEach((key) => {
            assert.ok(source.includes(`$string['${key}'] = `), key);
        });
        const keys = source.split('\n').map((line) => line.match(/^\$string\['([^']+)'\]/)?.[1]).filter(Boolean);
        assert.deepEqual(keys, [...keys].sort());
    });
});
