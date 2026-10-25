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
 * The icon pair of an accordion or a list of resources, as the template draws it.
 *
 * Plain ES module with no import at all, so Node can load it for the headless tests: the loader of Moodle wants
 * an import without the extension and Node wants one with it, so a module that is tested headlessly imports nothing.
 *
 * @module     tiny_studiolms/blocks/icon_pair
 * @copyright  2026 Jean Lúcio
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

// Black right-pointing triangle: many fonts draw it as a coloured emoji unless told it is text, while the down
// and up triangles are always plain glyphs, so a pair of the two came out half emoji, half text.
const RIGHT_TRIANGLE = '\u25B6';
const TEXT_PRESENTATION = '\uFE0E';
const EMOJI_PRESENTATION = '\uFE0F';

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

// The arrows pair (down, up) is no longer offered: it was shown as the triangles pair (right, down) in the pages,
// since the first icon used to be turned a quarter when closed, so a block that has it keeps looking that way.
const DROPPED_ARROWS = '\u25BC / \u25B2';
const TRIANGLES = '\u25B6 / \u25BC';

/**
 * The pair a block asks for, with the one that was dropped from the options taken to the one it looked like.
 *
 * @param {string} icon The pair as saved.
 * @returns {string} The pair to draw.
 */
export const iconPair = (icon) => (icon === DROPPED_ARROWS ? TRIANGLES : icon);

/**
 * What the template needs to draw a pair: the icon of each state, and whether it is one icon that turns.
 *
 * A pair of one icon twice (the chevron) is a single icon that turns a quarter when the block opens; any other
 * pair is two icons that cross-fade, the first while closed and the second while open.
 *
 * @param {string} icon The pair as saved.
 * @returns {{iconFirst: string, iconSecond: string, iconTurns: boolean}}
 */
export const iconView = (icon) => {
    const [first, second] = iconPair(icon).split(' / ');
    const iconFirst = textGlyph(first);
    const iconSecond = textGlyph(second || first);
    return {iconFirst, iconSecond, iconTurns: iconFirst === iconSecond};
};
