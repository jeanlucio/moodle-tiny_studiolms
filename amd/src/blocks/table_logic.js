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
 * The rules of the table block that need no browser: how large the grid can be.
 *
 * Plain ES module with no import at all, so Node can load it for the headless tests. The size is read from the
 * data-slms-state attribute of stored content and from AI output as well as from the setup popup, so the popup limits
 * alone do not bound the loops that build the cells.
 *
 * @module     tiny_studiolms/blocks/table_logic
 * @copyright  2026 Jean Lúcio
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

/** @var {number} The fewest rows a table holds, header included. */
export const MIN_ROWS = 2;

/** @var {number} The most rows a table holds: the limit of the setup popup. */
export const MAX_ROWS = 50;

/** @var {number} The fewest columns a table holds. */
export const MIN_COLS = 1;

/** @var {number} The most columns a table holds: the limit of the setup popup. */
export const MAX_COLS = 10;

/**
 * Returns a size from min to max, so that a value stored in content never decides how many cells are built.
 *
 * @param {*} value What was typed, stored or generated.
 * @param {number} min The fewest allowed.
 * @param {number} max The most allowed.
 * @param {number} fallback What a value that is not a whole number, or is zero, gives.
 * @returns {number}
 */
export const normalizeTableSize = (value, min, max, fallback) => {
    const number = Number.parseInt(value, 10) || fallback;
    return Math.min(max, Math.max(min, number));
};
