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
 * Chart block — renders the share of each slice as a stacked bar with a legend, in plain HTML.
 *
 * @module     tiny_studiolms/blocks/chart
 * @copyright  2026 Jean Lúcio
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import Templates from 'core/templates';
import Notification from 'core/notification';
import {PALETTE, sliceModel} from './chart_data';
import {alignVars, bindAlign, normalizeAlign} from './block_align';

const MAX_SLICES = 6;

// ---------------------------------------------------------------------------
// Popup helpers.
// ---------------------------------------------------------------------------

/**
 * Read the slice rows from the popup DOM into the data object.
 * Rows with no label and no value are silently ignored.
 * @param {Element} popup Popup root element.
 * @param {object} data Block data object (mutated in-place).
 */
const readSlicesFromPopup = (popup, data) => {
    const slices = [];
    for (let i = 1; i <= MAX_SLICES; i++) {
        const label = popup.querySelector(`#ch_label${i}`)?.value?.trim() ?? '';
        const raw = popup.querySelector(`#ch_value${i}`)?.value?.trim() ?? '';
        const value = parseFloat(raw);
        if ((label || raw) && value > 0) {
            slices.push({label, value});
        }
    }
    data.slices = slices.length ? slices : [{label: '', value: 1}];
};

/**
 * Convert data.slices to flat popup template variables (ch_label1…6, ch_value1…6).
 * @param {object} data Block data.
 * @returns {object} Flat vars for the popup template.
 */
const dataToPopupVars = (data) => {
    const slices = Array.isArray(data.slices) ? data.slices : [];
    const out = {
        title: data.title || '',
    };
    for (let i = 0; i < MAX_SLICES; i++) {
        const s = slices[i] || {};
        out[`ch_label${i + 1}`] = s.label ?? '';
        out[`ch_value${i + 1}`] = String(s.value ?? '');
        out[`ch_color${i + 1}`] = PALETTE[i % PALETTE.length];
    }
    return out;
};

// ---------------------------------------------------------------------------
// Block export.
// ---------------------------------------------------------------------------

export default {
    id: 'chart',
    titleString: 'block_chart_title',
    icon: '🥧',

    defaultData: {
        align: 'center',
        title: '',
        slices: [
            {label: '', value: 75},
            {label: '', value: 15},
            {label: '', value: 10},
        ],
    },

    buildToolbar: async(container, data, onUpdate, PopupManager) => {
        try {
            const {html, js} = await Templates.renderForPromise('tiny_studiolms/toolbar_chart', {});
            Templates.replaceNodeContents(container, html, js);

            const btnEdit = container.querySelector('#tb-chart-edit');
            if (!btnEdit) {
                return;
            }

            btnEdit.addEventListener('click', () => {
                const tplData = dataToPopupVars(data);
                Object.assign(tplData, alignVars(data.align, 'center'));

                PopupManager.open(btnEdit, 'tiny_studiolms/popup_chart_edit', tplData, (popup) => {
                    bindAlign(popup, data, onUpdate);
                    const titleEl = popup.querySelector('#ch_title');

                    const applyChanges = () => {
                        data.title = titleEl?.value?.trim() ?? '';
                        readSlicesFromPopup(popup, data);
                        onUpdate(data);
                    };

                    titleEl?.addEventListener('input', applyChanges);

                    // Slice input listeners.
                    for (let i = 1; i <= MAX_SLICES; i++) {
                        popup.querySelector(`#ch_label${i}`)?.addEventListener('input', applyChanges);
                        popup.querySelector(`#ch_value${i}`)?.addEventListener('input', applyChanges);
                    }
                });
            });
        } catch (error) {
            // A genuinely unexpected failure (a template/DOM error, not an anticipated business
            // rule), so it goes through Notification.exception() instead of inline text —
            // reserved for real bugs, not routine validation failures.
            container.innerHTML = '';
            Notification.exception(error);
        }
    },

    renderHtml: async(data) => {
        const slices = (Array.isArray(data.slices) ? data.slices : [])
            .filter(s => s.value > 0);

        return Templates.render('tiny_studiolms/block_chart', {
            hoverEffect: data.hoverEffect,
            align: normalizeAlign(data.align, 'center'),
            title: data.title || '',
            slices: sliceModel(slices),
        });
    },
};
