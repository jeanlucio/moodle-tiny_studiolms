// This file is part of Moodle - http://moodle.org/
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
// along with Moodle.  If not, see <http://www.gnu.org/licenses/>.

/**
 * Bar chart block — renders a pure-SVG horizontal or vertical bar chart.
 *
 * @module     tiny_studiolms/blocks/chart_bar
 * @copyright  2026 Jean Lúcio <jeanlucio@gmail.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import Templates from 'core/templates';
import {getString} from 'core/str';

const MAX_ITEMS = 6;
const BAR_COLORS = [
    '#3b82f6',
    '#10b981',
    '#f59e0b',
    '#ef4444',
    '#8b5cf6',
    '#f97316',
];

// Horizontal bar chart constants.
const H_SVG_W = 340;
const H_ROW_H = 34;
const H_LABEL_W = 108;
const H_BAR_X = 114;
const H_MAX_BAR_W = 196;

// Vertical bar chart constants.
const V_BAR_W = 54;
const V_COL_W = 80;
const V_CHART_BOTTOM = 130;
const V_CHART_H = 100;
const V_SVG_H = 155;
const V_MAX_LABEL = 7;

/**
 * Escape HTML special characters.
 * @param {string} str Raw string.
 * @returns {string} Safe string.
 */
const esc = (str) => String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/**
 * Truncate a string and append ellipsis if needed.
 * @param {string} str Input string.
 * @param {number} max Maximum character count.
 * @returns {string} Truncated string.
 */
const truncate = (str, max) => str.length > max ? str.slice(0, max - 1) + '…' : str;

/**
 * Build SVG for horizontal bar chart.
 * @param {Array<{label: string, value: number}>} items Filtered items.
 * @returns {string} SVG markup.
 */
const buildHorizontalSvg = (items) => {
    const maxVal = Math.max(...items.map(it => it.value));
    const svgH = items.length * H_ROW_H + 12;
    const parts = [
        `<svg viewBox="0 0 ${H_SVG_W} ${svgH}"`,
        `role="img" xmlns="http://www.w3.org/2000/svg"`,
        `class="slms-chart-bar__svg">`,
    ];

    items.forEach((item, i) => {
        const color = BAR_COLORS[i % BAR_COLORS.length];
        const barW = Math.round((item.value / maxVal) * H_MAX_BAR_W);
        const pct = Math.round((item.value / items.reduce((s, it) => s + it.value, 0)) * 100);
        const rowY = 6 + i * H_ROW_H;
        const midY = rowY + Math.floor(H_ROW_H / 2);
        const textY = midY + 5;
        const barY = rowY + 9;
        const barH = H_ROW_H - 18;

        parts.push(
            `<text x="${H_LABEL_W}" y="${textY}" text-anchor="end"`,
            ` font-size="13" fill="#1e293b">${esc(item.label)}</text>`,
            `<rect x="${H_BAR_X}" y="${barY}" width="${H_MAX_BAR_W}" height="${barH}"`,
            ` rx="4" fill="#f1f5f9"/>`,
            `<rect x="${H_BAR_X}" y="${barY}" width="${barW}" height="${barH}"`,
            ` rx="4" fill="${color}" aria-label="${esc(item.label)}: ${pct}%"/>`,
            `<text x="${H_BAR_X + barW + 6}" y="${textY}"`,
            ` font-size="12" font-weight="600" fill="${color}">${pct}%</text>`
        );
    });

    parts.push('</svg>');
    return parts.join(' ');
};

/**
 * Build SVG for vertical bar chart.
 * @param {Array<{label: string, value: number}>} items Filtered items.
 * @returns {string} SVG markup.
 */
const buildVerticalSvg = (items) => {
    const maxVal = Math.max(...items.map(it => it.value));
    const total = items.reduce((s, it) => s + it.value, 0);
    const svgW = items.length * V_COL_W + 20;
    const parts = [
        `<svg viewBox="0 0 ${svgW} ${V_SVG_H}"`,
        `role="img" xmlns="http://www.w3.org/2000/svg"`,
        `class="slms-chart-bar__svg">`,
    ];

    items.forEach((item, i) => {
        const color = BAR_COLORS[i % BAR_COLORS.length];
        const barH = Math.round((item.value / maxVal) * V_CHART_H);
        const barX = 10 + i * V_COL_W;
        const barY = V_CHART_BOTTOM - barH;
        const midX = barX + Math.floor(V_BAR_W / 2);
        const pct = Math.round((item.value / total) * 100);
        const label = truncate(item.label, V_MAX_LABEL);

        parts.push(
            `<rect x="${barX}" y="${barY}" width="${V_BAR_W}" height="${barH}"`,
            ` rx="4" fill="${color}" aria-label="${esc(item.label)}: ${pct}%"/>`,
            `<text x="${midX}" y="${barY - 4}" text-anchor="middle"`,
            ` font-size="11" font-weight="600" fill="${color}">${pct}%</text>`,
            `<text x="${midX}" y="${V_CHART_BOTTOM + 14}" text-anchor="middle"`,
            ` font-size="11" fill="#64748b">${esc(label)}</text>`
        );
    });

    parts.push('</svg>');
    return parts.join(' ');
};

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
    };
    for (let i = 0; i < MAX_ITEMS; i++) {
        const it = items[i] || {};
        out[`cb_color${i + 1}`] = BAR_COLORS[i % BAR_COLORS.length];
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
        type: 'horizontal',
        title: '',
        items: [
            {label: 'Aprovados', value: 75},
            {label: 'Em progresso', value: 15},
            {label: 'Reprovados', value: 10},
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

                PopupManager.open(btnEdit, 'tiny_studiolms/popup_chart_bar_edit', tplData, (popup) => {
                    const typeBtns = popup.querySelectorAll('.slms-cb-type-btn');
                    const titleEl = popup.querySelector('#cb_title');

                    const applyChanges = () => {
                        data.title = titleEl?.value?.trim() ?? '';
                        readItemsFromPopup(popup, data);
                        onUpdate(data);
                    };

                    titleEl?.addEventListener('input', applyChanges);

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
            container.innerHTML = '';
            const errEl = document.createElement('div');
            errEl.className = 'text-danger small';
            try {
                errEl.textContent = await getString('error_loading_form', 'tiny_studiolms');
            } catch (_) {
                errEl.textContent = 'Error';
            }
            container.appendChild(errEl);
        }
    },

    renderHtml: async(data) => {
        const type = data.type || 'horizontal';
        const items = (Array.isArray(data.items) ? data.items : [])
            .filter(it => it.value > 0);

        const svg = type === 'vertical'
            ? buildVerticalSvg(items)
            : buildHorizontalSvg(items);

        return Templates.render('tiny_studiolms/block_chart_bar', {
            type,
            title: data.title ? esc(data.title) : '',
            svg,
        });
    },
};
