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
 * Finds the emoji in a text, so the front end can hide them from screen readers.
 *
 * An emoji here is meant as an illustration, never as the words of the page. Plain ES module with no core/*
 * import, so Node can load it for the headless tests.
 *
 * @module     tiny_studiolms/emoji_text
 * @copyright  2026 Jean Lúcio
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

// One emoji: a pictograph drawn as an emoji by default, or one that asks for it with the variation selector
// (so the copyright sign, the trade mark and the arrows stay text), followed by whatever joins to it: a skin
// tone, a variation selector or another pictograph through a zero width joiner (a family, a profession).
// A flag is a pair of regional indicators, which the first alternative takes as one run.
const EMOJI = new RegExp(
    '(?:\\p{Regional_Indicator}{2}|(?:\\p{Emoji_Presentation}|\\p{Extended_Pictographic}\\uFE0F)' +
    '(?:\\uFE0F|[\\u{1F3FB}-\\u{1F3FF}]|\\u200D(?:\\p{Emoji_Presentation}|\\p{Extended_Pictographic})\\uFE0F?)*)',
    'gu'
);

/**
 * Splits a text into the runs of emoji and the text between them.
 *
 * @param {string} text Any text.
 * @returns {Array<{text: string, emoji: boolean}>} The pieces in order, joining back to the original text.
 */
export const splitEmoji = (text) => {
    const pieces = [];
    let last = 0;
    for (const match of text.matchAll(EMOJI)) {
        if (match.index > last) {
            pieces.push({text: text.slice(last, match.index), emoji: false});
        }
        pieces.push({text: match[0], emoji: true});
        last = match.index + match[0].length;
    }
    if (last < text.length) {
        pieces.push({text: text.slice(last), emoji: false});
    }
    return pieces;
};

/**
 * Tells whether a text says anything once its emoji are taken out.
 *
 * A heading or a button made only of an emoji has no other name, so hiding it would leave it with none.
 *
 * @param {string} text Any text.
 * @returns {boolean}
 */
export const hasTextBesidesEmoji = (text) => splitEmoji(text).some((piece) => !piece.emoji && piece.text.trim() !== '');
