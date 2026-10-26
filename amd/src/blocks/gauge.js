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
 * Gauge block — renders 1–3 semi-circle gauges side by side, in plain HTML and CSS.
 *
 * @module     tiny_studiolms/blocks/gauge
 * @copyright  2026 Jean Lúcio
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import Templates from 'core/templates';
import Notification from 'core/notification';
import {gaugeModel} from './chart_data';

const MAX_GAUGES = 3;

// Visual slot-indicator colours used only inside the popup.
const SLOT_COLORS = ['#3b82f6', '#10b981', '#8b5cf6'];

// ---------------------------------------------------------------------------
// Popup helpers.
// ---------------------------------------------------------------------------

/**
 * Read gauge slots from the popup DOM, ignoring empty slots.
 * A slot is empty when both value is 0 and label is blank.
 * @param {Element} popup Popup root element.
 * @param {object}  data  Block data object (mutated in-place).
 */
const readGaugesFromPopup = (popup, data) => {
    const gauges = [];
    for (let i = 1; i <= MAX_GAUGES; i++) {
        const rawVal = popup.querySelector(`#gf_value${i}`)?.value ?? '0';
        const value = Math.min(100, Math.max(0, parseInt(rawVal, 10) || 0));
        const label = popup.querySelector(`#gf_label${i}`)?.value?.trim() ?? '';
        if (value > 0 || label) {
            gauges.push({value, label});
        }
    }
    data.gauges = gauges.length ? gauges : [{value: 0, label: ''}];
};

/**
 * Migrate old single-gauge data format to the gauges array format.
 * @param {object} data Block data.
 * @returns {Array<{value: number, label: string}>} Normalised gauges array.
 */
const normaliseGauges = (data) => {
    if (Array.isArray(data.gauges) && data.gauges.length) {
        return data.gauges;
    }
    return [{value: data.value ?? 75, label: data.label || ''}];
};

/**
 * Convert block data to flat template variables for the popup.
 * @param {object} data Block data.
 * @returns {object} Flat vars.
 */
const dataToPopupVars = (data) => {
    const gauges = normaliseGauges(data);
    const out = {title: data.title || ''};
    for (let i = 0; i < MAX_GAUGES; i++) {
        const g = gauges[i] || {value: 0, label: ''};
        out[`gf_color${i + 1}`] = SLOT_COLORS[i];
        out[`gf_value${i + 1}`] = g.value ?? 0;
        out[`gf_label${i + 1}`] = g.label ?? '';
    }
    return out;
};

// ---------------------------------------------------------------------------
// Block export.
// ---------------------------------------------------------------------------

export default {
    id: 'gauge',
    titleString: 'block_gauge_title',
    icon: '🎯',

    defaultData: {
        title: '',
        gauges: [
            {value: 75, label: ''},
        ],
    },

    buildToolbar: async(container, data, onUpdate, PopupManager) => {
        try {
            const {html, js} = await Templates.renderForPromise('tiny_studiolms/toolbar_gauge', {});
            Templates.replaceNodeContents(container, html, js);

            const btnEdit = container.querySelector('#tb-gauge-edit');
            if (!btnEdit) {
                return;
            }

            btnEdit.addEventListener('click', () => {
                PopupManager.open(
                    btnEdit,
                    'tiny_studiolms/popup_gauge_edit',
                    dataToPopupVars(data),
                    (popup) => {
                        const titleEl = popup.querySelector('#gf_title');

                        const applyChanges = () => {
                            data.title = titleEl?.value?.trim() ?? '';
                            readGaugesFromPopup(popup, data);
                            onUpdate(data);
                        };

                        titleEl?.addEventListener('input', applyChanges);

                        for (let i = 1; i <= MAX_GAUGES; i++) {
                            popup.querySelector(`#gf_value${i}`)?.addEventListener('input', applyChanges);
                            popup.querySelector(`#gf_label${i}`)?.addEventListener('input', applyChanges);
                        }
                    }
                );
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
        const gauges = normaliseGauges(data).filter(g => g.value > 0 || g.label);
        const items = (gauges.length ? gauges : [{value: 0, label: ''}])
            .map(g => gaugeModel(g.value, g.label));

        return Templates.render('tiny_studiolms/block_gauge', {
            hoverEffect: data.hoverEffect,
            title: data.title || '',
            gauges: items,
        });
    },
};
