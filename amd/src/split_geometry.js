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
 * Where the line between a block's settings and the component list can be, and where it snaps.
 *
 * Plain ES module with no core/* import, so Node can load it for the headless tests.
 *
 * @module     tiny_studiolms/split_geometry
 * @copyright  2026 Jean Lúcio
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

/** Settings shorter than this, in pixels, collapse: only the component list is left. */
export const SNAP_SETTINGS = 64;
/** A component list squeezed under this collapses: only the settings are left. */
export const SNAP_LIST = 100;
/** Least the component list keeps while both are shown (9rem, as in styles.css). */
export const MIN_LIST = 144;

export const STATE_BOTH = 'both';
export const STATE_SETTINGS = 'properties';
export const STATE_LIST = 'list';

/**
 * Brings a height the pointer or a key asked for to what the line can do.
 *
 * Dragged close enough to either end, the line snaps there and one of the areas is hidden; anywhere else
 * both are shown, with the component list keeping its minimum.
 *
 * @param {number} total Pixels shared by the settings and the component list.
 * @param {number} height Pixels asked for the settings.
 * @returns {{state: string, height: number}} The state, and the height of the settings in it.
 */
export const resolveSplit = (total, height) => {
    const asked = Number.isFinite(height) ? height : 0;
    if (asked < SNAP_SETTINGS) {
        return {state: STATE_LIST, height: 0};
    }
    if (total - asked < SNAP_LIST) {
        return {state: STATE_SETTINGS, height: total};
    }
    const highest = Math.max(SNAP_SETTINGS, total - MIN_LIST);
    return {state: STATE_BOTH, height: Math.min(Math.max(Math.round(asked), SNAP_SETTINGS), highest)};
};

/**
 * Moves the line by a step of the keyboard.
 *
 * From an end the first step comes back into the middle, at the nearest height that keeps both areas, since a
 * step of a few pixels would otherwise land in the snap zone it just left.
 *
 * @param {string} state The current state.
 * @param {number} height Pixels of the settings now (0 with the settings hidden, the total with the list hidden).
 * @param {number} total Pixels shared by the settings and the component list.
 * @param {number} delta Pixels to move the line by; positive is down.
 * @returns {{state: string, height: number}}
 */
export const stepSplit = (state, height, total, delta) => {
    if (state === STATE_LIST && delta > 0) {
        return resolveSplit(total, SNAP_SETTINGS);
    }
    if (state === STATE_SETTINGS && delta < 0) {
        return resolveSplit(total, total - MIN_LIST);
    }
    return resolveSplit(total, height + delta);
};

/**
 * Where the line is, as the percentage a screen reader announces for a separator.
 *
 * @param {string} state The current state.
 * @param {number} height Pixels of the settings.
 * @param {number} total Pixels shared by the settings and the component list.
 * @returns {number} 0 with the settings hidden, 100 with the list hidden, otherwise between 1 and 99.
 */
export const splitPercent = (state, height, total) => {
    if (state === STATE_LIST) {
        return 0;
    }
    if (state === STATE_SETTINGS) {
        return 100;
    }
    if (!(total > 0)) {
        return 50;
    }
    return Math.min(99, Math.max(1, Math.round((height / total) * 100)));
};

/**
 * Reads a height saved by an earlier session.
 *
 * @param {*} raw What the storage returned.
 * @returns {number|null} A height in pixels, or null when there is none worth using.
 */
export const parseStoredHeight = (raw) => {
    const height = parseInt(raw, 10);
    return Number.isFinite(height) && height >= SNAP_SETTINGS ? height : null;
};
