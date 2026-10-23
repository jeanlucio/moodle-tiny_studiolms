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
 * Number of slots in the grid cards block.
 *
 * Plain ES module with no core/* import, so Node can load it for the headless tests.
 *
 * @module     tiny_studiolms/blocks/grid_slots
 * @copyright  2026 Jean Lúcio
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

// What the editor leaves in a slot nobody typed in: a paragraph holding only a line break.
const BLANK_PARAGRAPH = /<p>(\s|&nbsp;|<br\s*\/?>)*<\/p>/gi;

/**
 * Tells whether a slot holds anything besides blank paragraphs.
 *
 * @param {*} slot One entry of the slots field.
 * @returns {boolean}
 */
const hasContent = (slot) => typeof slot === 'string' && slot.replace(BLANK_PARAGRAPH, '').trim() !== '';

/**
 * Returns how many slots the block draws.
 *
 * Never fewer than the columns, so a new block shows one empty slot per column, and never so few
 * that a slot holding content is dropped: a generated config puts every card in one block, often
 * more than the columns, and the grid wraps them onto new rows. Empty slots after the last one with
 * content are not kept, so lowering the columns does not leave blank rows behind.
 *
 * @param {*} columns The columns field of the block data.
 * @param {*} slots The slots field of the block data.
 * @returns {number} The slot count, at least the number of columns.
 */
export const slotCount = (columns, slots) => {
    const colCount = parseInt(columns, 10) || 2;
    if (!Array.isArray(slots)) {
        return colCount;
    }

    let lastFilled = -1;
    slots.forEach((slot, index) => {
        if (hasContent(slot)) {
            lastFilled = index;
        }
    });

    return Math.max(colCount, lastFilled + 1);
};
