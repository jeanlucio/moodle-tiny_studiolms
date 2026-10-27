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
 * Tests of the colour of the headings of a card's text, run via `node --test`, and guard tests of the card.
 *
 * The title of a card is only the first heading of its free text, so its colour is written on the headings
 * themselves, in a style attribute the purifier keeps. The colour goes into markup, so only a hexadecimal one is
 * taken.
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

let apply;

test.before(async() => {
    ({applyTitleColor: apply} = await import(require.resolve('../../amd/src/blocks/title_color.js')));
});

test('a heading with no style gets one', () => {
    assert.equal(apply('<h4>Title</h4><p>Text</p>', '#ff0000'), '<h4 style="color: #ff0000;">Title</h4><p>Text</p>');
});

test('every heading level is coloured, and nothing else', () => {
    const out = apply('<h1>a</h1><h3 class="x">b</h3><p>c</p><span>d</span>', '#00f');
    assert.equal(out, '<h1 style="color: #00f;">a</h1><h3 class="x" style="color: #00f;">b</h3><p>c</p><span>d</span>');
});

test('the colour a heading already has is replaced and the rest of its style is kept', () => {
    const out = apply('<h4 style="margin-top: 0; color: inherit; font-weight: bold;">T</h4>', '#123456');
    assert.equal(out, '<h4 style="margin-top: 0; font-weight: bold; color: #123456;">T</h4>');
});

test('the colour of a background or a border is not the colour of the text', () => {
    const out = apply('<h4 style="background-color: #eee; border-color: red; color: blue">T</h4>', '#abc');
    assert.equal(out, '<h4 style="background-color: #eee; border-color: red; color: #abc;">T</h4>');
});

test('a style in single quotes and a tag in capitals are handled', () => {
    assert.equal(apply("<H2 style='color: red'>T</H2>", '#111'), '<H2 style="color: #111;">T</H2>');
});

test('a style that looks like a replacement pattern is kept as it is', () => {
    assert.equal(apply('<h4 style="content: \'$&\'">T</h4>', '#abc'), '<h4 style="content: \'$&\'; color: #abc;">T</h4>');
});

// Regression tests (security audit of 2026-10-27, finding 1). The text reaches this function after it was cleaned of
// event handlers, so what it writes must not make one: the value of another attribute is not a style attribute.
test('a style written inside the value of another attribute is not taken for the style of the heading', () => {
    const out = apply('<h2 title=" style=\'a\' onmouseover=alert(1) x">T</h2>', '#000');
    assert.equal(out, '<h2 title=" style=\'a\' onmouseover=alert(1) x" style="color: #000;">T</h2>');
});

test('a ">" inside the value of an attribute does not end the tag', () => {
    const out = apply('<h2 title="a>b" style=\'x\'>T</h2>', '#000');
    assert.equal(out, '<h2 title="a>b" style="x; color: #000;">T</h2>');
});

test('a double quote in a style that was in single quotes cannot close the new one', () => {
    const out = apply('<h2 style=\'font-family: "A" onmouseover=alert(1)\'>T</h2>', '#000');
    assert.equal(out, '<h2 style="font-family: &quot;A&quot; onmouseover=alert(1); color: #000;">T</h2>');
});

test('of two style attributes the first one is the one that counts, as in the browser', () => {
    const out = apply('<h2 style="a: b" style="color: red">T</h2>', '#000');
    assert.equal(out, '<h2 style="a: b; color: #000;" style="color: red">T</h2>');
});

test('a style with no quotes is handled', () => {
    assert.equal(apply('<h2 style=margin:0>T</h2>', '#000'), '<h2 style="margin:0; color: #000;">T</h2>');
});

test('a tag that cannot be read to its end is left as it is', () => {
    assert.equal(apply('<h2 title="x>T</h2>', '#000'), '<h2 title="x>T</h2>');
});

test('a long text of unfinished tags is read in a short time', () => {
    const started = Date.now();
    apply(`${'<h2 a b="c" d '.repeat(20000)}`, '#000');
    apply(`<h2 ${'a=b '.repeat(50000)}`, '#000');
    assert.ok(Date.now() - started < 2000);
});

test('a colour that is not hexadecimal, or none, leaves the text as it is', () => {
    ['', 'red', 'rgb(1,2,3)', '#12', '#ff00zz', '#fff"><script>', null, undefined].forEach((colour) => {
        assert.equal(apply('<h4>T</h4>', colour), '<h4>T</h4>', String(colour));
    });
});

test('the card offers the colour, applies it to the text and keeps it in its configuration', () => {
    const block = read('amd/src/blocks/card.js');
    const popup = read('templates/popup_card_design.mustache');

    assert.match(block, /titleColor: '',/);
    assert.match(block, /'#pop_card_title_color': 'titleColor'/);
    assert.match(block, /tplData\.titleColorValue = data\.titleColor \|\| data\.text;/);
    assert.match(block, /templateData\.content = applyTitleColor\(templateData\.content, data\.titleColor\);/);
    assert.match(popup, /id="pop_card_title_color"/);
    ['en', 'pt_br'].forEach((lang) => {
        assert.ok(read(`lang/${lang}/tiny_studiolms.php`).includes("$string['card_title_color'] = "), lang);
    });
});

test('the module that Node loads imports nothing, as the loader of Moodle needs it written', () => {
    assert.ok(!/^import /m.test(read('amd/src/blocks/title_color.js')));
});
