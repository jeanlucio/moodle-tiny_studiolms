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
 * Where a block that is narrower than the page sits in its row: left, centre or right.
 *
 * Plain ES module with no core/* import, so Node can load it for the headless tests.
 *
 * @module     tiny_studiolms/blocks/block_align
 * @copyright  2026 Jean Lúcio
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

export const ALIGNS = ['left', 'center', 'right'];

/**
 * Returns the alignment to draw: the stored one when it is a known value, the block's own default otherwise.
 *
 * The stored value comes from the markup of the page, which anyone can edit, so it is checked before it becomes
 * part of a class name.
 *
 * @param {*} value The align field of the block data.
 * @param {string} fallback What the block did before it had the field.
 * @returns {string} One of ALIGNS.
 */
export const normalizeAlign = (value, fallback) => (ALIGNS.includes(value) ? value : fallback);

/**
 * Reads the alignment the TinyMCE buttons write as an inline text-align on a heading.
 *
 * @param {string} value The text-align of the element, as the style attribute holds it.
 * @returns {string|null} One of ALIGNS, or null for anything else (justify, start, no value).
 */
export const alignFromTextAlign = (value) => {
    const align = String(value ?? '').trim().toLowerCase();
    return ALIGNS.includes(align) ? align : null;
};

/**
 * Builds the flags the alignment field of a popup reads to select its option.
 *
 * @param {*} value The align field of the block data.
 * @param {string} fallback What the block did before it had the field.
 * @returns {object} alignLeft, alignCenter and alignRight, one of them true.
 */
export const alignVars = (value, fallback) => {
    const align = normalizeAlign(value, fallback);
    return {
        alignLeft: align === 'left',
        alignCenter: align === 'center',
        alignRight: align === 'right',
    };
};

/**
 * Makes the alignment field of an open popup change the block.
 *
 * @param {HTMLElement} popup The popup node.
 * @param {object} data The block data, changed in place.
 * @param {Function} onUpdate Redraws the block from the data.
 */
export const bindAlign = (popup, data, onUpdate) => {
    popup.querySelector('#pop_block_align')?.addEventListener('input', (ev) => {
        data.align = normalizeAlign(ev.target.value, data.align);
        onUpdate(data);
    });
};
