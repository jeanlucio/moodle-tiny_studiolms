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
 * Keeps the triangle of an icon pair a plain glyph, like the other triangles, and not a coloured emoji.
 *
 * Plain ES module with no core/* import, so Node can load it for the headless tests.
 *
 * @module     tiny_studiolms/blocks/text_glyph
 * @copyright  2026 Jean Lúcio
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

// Black right-pointing triangle: many fonts draw it as a coloured emoji unless told it is text, while the down
// and up triangles are always plain glyphs, so a pair of the two came out half emoji, half text.
const RIGHT_TRIANGLE = '▶';
const TEXT_PRESENTATION = '︎';
const EMOJI_PRESENTATION = '️';

/**
 * Forces the right-pointing triangles of an icon to the text presentation.
 *
 * A triangle that already says how it is to be drawn (either selector) is left as the author wrote it.
 *
 * @param {string} icon One icon of a pair.
 * @returns {string}
 */
export const textGlyph = (icon) => icon.replace(
    new RegExp(`${RIGHT_TRIANGLE}(?![${TEXT_PRESENTATION}${EMOJI_PRESENTATION}])`, 'g'),
    `${RIGHT_TRIANGLE}${TEXT_PRESENTATION}`
);
