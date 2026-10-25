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
 * Colours the headings inside a block's text.
 *
 * The title of a card is only the first heading of its free text, so its colour cannot be set from the block: it is
 * written on the headings themselves, in a style attribute, which the purifier keeps (it removes a CSS variable).
 * Plain ES module with no import at all, so Node can load it for the headless tests, and the PHP renderer of the
 * pages built on the server does the same by the same rules.
 *
 * @module     tiny_studiolms/blocks/title_color
 * @copyright  2026 Jean Lúcio
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

// A colour is written into markup, so only a hexadecimal one is taken: nothing else can carry anything out of it.
const HEX_COLOUR = /^#[0-9a-f]{3,8}$/i;

const OPENING_HEADING = /<(h[1-6])(\s[^>]*)?>/gi;
const STYLE_ATTRIBUTE = /\sstyle\s*=\s*(?:"([^"]*)"|'([^']*)')/i;
// The property of a declaration, to tell "color" from the end of background-color or border-color.
const COLOUR_PROPERTY = /^\s*color\s*:/i;

/**
 * Writes a colour on every heading of a piece of HTML, over the one it already has.
 *
 * @param {string} html The text of the block.
 * @param {string} colour A colour written as hexadecimal, or empty to leave the headings as they are.
 * @returns {string} The text, with the headings coloured.
 */
export const applyTitleColor = (html, colour) => {
    if (!HEX_COLOUR.test(colour || '')) {
        return html;
    }
    return html.replace(OPENING_HEADING, (tag, name, attributes = '') => {
        const found = attributes.match(STYLE_ATTRIBUTE);
        if (!found) {
            return `<${name}${attributes} style="color: ${colour};">`;
        }
        const others = (found[1] ?? found[2]).split(';')
            .map((declaration) => declaration.trim())
            .filter((declaration) => declaration !== '' && !COLOUR_PROPERTY.test(declaration));
        const style = `${[...others, `color: ${colour}`].join('; ')};`;
        // A function, so that nothing in the style is read as a pattern of the replacement.
        return `<${name}${attributes.replace(STYLE_ATTRIBUTE, () => ` style="${style}"`)}>`;
    });
};
