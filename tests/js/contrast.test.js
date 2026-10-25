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
 * Tests of the muted text colour, run via `node --test`, and guard tests of the places that use it.
 *
 * Regression test: the description under the title of a list of resources was Bootstrap's "text-secondary", which in
 * Moodle's theme is #ced4da, a contrast of 1.42 to 1 on the #f8f9fa header and far below the 4.5 to 1 that WCAG 2.1
 * AA asks of text that size.
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

let contrast;

test.before(async() => {
    contrast = await import(require.resolve('../../amd/src/blocks/contrast.js'));
});

test('the ratio is the one of WCAG 2.1', () => {
    assert.equal(contrast.contrastRatio('#000000', '#ffffff').toFixed(1), '21.0');
    assert.equal(contrast.contrastRatio('#ffffff', '#ffffff').toFixed(1), '1.0');
    // The grey of the theme, which is what failed.
    assert.equal(contrast.contrastRatio('#ced4da', '#f8f9fa').toFixed(2), '1.42');
    assert.equal(contrast.contrastRatio('#0d47a1', '#f8f9fa').toFixed(2), '8.19');
});

test('a colour is read from hex and from rgb(), and one that is not opaque or not a colour is not read', () => {
    assert.equal(contrast.contrastRatio('#fff', '#000').toFixed(1), '21.0');
    assert.equal(contrast.contrastRatio('rgb(255, 255, 255)', 'rgb(0,0,0)').toFixed(1), '21.0');
    assert.equal(contrast.contrastRatio('rgba(255, 255, 255, 1)', '#000').toFixed(1), '21.0');
    ['rgba(0, 0, 0, 0)', 'rgba(0, 0, 0, 0.5)', 'transparent', 'red', '', null, undefined, '#12'].forEach((colour) => {
        assert.equal(contrast.contrastRatio(colour, '#fff'), null, String(colour));
    });
});

test('the muted text on the default header reads, and it is not the grey that failed', () => {
    const colour = contrast.mutedTextOn('#f8f9fa');

    assert.notEqual(colour, '#ced4da');
    assert.ok(contrast.contrastRatio(colour, '#f8f9fa') >= 4.5);
    assert.equal(colour, '#495057');
});

test('every header a person can pick gets a text that reaches 4.5 to 1, or the best there is', () => {
    ['#ffffff', '#f8f9fa', '#e3f2fd', '#ffe0b2', '#0d47a1', '#000000', '#212529', '#6c757d', '#888888'].forEach((background) => {
        const colour = contrast.mutedTextOn(background);
        const ratio = contrast.contrastRatio(colour, background);
        const best = Math.max(...['#495057', '#212529', '#ffffff'].map((c) => contrast.contrastRatio(c, background)));

        assert.ok(ratio >= 4.5 || ratio === best, `${background}: ${colour} is ${ratio.toFixed(2)}`);
    });
    assert.equal(contrast.mutedTextOn('#0d47a1'), '#ffffff');
});

test('a background that cannot be read gets the grey for a light page', () => {
    ['rgba(0, 0, 0, 0)', 'transparent', '', undefined].forEach((background) => {
        assert.equal(contrast.mutedTextOn(background), '#495057');
    });
});

test('the resources list colours its description by its header, and an older list is mended on the page', () => {
    const block = read('amd/src/blocks/resources.js');
    const template = read('templates/block_resources.mustache');
    const front = read('amd/src/frontend.js');

    assert.match(block, /templateData\.descColor = mutedTextOn\(data\.headerBg\);/);
    assert.match(template, /<span class="slms-resources-desc small" style="color: \{\{descColor\}\};">/);
    assert.ok(!template.includes('text-secondary'), 'the framework grey is gone from the template');
    assert.match(front, /within\(root, '\.slms-resources-desc\.text-secondary'\)/);
    assert.match(front, /description\.classList\.remove\('text-secondary'\);/);
    assert.match(front, /fixResourceDescriptions\(root\);/);
    assert.ok(!/^import /m.test(read('amd/src/blocks/contrast.js')), 'no import, so that Node can load it');
});
