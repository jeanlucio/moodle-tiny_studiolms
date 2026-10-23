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
 * Turns the text of a file chosen for import into the list of templates to send to the server.
 *
 * Plain ES module with no core/* import, so Node can load it for the headless tests.
 *
 * @module     tiny_studiolms/template_import
 * @copyright  2026 Jean Lúcio
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

/** @var {string} Message of the error thrown for a file that is not a usable export. */
export const INVALID_IMPORT_FILE = 'invalid_import_file';

/** @var {number} Longest template name the server stores, in characters. */
const NAME_MAX_LENGTH = 255;

/**
 * Parses an exported templates file and keeps only the fields the server accepts.
 *
 * Accepts a bare array or the versioned envelope {templates: [...]}. Anything else (text that is not
 * JSON, JSON that is not a list, a list with nothing usable in it) is one and the same problem for
 * the teacher, so it throws the one error the caller knows how to translate. Entries that are not
 * objects are skipped.
 *
 * @param {string} text Content of the chosen file.
 * @param {string} unnamed Name to give a template that has none.
 * @returns {Array<{name: string, content: string, isglobal: number}>}
 * @throws {Error} With the message INVALID_IMPORT_FILE.
 */
export const parseTemplateImport = (text, unnamed) => {
    let parsed;
    try {
        parsed = JSON.parse(text);
    } catch (error) {
        throw new Error(INVALID_IMPORT_FILE);
    }

    const list = Array.isArray(parsed) ? parsed : parsed?.templates;
    const items = Array.isArray(list)
        ? list.filter((item) => item !== null && typeof item === 'object' && !Array.isArray(item))
        : [];
    if (items.length === 0) {
        throw new Error(INVALID_IMPORT_FILE);
    }

    return items.map((item) => ({
        name: String(item.name ?? '').substring(0, NAME_MAX_LENGTH) || unnamed,
        content: String(item.content ?? ''),
        isglobal: Number(item.isglobal ?? 0) === 1 ? 1 : 0,
    }));
};
