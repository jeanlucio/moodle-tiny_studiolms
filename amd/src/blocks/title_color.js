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

// The attributes of a tag are read the way the HTML parser reads them: a quoted value is one piece, whatever it holds
// (a ">" or the text of another attribute included). Reading the attribute text as a whole would find a "style" inside
// the value of another attribute, and writing it back would close that value and open attributes of the attacker's.
const NAME = '[^\\s"\'<>/=]+';
const VALUE = '(?:"[^"]*"|\'[^\']*\'|[^\\s"\'=<>`]+)';
const ATTRIBUTE = `\\s+${NAME}(?:\\s*=\\s*${VALUE})?`;
const OPENING_HEADING = new RegExp(`<(h[1-6])((?:${ATTRIBUTE})*)\\s*>`, 'gi');
const ATTRIBUTE_TOKEN = new RegExp(`\\s+(${NAME})(?:\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s"'=<>\`]+)))?`, 'g');
// The property of a declaration, to tell "color" from the end of background-color or border-color.
const COLOUR_PROPERTY = /^\s*color\s*:/i;

/**
 * Writes a colour on every heading of a piece of HTML, over the one it already has.
 *
 * A heading whose tag cannot be read as a whole (an unclosed quote) is left as it is.
 *
 * @param {string} html The text of the block.
 * @param {string} colour A colour written as hexadecimal, or empty to leave the headings as they are.
 * @returns {string} The text, with the headings coloured.
 */
export const applyTitleColor = (html, colour) => {
    if (!HEX_COLOUR.test(colour || '')) {
        return html;
    }
    // Functions as replacements, so that nothing in the text is read as a pattern of the replacement.
    return html.replace(OPENING_HEADING, (tag, name, attributes) => {
        let styled = false;
        const rebuilt = attributes.replace(ATTRIBUTE_TOKEN, (token, attribute, double, single, bare) => {
            // The parser takes the first of two attributes of the same name and ignores the rest.
            if (styled || attribute.toLowerCase() !== 'style') {
                return token;
            }
            styled = true;
            const others = (double ?? single ?? bare ?? '').split(';')
                .map((declaration) => declaration.trim())
                .filter((declaration) => declaration !== '' && !COLOUR_PROPERTY.test(declaration))
                // The value was in single quotes or in none, and goes back in double quotes.
                .map((declaration) => declaration.replace(/"/g, '&quot;'));
            return ` style="${[...others, `color: ${colour}`].join('; ')};"`;
        });
        return `<${name}${rebuilt}${styled ? '' : ` style="color: ${colour};"`}>`;
    });
};
