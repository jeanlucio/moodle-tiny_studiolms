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
 * Loads the translated example texts of the blocks and hands them out synchronously.
 *
 * The block definitions fall back to these texts in places that cannot wait for a string (a popup
 * field the author emptied, say), so everything is fetched once, in a single request, before any
 * block is used. See localize_defaults.js for where the texts end up.
 *
 * @module     tiny_studiolms/blocks/default_texts
 * @copyright  2026 Jean Lúcio
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import {getStrings} from 'core/str';

/**
 * Every text asked for: a string key, with the numbers or letters it is used with when it takes one.
 *
 * @var {Array<[string, Array<(string|number)>]>}
 */
const WANTED = [
    ['default_label_approved', []],
    ['default_label_inprogress', []],
    ['default_label_failed', []],
    ['default_gauge_label', []],
    ['default_stat_approval', []],
    ['default_stat_modules', []],
    ['default_stat_participants', []],
    ['default_step_title', [1, 2, 3]],
    ['default_event_title', [1, 2, 3]],
    ['default_feature_title', [1, 2, 3]],
    ['default_option_label', ['A', 'B']],
    ['steps_state_current', []],
    ['steps_state_done', []],
];

/** @var {Object<string, string>} Loaded texts, keyed "string key" or "string key:number". */
const texts = {};

/** @var {Promise<void>|null} The one load in progress or done. */
let loading = null;

/**
 * Asks for every example text in one request and stores the answers.
 *
 * @returns {Promise<void>}
 */
const fetchTexts = async() => {
    const requests = [];
    const slots = [];
    WANTED.forEach(([key, params]) => {
        if (params.length === 0) {
            requests.push({key, component: 'tiny_studiolms'});
            slots.push(key);
        }
        params.forEach((param) => {
            requests.push({key, component: 'tiny_studiolms', param});
            slots.push(`${key}:${param}`);
        });
    });
    const strings = await getStrings(requests);
    strings.forEach((value, index) => {
        texts[slots[index]] = value;
    });
};

/**
 * Fetches every example text, once. Later calls return the same promise.
 *
 * @returns {Promise<void>}
 */
export const loadDefaultTexts = () => {
    if (loading === null) {
        loading = fetchTexts();
    }
    return loading;
};

/**
 * Returns an example text that loadDefaultTexts() has already fetched.
 *
 * @param {string} key String key, for example default_step_title.
 * @param {(string|number)=} param The number or letter the string takes, if any.
 * @returns {string} The text, or '' while the texts are not loaded yet.
 */
export const defaultText = (key, param) => texts[param === undefined ? key : `${key}:${param}`] ?? '';
