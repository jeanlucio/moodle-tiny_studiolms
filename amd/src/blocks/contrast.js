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
 * Picks a text colour that can be read on a background, by the contrast ratio of WCAG 2.1.
 *
 * A muted line of text (the description under a title) cannot be given one fixed grey: the background is the
 * author's choice, and the grey that Bootstrap names "secondary" is a light one in Moodle's theme, which is 1.4 to
 * 1 on the light header of a list of resources. Plain ES module with no import at all, so Node can load it for the
 * headless tests.
 *
 * @module     tiny_studiolms/blocks/contrast
 * @copyright  2026 Jean Lúcio
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

// What WCAG 2.1 AA asks of text of this size.
const MINIMUM_RATIO = 4.5;

// A muted dark grey first, then a darker one, then white for a dark background.
const MUTED_CANDIDATES = ['#495057', '#212529', '#ffffff'];

/**
 * Reads a colour written as #rgb, #rrggbb or rgb()/rgba() into its three channels.
 *
 * @param {string} colour The colour.
 * @returns {number[]|null} Red, green and blue from 0 to 255, or null when it is not a colour that can be read, or
 *     is not opaque (nothing can be said of the contrast over what shows through).
 */
const channels = (colour) => {
    const text = String(colour ?? '').trim();
    let found = text.match(/^#([0-9a-f]{3})$/i);
    if (found) {
        return [...found[1]].map((digit) => parseInt(digit + digit, 16));
    }
    found = text.match(/^#([0-9a-f]{6})$/i);
    if (found) {
        return [0, 2, 4].map((at) => parseInt(found[1].slice(at, at + 2), 16));
    }
    found = text.match(/^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*(?:,\s*([\d.]+)\s*)?\)$/i);
    if (found && (found[4] === undefined || Number(found[4]) === 1)) {
        return [found[1], found[2], found[3]].map(Number);
    }
    return null;
};

/**
 * The relative luminance of a colour, as WCAG 2.1 defines it.
 *
 * @param {number[]} rgb Red, green and blue from 0 to 255.
 * @returns {number}
 */
const luminance = (rgb) => {
    const [red, green, blue] = rgb.map((channel) => {
        const value = channel / 255;
        return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
};

/**
 * The contrast ratio of two colours, from 1 to 21.
 *
 * @param {string} first A colour.
 * @param {string} second A colour.
 * @returns {number|null} The ratio, or null when one of them cannot be read.
 */
export const contrastRatio = (first, second) => {
    const [one, two] = [channels(first), channels(second)];
    if (!one || !two) {
        return null;
    }
    const [lighter, darker] = [luminance(one), luminance(two)].sort((a, b) => b - a);
    return (lighter + 0.05) / (darker + 0.05);
};

/**
 * A muted text colour that reads on a background.
 *
 * The first of the candidates that reaches the ratio WCAG 2.1 AA asks of text, or, when none does, the one with the
 * most contrast. A background that cannot be read gets the first, which is the right one for a light page.
 *
 * @param {string} background The colour of the background.
 * @returns {string} A colour written as hexadecimal.
 */
export const mutedTextOn = (background) => {
    const ratios = MUTED_CANDIDATES.map((candidate) => contrastRatio(candidate, background));
    if (ratios.some((ratio) => ratio === null)) {
        return MUTED_CANDIDATES[0];
    }
    const enough = ratios.findIndex((ratio) => ratio >= MINIMUM_RATIO);
    return MUTED_CANDIDATES[enough === -1 ? ratios.indexOf(Math.max(...ratios)) : enough];
};
