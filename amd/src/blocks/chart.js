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
 * Chart block — renders a pure-SVG pie or donut chart, no external libraries.
 *
 * @module     tiny_studiolms/blocks/chart
 * @copyright  2026 Jean Lúcio <jeanlucio@gmail.com>
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import Templates from 'core/templates';
import {getString} from 'core/str';

const SVG_SIZE = 280;
const CX = SVG_SIZE / 2;
const CY = SVG_SIZE / 2;
const RADIUS = 118;
const INNER_RADIUS = 56;
const MAX_SLICES = 6;

const SLICE_COLORS = [
    '#3b82f6',
    '#10b981',
    '#f59e0b',
    '#ef4444',
    '#8b5cf6',
    '#f97316',
];

/**
 * Escape HTML special characters.
 * @param {string} str Raw string.
 * @returns {string} Escaped string safe for HTML attributes and text nodes.
 */
const esc = (str) => String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/**
 * Convert polar coordinates to cartesian point on the circle.
 * @param {number} angle Angle in radians, 0 = top.
 * @param {number} r Radius.
 * @returns {{x: number, y: number}}
 */
const polarToXY = (angle, r) => ({
    x: CX + r * Math.sin(angle),
    y: CY - r * Math.cos(angle),
});

/**
 * Build a single SVG path for one chart slice.
 * @param {number} startAngle Start angle in radians.
 * @param {number} endAngle End angle in radians.
 * @param {string} color Fill colour.
 * @param {string} label Accessible label string.
 * @param {string} type 'pie' or 'donut'.
 * @returns {string} SVG <path> element string.
 */
const buildSlicePath = (startAngle, endAngle, color, label, type) => {
    const outer1 = polarToXY(startAngle, RADIUS);
    const outer2 = polarToXY(endAngle, RADIUS);
    const large = (endAngle - startAngle) > Math.PI ? 1 : 0;

    let d;
    if (type === 'donut') {
        const inner1 = polarToXY(startAngle, INNER_RADIUS);
        const inner2 = polarToXY(endAngle, INNER_RADIUS);
        d = [
            `M ${outer1.x.toFixed(2)} ${outer1.y.toFixed(2)}`,
            `A ${RADIUS} ${RADIUS} 0 ${large} 1 ${outer2.x.toFixed(2)} ${outer2.y.toFixed(2)}`,
            `L ${inner2.x.toFixed(2)} ${inner2.y.toFixed(2)}`,
            `A ${INNER_RADIUS} ${INNER_RADIUS} 0 ${large} 0 ${inner1.x.toFixed(2)} ${inner1.y.toFixed(2)}`,
            'Z',
        ].join(' ');
    } else {
        d = [
            `M ${CX} ${CY}`,
            `L ${outer1.x.toFixed(2)} ${outer1.y.toFixed(2)}`,
            `A ${RADIUS} ${RADIUS} 0 ${large} 1 ${outer2.x.toFixed(2)} ${outer2.y.toFixed(2)}`,
            'Z',
        ].join(' ');
    }

    return `<path d="${d}" fill="${color}" aria-label="${esc(label)}"/>`;
};

/**
 * Build the complete SVG string for the chart.
 * @param {Array<{label: string, value: number}>} slices Valid slices (value > 0).
 * @param {string} type 'pie' or 'donut'.
 * @returns {string} Full inline SVG markup.
 */
const buildSvg = (slices, type) => {
    const total = slices.reduce((sum, s) => sum + s.value, 0);
    if (total <= 0) {
        return '';
    }

    let angle = 0;
    const paths = slices.map((slice, i) => {
        const sweep = (slice.value / total) * 2 * Math.PI;
        const endAngle = angle + sweep;
        const pct = Math.round((slice.value / total) * 100);
        const path = buildSlicePath(
            angle,
            endAngle,
            SLICE_COLORS[i % SLICE_COLORS.length],
            `${slice.label}: ${pct}%`,
            type
        );
        angle = endAngle;
        return path;
    });

    return [
        `<svg viewBox="0 0 ${SVG_SIZE} ${SVG_SIZE}"`,
        `role="img"`,
        `xmlns="http://www.w3.org/2000/svg"`,
        `class="slms-chart__svg">`,
        ...paths,
        `</svg>`,
    ].join(' ');
};

/**
 * Build the legend HTML for the chart slices.
 * @param {Array<{label: string, value: number}>} slices Valid slices (value > 0).
 * @returns {string} HTML string for the legend.
 */
const buildLegend = (slices) => {
    const total = slices.reduce((sum, s) => sum + s.value, 0);
    if (total <= 0) {
        return '';
    }

    const items = slices.map((slice, i) => {
        const color = SLICE_COLORS[i % SLICE_COLORS.length];
        const pct = Math.round((slice.value / total) * 100);
        return [
            `<div class="slms-chart__legend-item" style="display:flex;align-items:center;gap:0.4rem;font-size:0.8125rem;">`,
            `<span class="slms-chart__legend-dot"`,
            ` style="color:${color};font-size:14px;line-height:1;" aria-hidden="true">&#9679;</span>`,
            `<span class="slms-chart__legend-label">${esc(slice.label)}</span>`,
            `<span class="slms-chart__legend-pct" style="font-weight:600;">${pct}%</span>`,
            `</div>`,
        ].join('');
    });

    return `<div class="slms-chart__legend" style="display:flex;flex-direction:column;gap:0.4rem;">${items.join('')}</div>`;
};

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
        typePie: (data.type || 'donut') === 'pie',
        typeDonut: (data.type || 'donut') === 'donut',
    };
    for (let i = 0; i < MAX_SLICES; i++) {
        const s = slices[i] || {};
        out[`ch_label${i + 1}`] = s.label ?? '';
        out[`ch_value${i + 1}`] = String(s.value ?? '');
        out[`ch_color${i + 1}`] = SLICE_COLORS[i % SLICE_COLORS.length];
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
        type: 'donut',
        title: '',
        slices: [
            {label: 'Aprovados', value: 75},
            {label: 'Em progresso', value: 15},
            {label: 'Reprovados', value: 10},
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

                PopupManager.open(btnEdit, 'tiny_studiolms/popup_chart_edit', tplData, (popup) => {
                    const typeBtns = popup.querySelectorAll('.slms-ch-type-btn');
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

                    // Type toggle.
                    typeBtns.forEach(btn => {
                        btn.addEventListener('click', () => {
                            typeBtns.forEach(b => b.classList.remove('selected'));
                            btn.classList.add('selected');
                            data.type = btn.getAttribute('data-type') || 'donut';
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
        const type = data.type || 'donut';
        const slices = (Array.isArray(data.slices) ? data.slices : [])
            .filter(s => s.value > 0);

        const svg = buildSvg(slices, type);
        const legend = buildLegend(slices);

        return Templates.render('tiny_studiolms/block_chart', {
            type,
            title: data.title ? esc(data.title) : '',
            svg,
            legend,
        });
    },
};
