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
 * What the export button and the line under it say, for how many templates are ticked.
 *
 * The checkboxes of My Templates choose what is exported, but with none ticked the export takes everything, so the
 * button has to say which of the two it will do. A site manager's "everything" also holds the site templates,
 * which is more than the manager's own, so the line says so. This module imports nothing so that Node can load it.
 *
 * @module     tiny_studiolms/export_label
 * @copyright  2026 Jean Lúcio
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

/**
 * Strings of the button and of the line under it.
 *
 * @param {number} selected How many templates are ticked.
 * @param {boolean} canManageGlobal Whether the user manages the site templates.
 * @returns {{button: {key: string, param: (number|null)}, hint: (string|null)}} Lang string keys; the hint is
 *     null when something is ticked, because then the button already says what it takes.
 */
export const exportTexts = (selected, canManageGlobal) => {
    if (selected > 0) {
        return {button: {key: 'btn_export_selected', param: selected}, hint: null};
    }
    return {
        button: {key: 'btn_export_all', param: null},
        hint: canManageGlobal ? 'export_hint_all_site' : 'export_hint_all',
    };
};
