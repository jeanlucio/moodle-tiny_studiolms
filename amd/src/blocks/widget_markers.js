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
 * The markers the StudioLMS widgets filter replaces with a widget: how they are written and read back.
 *
 * Plain ES module with no core/* import, so Node can load it for the headless tests. The syntax is the contract of
 * the filter (filter_studiolms, widgets::CONTRACT): [NAME option=value]. The options go inside the marker, never in a
 * data-* attribute, because the cleaner of Moodle removes those from a forum, a glossary or a question.
 *
 * @module     tiny_studiolms/blocks/widget_markers
 * @copyright  2026 Jean Lúcio
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

/** The version of the marker syntax this module writes. The tab only shows when the filter speaks the same one. */
export const CONTRACT = 1;

/** The marker name of each widget, by the identifier the filter reports in widgets::enabled(). */
export const MARKERS = {
    forumstats: 'FORUMSTATS',
    coursemap: 'COURSEMAP',
    quizinfo: 'QUIZINFO',
};

export const COURSEMAP_CURRENT = ['date', 'progress'];
export const COURSEMAP_STYLE = ['auto', 'steps', 'tiles'];

/**
 * Returns the way of deciding the current step of the map: the stored one when it is known, the date otherwise.
 *
 * @param {*} value The current field of the block data.
 * @returns {string} One of COURSEMAP_CURRENT.
 */
export const normalizeCurrent = (value) => (COURSEMAP_CURRENT.includes(value) ? value : 'date');

/**
 * Returns the look of the map: the stored one when it is known, automatic otherwise.
 *
 * @param {*} value The style field of the block data.
 * @returns {string} One of COURSEMAP_STYLE.
 */
export const normalizeStyle = (value) => (COURSEMAP_STYLE.includes(value) ? value : 'auto');

/**
 * Writes the marker of a widget, with only the options that differ from the default, so the simple marker stays simple.
 *
 * @param {string} widget The identifier of the widget (a key of MARKERS).
 * @param {object} options The options of the widget; the map takes current and style.
 * @returns {string} The marker, such as [COURSEMAP current=progress], or an empty string for an unknown widget.
 */
export const buildMarker = (widget, options = {}) => {
    if (!Object.hasOwn(MARKERS, widget)) {
        return '';
    }
    let extras = '';
    if (widget === 'coursemap') {
        if (normalizeCurrent(options.current) === 'progress') {
            extras += ' current=progress';
        }
        const style = normalizeStyle(options.style);
        if (style !== 'auto') {
            extras += ` style=${style}`;
        }
    }
    return `[${MARKERS[widget]}${extras}]`;
};

/**
 * Reads the options of the map back from the text of its marker.
 *
 * @param {string} text The text of the marker, such as [COURSEMAP current=progress style=tiles].
 * @returns {{current: string, style: string}} The options, each one the default when the marker does not say it.
 */
export const parseCourseMapOptions = (text) => {
    const found = {};
    for (const [, name, quoted, plain] of String(text).matchAll(/\s([a-z]+)=(?:"([^"]*)"|([a-z0-9_-]+))/g)) {
        found[name] = quoted ?? plain;
    }
    return {current: normalizeCurrent(found.current), style: normalizeStyle(found.style)};
};
