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
 * Puts translated text into the example content every block starts with.
 *
 * Plain ES module with no core/* import, so Node can load it for the headless tests. The texts come
 * in through a lookup function, which keeps this file free of anything that needs a browser.
 *
 * Each block keeps its example labels (a chart's three slices, a timeline's three events) in
 * defaultData, which is read when a block is added, drawn as the library thumbnail and used to fill
 * the fields an old block lacks. Those labels must not be literals: a site in another language would
 * get them in the wrong one, and no language pack could translate them.
 *
 * @module     tiny_studiolms/blocks/localize_defaults
 * @copyright  2026 Jean Lúcio
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

/**
 * Replaces the example labels in the blocks' defaultData with translated ones, in place.
 *
 * @param {object} blocks The block definitions keyed by id (the registry's Blocks).
 * @param {function(string, (string|number)=): string} text Returns the translated text for a key and
 *                   an optional number or letter.
 */
export const applyDefaultTexts = (blocks, text) => {
    const labelSlices = (items, key) => {
        ['default_label_approved', 'default_label_inprogress', 'default_label_failed'].forEach((name, index) => {
            if (items[index]) {
                items[index][key] = text(name);
            }
        });
    };
    const numbered = (items, key, name) => {
        items.forEach((item, index) => {
            item[key] = text(name, index + 1);
        });
    };

    if (blocks.chart) {
        labelSlices(blocks.chart.defaultData.slices, 'label');
    }
    if (blocks.chartBar) {
        labelSlices(blocks.chartBar.defaultData.items, 'label');
    }
    if (blocks.gauge) {
        blocks.gauge.defaultData.gauges[0].label = text('default_gauge_label');
    }
    if (blocks.infographic) {
        ['default_stat_approval', 'default_stat_modules', 'default_stat_participants'].forEach((name, index) => {
            blocks.infographic.defaultData.items[index].label = text(name);
        });
    }
    if (blocks.tabs) {
        numbered(blocks.tabs.defaultData.tabs, 'title', 'default_tab_title');
    }
    if (blocks.infographicSteps) {
        numbered(blocks.infographicSteps.defaultData.items, 'title', 'default_step_title');
    }
    if (blocks.infographicTimeline) {
        numbered(blocks.infographicTimeline.defaultData.items, 'title', 'default_event_title');
    }
    if (blocks.infographicFeatures) {
        numbered(blocks.infographicFeatures.defaultData.items, 'title', 'default_feature_title');
    }
    if (blocks.infographicComparison) {
        const data = blocks.infographicComparison.defaultData;
        data.col1 = text('default_option_label', 'A');
        data.col2 = text('default_option_label', 'B');
        numbered(data.items, 'label', 'default_feature_title');
    }
};
