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
 * Tests of the emoji finder, run via `node --test`, and guard tests of the front end that hides them.
 *
 * Regression test: an emoji in a title or a button was read out by screen readers ("file folder Course plan"),
 * and the aria-hidden that was meant to prevent it is removed by Moodle's HTMLPurifier from stored content, so
 * it has to be set when the page is shown.
 *
 * @package    tiny_studiolms
 * @copyright  2026 Jean Lúcio
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

let emoji;

test.before(async() => {
    emoji = await import(require.resolve('../../amd/src/emoji_text.js'));
});

const emojis = (text) => emoji.splitEmoji(text).filter((piece) => piece.emoji).map((piece) => piece.text);

test('every emoji of a text is found, wherever it is', () => {
    assert.deepEqual(emojis('📁 Plano da Disciplina'), ['📁']);
    assert.deepEqual(emojis('🎉 Parabéns 🎉'), ['🎉', '🎉']);
    assert.deepEqual(emojis('Data 📅🗓️ limite'), ['📅', '🗓️']);
    assert.deepEqual(emojis('Sem nenhum'), []);
});

test('an emoji made of several parts is one emoji', () => {
    assert.deepEqual(emojis('▶️ Entrar'), ['▶️']);
    assert.deepEqual(emojis('👍🏽 ok'), ['👍🏽']);
    assert.deepEqual(emojis('👨‍👩‍👧 família'), ['👨‍👩‍👧']);
    assert.deepEqual(emojis('🇧🇷 Brasil'), ['🇧🇷']);
});

test('signs that are text stay text', () => {
    assert.deepEqual(emojis('© 2026 Marca™ → próximo ✓ 1.'), []);
});

test('the pieces join back to the text', () => {
    const text = 'a 🎯 b ▶️ c';
    assert.equal(emoji.splitEmoji(text).map((piece) => piece.text).join(''), text);
});

test('a text of only emoji says nothing', () => {
    assert.equal(emoji.hasTextBesidesEmoji('📅'), false);
    assert.equal(emoji.hasTextBesidesEmoji(' 📅 🗓️ '), false);
    assert.equal(emoji.hasTextBesidesEmoji('📅 Acessar Plano'), true);
    assert.equal(emoji.hasTextBesidesEmoji(''), false);
});

test('the front end hides emoji on the page and on content that enters it, and keeps the name of an emoji-only element', () => {
    const source = fs.readFileSync(require.resolve('../../amd/src/frontend.js'), 'utf8');
    const initIn = source.slice(source.indexOf('const initIn'));

    assert.match(initIn, /hideDecorativeEmoji\(root\);/);
    assert.match(source, /hasTextBesidesEmoji\(container\.textContent\)/);
    assert.match(source, /parent\.closest\('\[aria-hidden="true"\], script, style'\)/);
});
