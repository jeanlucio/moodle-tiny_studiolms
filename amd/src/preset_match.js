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
 * Finding a ready-made layout by the name the AI chat gave.
 *
 * Plain ES module with no core/* import, so Node can load it for the headless tests.
 *
 * @module     tiny_studiolms/preset_match
 * @copyright  2026 Jean Lúcio
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

const normalise = (name) => String(name ?? '').replace(/\s+/g, ' ').trim().toLowerCase();

/**
 * Returns the layout whose name is the one asked for, ignoring case and spacing.
 *
 * The model answers with the name it read in the list, but may change the case or the spacing; any other
 * difference means it named something the library does not have.
 *
 * @param {Array<{name: string}>} presets The layouts the editor offers.
 * @param {*} name The name the chat asked for.
 * @returns {object|undefined} The layout, or undefined when there is none with that name.
 */
export const findPreset = (presets, name) => {
    const wanted = normalise(name);
    if (wanted === '') {
        return undefined;
    }
    return (Array.isArray(presets) ? presets : []).find((preset) => normalise(preset?.name) === wanted);
};
