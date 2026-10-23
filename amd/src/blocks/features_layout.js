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
 * Column count of the feature cards block.
 *
 * Plain ES module with no core/* import, so Node can load it for the headless tests.
 *
 * @module     tiny_studiolms/blocks/features_layout
 * @copyright  2026 Jean Lúcio
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

/**
 * Returns how many columns the block draws: 2 or 3.
 *
 * The value arrives as a number from the popup and as a number or a string ("2") from a generated
 * config or a stored template, so it is converted before it is compared. Anything else is 3, the
 * block's default.
 *
 * @param {*} value The columns field of the block data.
 * @returns {number} 2 or 3.
 */
export const featureColumns = (value) => (parseInt(value, 10) === 2 ? 2 : 3);
