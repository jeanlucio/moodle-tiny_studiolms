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
 * The state of each step of the steps infographic, when the teacher marks where the class is.
 *
 * Plain ES module with no import at all, so Node can load it for the headless tests.
 *
 * @module     tiny_studiolms/blocks/step_state
 * @copyright  2026 Jean Lúcio
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

/** @var {number} The most steps the block holds. */
export const MAX_STEPS = 6;

/**
 * Returns the number of the current step, or 0 for none.
 *
 * The value comes from the markup of the page, which anyone can edit, so only a whole number from 1 to the number of
 * steps is taken: a step that does not exist marks nothing, and does not mark every other one as done.
 *
 * @param {*} value The current field of the block data.
 * @param {number} count How many steps the block has.
 * @returns {number} 0 for none, otherwise 1 to count.
 */
export const normalizeCurrent = (value, count) => {
    const number = Number.parseInt(value, 10);
    return Number.isInteger(number) && number >= 1 && number <= Math.min(count, MAX_STEPS) ? number : 0;
};

/**
 * The state of one step.
 *
 * @param {number} stepNum 1-based number of the step.
 * @param {number} current Number of the current step, 0 for none (as returned by normalizeCurrent()).
 * @returns {string} 'done' before the current step, 'current' on it, 'next' after it, and '' when none is marked.
 */
export const stepState = (stepNum, current) => {
    if (current === 0) {
        return '';
    }
    if (stepNum < current) {
        return 'done';
    }
    return stepNum === current ? 'current' : 'next';
};
