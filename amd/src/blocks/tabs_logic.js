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
 * The rules of the tabs block that need no browser: how many tabs it has and which key goes where.
 *
 * Plain ES module with no import at all, so Node can load it for the headless tests, and the stylesheet-free part of
 * the page script reads the same numbers.
 *
 * @module     tiny_studiolms/blocks/tabs_logic
 * @copyright  2026 Jean Lúcio
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

/** @var {number} The fewest tabs a block holds: with one it would only be a heading. */
export const MIN_TABS = 2;

/** @var {number} The most tabs a block holds. */
export const MAX_TABS = 5;

/** @var {string} The colour of a block that has none, or one that is not a hexadecimal colour. */
export const DEFAULT_ACCENT = '#0d47a1';

/**
 * Returns a number of tabs from MIN_TABS to MAX_TABS.
 *
 * @param {*} value What was typed or stored.
 * @param {number} fallback What a value that is not a whole number gives.
 * @returns {number}
 */
export const normalizeTabCount = (value, fallback = 3) => {
    const number = Number.parseInt(value, 10);
    return Number.isInteger(number) ? Math.min(MAX_TABS, Math.max(MIN_TABS, number)) : fallback;
};

/**
 * Returns the colour of the tabs: only a hexadecimal one is taken, since it is written into markup.
 *
 * @param {*} value The accent field of the block data.
 * @returns {string}
 */
export const normalizeAccent = (value) => (/^#[0-9a-f]{3,8}$/i.test(String(value ?? '')) ? String(value) : DEFAULT_ACCENT);

/**
 * The tab that a key moves to, as in the tabs pattern of the WAI-ARIA authoring practices.
 *
 * @param {string} key The key pressed.
 * @param {number} current Index of the tab that has the focus.
 * @param {number} count How many tabs there are.
 * @param {boolean} rtl Whether the text runs from right to left, which swaps the two arrows.
 * @returns {number|null} The index to go to, or null for a key that is not for the tabs.
 */
export const nextTabIndex = (key, current, count, rtl = false) => {
    const forward = rtl ? 'ArrowLeft' : 'ArrowRight';
    const backward = rtl ? 'ArrowRight' : 'ArrowLeft';
    if (key === forward || key === 'ArrowDown') {
        return (current + 1) % count;
    }
    if (key === backward || key === 'ArrowUp') {
        return (current - 1 + count) % count;
    }
    if (key === 'Home') {
        return 0;
    }
    return key === 'End' ? count - 1 : null;
};
