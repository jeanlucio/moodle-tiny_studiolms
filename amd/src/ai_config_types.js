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
 * Type coercion of block configs that come back from the AI.
 *
 * The config of a generated block is whatever JSON the model returned. The blocks call string
 * methods on text fields and test flags for truth, so a number in a table cell, a null where a
 * string belongs or the text "false" for a flag made a block throw or show the wrong thing. Each
 * value is brought to the type of the block's own default before the block sees it. Markup is not
 * touched here: sanitizeAiConfig() does that.
 *
 * Plain ES module with no core/* import, so Node can load it for the headless tests.
 *
 * @module     tiny_studiolms/ai_config_types
 * @copyright  2026 Jean Lúcio
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

const TRUE_WORDS = ['true', '1', 'yes', 'on'];
const FALSE_WORDS = ['false', '0', 'no', 'off', ''];

const isPlainObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

/**
 * Brings a value of unknown shape to text: scalars become strings, anything else is empty.
 *
 * @param {*} value
 * @returns {string}
 */
const toText = (value) => {
    if (typeof value === 'string') {
        return value;
    }
    return typeof value === 'number' && Number.isFinite(value) ? String(value) : '';
};

/**
 * Brings the elements of a list whose default holds no sample element to text.
 *
 * Every list that starts empty in this plugin holds text (grid slots, table cells), possibly
 * nested one level (table rows), so scalars become strings and anything else becomes empty.
 *
 * @param {Array} list
 * @returns {Array}
 */
const coerceTextList = (list) => list.map((item) => (Array.isArray(item) ? coerceTextList(item) : toText(item)));

/**
 * Brings one value to the type of the sample taken from the block defaults.
 *
 * @param {*} value The value from the AI.
 * @param {*} sample The matching value of the block defaults.
 * @returns {*} A value of the sample's type; the sample itself when the value cannot be converted.
 */
const coerceValue = (value, sample) => {
    if (typeof sample === 'string') {
        return typeof value === 'string' || typeof value === 'number' ? toText(value) : sample;
    }
    if (typeof sample === 'number') {
        // A leading number is enough: the model writes "45%" or "12 pts" where the block wants 45 or 12.
        const number = typeof value === 'string' ? parseFloat(value) : value;
        return typeof number === 'number' && Number.isFinite(number) ? number : sample;
    }
    if (typeof sample === 'boolean') {
        if (typeof value === 'boolean') {
            return value;
        }
        if (typeof value === 'number') {
            return value !== 0;
        }
        const word = typeof value === 'string' ? value.trim().toLowerCase() : null;
        if (TRUE_WORDS.includes(word)) {
            return true;
        }
        return FALSE_WORDS.includes(word) ? false : sample;
    }
    if (Array.isArray(sample)) {
        if (!Array.isArray(value)) {
            return sample;
        }
        if (isPlainObject(sample[0])) {
            return value.map((item) => coerceObject(item, sample[0]));
        }
        return sample.length === 0 ? coerceTextList(value) : value;
    }
    if (isPlainObject(sample)) {
        return coerceObject(value, sample);
    }
    return value;
};

/**
 * Brings the fields of an object to the types of the matching fields of the sample.
 *
 * Fields the sample does not declare are kept as they are.
 *
 * @param {*} value The object from the AI.
 * @param {object} sample The matching object of the block defaults.
 * @returns {object} A new object.
 */
const coerceObject = (value, sample) => {
    const source = isPlainObject(value) ? value : {};
    const result = {};
    Object.keys(source).forEach((key) => {
        if (key === '__proto__') {
            return;
        }
        result[key] = Object.prototype.hasOwnProperty.call(sample, key)
            ? coerceValue(source[key], sample[key])
            : source[key];
    });
    return result;
};

/**
 * Merges a config from the AI over the defaults of a block, field by field, with the types of the
 * defaults.
 *
 * @param {object} defaults The block's defaultData.
 * @param {*} config The config the AI returned.
 * @returns {object} A new object holding every default and every converted field of the config.
 */
export const mergeAiConfig = (defaults, config) => {
    const merged = JSON.parse(JSON.stringify(defaults ?? {}));
    return Object.assign(merged, coerceObject(config, defaults ?? {}));
};
