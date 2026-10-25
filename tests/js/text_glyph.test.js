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
 * Tests of the icon glyph helper, run via `node --test`.
 *
 * Regression test: the "Triangles" pair of the accordion showed a coloured emoji box while closed and a plain
 * triangle while open, because the right-pointing triangle is drawn as an emoji by many fonts and the down one never
 * is. Both icons of the pair now ask for the text presentation.
 *
 * @package    tiny_studiolms
 * @copyright  2026 Jean Lúcio
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

let glyph;

test.before(async() => {
    glyph = await import(require.resolve('../../amd/src/blocks/icon_pair.js'));
});

test('the right-pointing triangle is asked to be text', () => {
    assert.equal(glyph.textGlyph('▶'), '▶︎');
});

test('the other icons of the pairs are left as they are', () => {
    ['▼', '▲', '➕', '➖', '📁', '📂'].forEach((icon) => {
        assert.equal(glyph.textGlyph(icon), icon);
    });
});

test('a triangle that already says how it is drawn is not touched again', () => {
    assert.equal(glyph.textGlyph('▶︎'), '▶︎');
    assert.equal(glyph.textGlyph('▶️'), '▶️');
    assert.equal(glyph.textGlyph(glyph.textGlyph('▶')), '▶︎');
});

test('a pair is drawn through the helper, for the accordion and for the resources', () => {
    const pair = fs.readFileSync(require.resolve('../../amd/src/blocks/icon_pair.js'), 'utf8');
    assert.ok(!/^import /m.test(pair), 'no import, so that Node can load it as the loader of Moodle needs it written');

    assert.match(pair, /const iconFirst = textGlyph\(first\);/);
    assert.match(pair, /const iconSecond = textGlyph\(second \|\| first\);/);
    ['accordion', 'resources'].forEach((block) => {
        const source = fs.readFileSync(require.resolve(`../../amd/src/blocks/${block}.js`), 'utf8');
        assert.match(source, /iconView\(/);
    });
});
