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
 * Bar chart block — renders a horizontal or vertical bar chart in plain HTML.
 *
 * @module     tiny_studiolms/blocks/chart_bar
 * @copyright  2026 Jean Lúcio
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import Templates from 'core/templates';
import Notification from 'core/notification';
import {PALETTE, barModel} from './chart_data';
import {alignVars, bindAlign, normalizeAlign} from './block_align';

const MAX_ITEMS = 6;

// ---------------------------------------------------------------------------
// Popup helpers.
// ---------------------------------------------------------------------------

/**
 * Read item rows from the popup DOM into the data object.
 * @param {Element} popup Popup root element.
 * @param {object} data Block data object (mutated in-place).
 */
const readItemsFromPopup = (popup, data) => {
    const items = [];
    for (let i = 1; i <= MAX_ITEMS; i++) {
        const label = popup.querySelector(`#cb_label${i}`)?.value?.trim() ?? '';
        const raw = popup.querySelector(`#cb_value${i}`)?.value?.trim() ?? '';
        const value = parseFloat(raw);
        if ((label || raw) && value > 0) {
            items.push({label, value});
        }
    }
    data.items = items.length ? items : [{label: '', value: 1}];
};

/**
 * Convert data.items to flat popup template variables.
 * @param {object} data Block data.
 * @returns {object} Flat vars for the popup template.
 */
const dataToPopupVars = (data) => {
    const items = Array.isArray(data.items) ? data.items : [];
    const out = {
        title: data.title || '',
        typeHorizontal: (data.type || 'horizontal') === 'horizontal',
        typeVertical: (data.type || 'horizontal') === 'vertical',
        showValue: data.showValue === true,
    };
    for (let i = 0; i < MAX_ITEMS; i++) {
        const it = items[i] || {};
        out[`cb_color${i + 1}`] = PALETTE[i % PALETTE.length];
        out[`cb_label${i + 1}`] = it.label ?? '';
        out[`cb_value${i + 1}`] = String(it.value ?? '');
    }
    return out;
};

// ---------------------------------------------------------------------------
// Block export.
// ---------------------------------------------------------------------------

export default {
    id: 'chartBar',
    titleString: 'block_chart_bar_title',
    icon: '📊',

    defaultData: {
        align: 'center',
        type: 'horizontal',
        showValue: false,
        title: '',
        items: [
            {label: '', value: 75},
            {label: '', value: 15},
            {label: '', value: 10},
        ],
    },

    buildToolbar: async(container, data, onUpdate, PopupManager) => {
        try {
            const {html, js} = await Templates.renderForPromise('tiny_studiolms/toolbar_chart_bar', {});
            Templates.replaceNodeContents(container, html, js);

            const btnEdit = container.querySelector('#tb-chart-bar-edit');
            if (!btnEdit) {
                return;
            }

            btnEdit.addEventListener('click', () => {
                const tplData = dataToPopupVars(data);
                Object.assign(tplData, alignVars(data.align, 'center'));

                PopupManager.open(btnEdit, 'tiny_studiolms/popup_chart_bar_edit', tplData, (popup) => {
                    bindAlign(popup, data, onUpdate);
                    const typeBtns = popup.querySelectorAll('.slms-cb-type-btn');
                    const titleEl = popup.querySelector('#cb_title');

                    const applyChanges = () => {
                        data.title = titleEl?.value?.trim() ?? '';
                        readItemsFromPopup(popup, data);
                        onUpdate(data);
                    };

                    titleEl?.addEventListener('input', applyChanges);

                    popup.querySelector('#cb_show_value')?.addEventListener('change', (ev) => {
                        data.showValue = ev.target.value === 'value';
                        onUpdate(data);
                    });

                    for (let i = 1; i <= MAX_ITEMS; i++) {
                        popup.querySelector(`#cb_label${i}`)?.addEventListener('input', applyChanges);
                        popup.querySelector(`#cb_value${i}`)?.addEventListener('input', applyChanges);
                    }

                    typeBtns.forEach(btn => {
                        btn.addEventListener('click', () => {
                            typeBtns.forEach(b => b.classList.remove('selected'));
                            btn.classList.add('selected');
                            data.type = btn.getAttribute('data-type') || 'horizontal';
                            onUpdate(data);
                        });
                    });
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
        const type = data.type === 'vertical' ? 'vertical' : 'horizontal';
        const items = (Array.isArray(data.items) ? data.items : [])
            .filter(it => it.value > 0);

        return Templates.render('tiny_studiolms/block_chart_bar', {
            hoverEffect: data.hoverEffect,
            align: normalizeAlign(data.align, 'center'),
            type,
            horizontal: type === 'horizontal',
            title: data.title || '',
            items: barModel(items, data.showValue === true),
        });
    },
};
