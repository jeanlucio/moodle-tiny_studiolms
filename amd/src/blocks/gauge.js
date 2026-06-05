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
 * Gauge block — renders a pure-SVG semi-circle gauge chart.
 *
 * @module     tiny_studiolms/blocks/gauge
 * @copyright  2026 Jean Lúcio <jeanlucio@gmail.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import Templates from 'core/templates';
import {getString} from 'core/str';

// SVG geometry constants.
const G_SVG_W = 240;
const G_SVG_H = 136;
const G_CX = 120;
const G_CY = 112;
const G_R = 88;
const G_TRACK_W = 16;

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
 * Return the fill color for a gauge value using traffic-light zones.
 * @param {number} v Value 0–100.
 * @returns {string} Hex color.
 */
const gaugeColor = (v) => {
    if (v >= 67) {
        return '#10b981';
    }
    if (v >= 34) {
        return '#f59e0b';
    }
    return '#ef4444';
};

/**
 * Compute an SVG point on a circle arc using math-angle convention (Y-flipped).
 * @param {number} cx Center X.
 * @param {number} cy Center Y.
 * @param {number} r  Radius.
 * @param {number} deg Angle in degrees (0°=right, 90°=top, 180°=left).
 * @returns {{x: string, y: string}} Rounded coordinate pair.
 */
const ptOnArc = (cx, cy, r, deg) => ({
    x: (cx + r * Math.cos((deg * Math.PI) / 180)).toFixed(2),
    y: (cy - r * Math.sin((deg * Math.PI) / 180)).toFixed(2),
});

/**
 * Build an SVG arc path string (clockwise, sweep-flag=1).
 * Spans from startDeg to endDeg, always ≤ 180° so large-arc=0.
 * @param {number} cx Center X.
 * @param {number} cy Center Y.
 * @param {number} r  Radius.
 * @param {number} startDeg Start angle (math degrees).
 * @param {number} endDeg   End angle (math degrees).
 * @returns {string} SVG path d attribute value.
 */
const describeArc = (cx, cy, r, startDeg, endDeg) => {
    const s = ptOnArc(cx, cy, r, startDeg);
    const e = ptOnArc(cx, cy, r, endDeg);
    return `M ${s.x} ${s.y} A ${r} ${r} 0 0 1 ${e.x} ${e.y}`;
};

/**
 * Build the complete SVG markup for the gauge.
 * @param {number} value  Gauge value 0–100.
 * @param {string} label  Optional label shown below the value.
 * @returns {string} SVG markup string.
 */
const buildGaugeSvg = (value, label) => {
    const safeVal = Math.min(99.8, Math.max(0.2, value));
    const endDeg = 180 - (safeVal / 100) * 179.6;
    const color = gaugeColor(value);
    const bgPath = describeArc(G_CX, G_CY, G_R, 180, 0.2);
    const fgPath = describeArc(G_CX, G_CY, G_R, 180, endDeg);

    const parts = [
        `<svg viewBox="0 0 ${G_SVG_W} ${G_SVG_H}" role="img"`,
        ` xmlns="http://www.w3.org/2000/svg" class="slms-gauge__svg">`,
        `<path d="${bgPath}" fill="none" stroke="#e2e8f0"`,
        ` stroke-width="${G_TRACK_W}" stroke-linecap="round"/>`,
        `<path d="${fgPath}" fill="none" stroke="${color}"`,
        ` stroke-width="${G_TRACK_W}" stroke-linecap="round"/>`,
        `<text x="${G_CX}" y="${G_CY - 8}" text-anchor="middle"`,
        ` font-size="30" font-weight="700" fill="${color}">${value}%</text>`,
    ];

    if (label) {
        parts.push(
            `<text x="${G_CX}" y="${G_CY + 16}" text-anchor="middle"`,
            ` font-size="12" fill="#64748b">${esc(label)}</text>`
        );
    }

    parts.push('</svg>');
    return parts.join('');
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
        value: 75,
        label: 'Aprovação',
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
                const tplData = {
                    title: data.title || '',
                    value: data.value ?? 75,
                    label: data.label || '',
                };

                PopupManager.open(btnEdit, 'tiny_studiolms/popup_gauge_edit', tplData, (popup) => {
                    const titleEl = popup.querySelector('#gf_title');
                    const valueEl = popup.querySelector('#gf_value');
                    const sliderEl = popup.querySelector('#gf_value_slider');
                    const labelEl = popup.querySelector('#gf_label');

                    const applyChanges = () => {
                        data.title = titleEl?.value?.trim() ?? '';
                        const raw = parseInt(valueEl?.value ?? '75', 10);
                        data.value = Math.min(100, Math.max(0, isNaN(raw) ? 0 : raw));
                        data.label = labelEl?.value?.trim() ?? '';
                        onUpdate(data);
                    };

                    titleEl?.addEventListener('input', applyChanges);
                    labelEl?.addEventListener('input', applyChanges);

                    valueEl?.addEventListener('input', () => {
                        if (sliderEl) {
                            sliderEl.value = valueEl.value;
                        }
                        applyChanges();
                    });

                    sliderEl?.addEventListener('input', () => {
                        if (valueEl) {
                            valueEl.value = sliderEl.value;
                        }
                        applyChanges();
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
        const value = Math.min(100, Math.max(0, parseInt(data.value ?? 75, 10) || 0));
        const svg = buildGaugeSvg(value, data.label || '');
        return Templates.render('tiny_studiolms/block_gauge', {
            title: data.title ? esc(data.title) : '',
            svg,
        });
    },
};
