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
 * Lang string key of an icon of the infographic icon picker.
 *
 * Plain ES module with no core/* import, so Node can load it for the headless tests.
 *
 * @module     tiny_studiolms/blocks/icon_names
 * @copyright  2026 Jean Lúcio
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

/**
 * Returns the key of the lang string that names an icon, for example igicon_graduation_cap for the class
 * "fa-solid fa-graduation-cap". The name is what the picker shows as the tooltip and reads to a screen reader.
 *
 * @param {string} iconClass Font Awesome 6 class string.
 * @returns {string} Lang string key.
 */
export const iconStringKey = (iconClass) => `igicon_${iconClass.replace('fa-solid fa-', '').replace(/-/g, '_')}`;
