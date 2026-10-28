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
 * View models of the chart, bar chart and gauge blocks, run via `node --test` too.
 *
 * The three blocks draw with plain HTML and a class each, never with SVG: where Moodle runs the text through
 * HTMLPurifier (a forum post, a glossary entry, a question, an assignment) the cleaner removes SVG, `data-*`,
 * `aria-*` and custom properties but keeps classes and a width or a height in percent. So every number that
 * varies per block is either a class (the colour, the zone, the whole percent of a gauge) or a width/height.
 * This module imports nothing so that Node can load it.
 *
 * @module     tiny_studiolms/blocks/chart_data
 * @copyright  2026 Jean Lúcio
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

// The colours are classes `slms-bar-c1` … `slms-bar-c6` in the stylesheet; the popups show the same ones.
export const PALETTE = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#f97316'];

/**
 * Round to two decimals, as a number the template can print inside a `width`.
 * @param {number} n Value.
 * @returns {number} Rounded value.
 */
const two = (n) => Math.round(n * 100) / 100;

/**
 * The class number (1–6) of the colour of the nth item.
 * @param {number} index Zero-based position.
 * @returns {number} Colour number.
 */
export const colorOf = (index) => (index % PALETTE.length) + 1;

/**
 * Model of the stacked bar of the chart block: one segment per slice, wide in proportion to its value.
 * @param {Array<{label: string, value: number}>} slices Slices with a value above zero.
 * @returns {Array<{label: string, pct: number, width: number, color: number}>} One entry per slice.
 */
export const sliceModel = (slices) => {
    const total = slices.reduce((sum, s) => sum + s.value, 0);
    if (total <= 0) {
        return [];
    }
    return slices.map((s, i) => ({
        label: s.label || '',
        pct: Math.round((s.value / total) * 100),
        width: two((s.value / total) * 100),
        color: colorOf(i),
    }));
};

/**
 * Model of the bar chart. A horizontal bar is as long as its share of the largest value, a vertical one as tall;
 * the percentage printed beside it is the share of the total, unless the block is set to print the value as it
 * was typed.
 * @param {Array<{label: string, value: number}>} items Items with a value above zero.
 * @param {boolean} [showValue] Print the typed value instead of the share of the total.
 * @returns {Array<{label: string, pct: number, shown: string, size: number, color: number}>} One entry per item.
 */
export const barModel = (items, showValue = false) => {
    const total = items.reduce((sum, it) => sum + it.value, 0);
    const max = Math.max(...items.map((it) => it.value));
    if (total <= 0) {
        return [];
    }
    return items.map((it, i) => ({
        label: it.label || '',
        pct: Math.round((it.value / total) * 100),
        shown: showValue ? String(it.value) : `${Math.round((it.value / total) * 100)}%`,
        size: two((it.value / max) * 100),
        color: colorOf(i),
    }));
};

/**
 * The zone of a gauge, the traffic light of the block: green from 67, amber from 34, red below.
 * @param {number} value Whole percent.
 * @returns {string} 'ok', 'warn' or 'low'.
 */
export const gaugeZone = (value) => {
    if (value >= 67) {
        return 'ok';
    }
    return value >= 34 ? 'warn' : 'low';
};

/**
 * Model of one gauge. The stylesheet has a class `slms-gp-0` … `slms-gp-100` that turns the fill, so the value
 * is a whole percent.
 * @param {number|string} raw Value as typed.
 * @param {string} label Label under the value.
 * @returns {{value: number, label: string, zone: string}} The gauge.
 */
export const gaugeModel = (raw, label) => {
    const value = Math.min(100, Math.max(0, parseInt(raw, 10) || 0));
    return {value, label: label || '', zone: gaugeZone(value)};
};
