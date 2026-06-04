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
 * Infographic Comparison block — side-by-side feature comparison table.
 *
 * @module     tiny_studiolms/blocks/infographic_comparison
 * @copyright  2026 Jean Lúcio <jeanlucio@gmail.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import Templates from 'core/templates';
import {call as ajaxCall} from 'core/ajax';
import {getString} from 'core/str';
import {THEMES, esc, closePicker} from './infographic_shared';

/**
 * Builds the inner HTML for the comparison table.
 * @param {object} data Block data.
 * @param {object} c Theme colour palette.
 * @returns {string}
 */
const buildComparisonHtml = (data, c) => {
    const items = Array.isArray(data.items) ? data.items.filter(i => i.label) : [];
    if (!items.length) {
        return '';
    }
    const col1 = esc(data.col1 || 'A');
    const col2 = esc(data.col2 || 'B');
    const parts = [];
    if (data.title && data.title.trim()) {
        parts.push(
            `<div class="slms-comparison__title" style="color:${c.titleColor};">`
            + esc(data.title.trim())
            + `</div>`
        );
    }
    parts.push(`<div class="slms-comparison__table">`);
    parts.push(
        `<div class="slms-comparison__header">`
        + `<div class="slms-comparison__header-label"></div>`
        + `<div class="slms-comparison__header-col"`
            + ` style="background:${c.iconBg};color:${c.iconColor};">`
            + col1
        + `</div>`
        + `<div class="slms-comparison__header-col"`
            + ` style="background:${c.iconBg};color:${c.iconColor};">`
            + col2
        + `</div>`
        + `</div>`
    );
    items.forEach(item => {
        parts.push(
            `<div class="slms-comparison__row" style="border-color:${c.borderColor};background:${c.bg};">`
            + `<div class="slms-comparison__row-label" style="color:${c.labelColor};">`
                + esc(item.label)
            + `</div>`
            + `<div class="slms-comparison__row-cell">`
            + (item.col1
                ? `<i class="fa-solid fa-circle-check slms-comparison__yes"`
                    + ` role="img" aria-label="✓"`
                    + ` style="color:${c.iconColor};"></i>`
                : `<i class="fa-solid fa-circle-xmark slms-comparison__no"`
                    + ` role="img" aria-label="✗"></i>`)
            + `</div>`
            + `<div class="slms-comparison__row-cell">`
            + (item.col2
                ? `<i class="fa-solid fa-circle-check slms-comparison__yes"`
                    + ` role="img" aria-label="✓"`
                    + ` style="color:${c.iconColor};"></i>`
                : `<i class="fa-solid fa-circle-xmark slms-comparison__no"`
                    + ` role="img" aria-label="✗"></i>`)
            + `</div>`
            + `</div>`
        );
    });
    parts.push(`</div>`);
    return parts.join('');
};

/**
 * @param {object} data
 * @returns {object}
 */
const dataToPopupVars = (data) => {
    const items = Array.isArray(data.items) ? data.items : [];
    const out = {
        title: data.title || '',
        col1: data.col1 || '',
        col2: data.col2 || '',
        themeBlue: (data.theme || 'blue') === 'blue',
        themeGreen: data.theme === 'green',
        themePurple: data.theme === 'purple',
        themeOrange: data.theme === 'orange',
        themeRed: data.theme === 'red',
        themeBlack: data.theme === 'black',
    };
    for (let i = 0; i < 6; i++) {
        const item = items[i] || {};
        out[`item${i + 1}_label`] = item.label || '';
        out[`item${i + 1}_col1`] = item.col1 !== false;
        out[`item${i + 1}_col2`] = item.col2 !== false;
    }
    return out;
};

/**
 * @param {Element} popup
 * @param {object} data
 */
const readItemsFromPopup = (popup, data) => {
    const items = [];
    for (let i = 1; i <= 6; i++) {
        const label = popup.querySelector(`#cmp_item${i}_label`)?.value?.trim() || '';
        const col1 = popup.querySelector(`#cmp_item${i}_col1`)?.checked ?? true;
        const col2 = popup.querySelector(`#cmp_item${i}_col2`)?.checked ?? true;
        if (label) {
            items.push({label, col1, col2});
        }
    }
    data.items = items.length ? items : [{label: 'Feature 1', col1: true, col2: true}];
};

// ---------------------------------------------------------------------------
// Block export.
// ---------------------------------------------------------------------------

export default {
    id: 'infographic_comparison',
    titleString: 'block_infographic_comparison_title',
    icon: '⚖️',

    defaultData: {
        title: '',
        col1: 'Option A',
        col2: 'Option B',
        theme: 'blue',
        items: [
            {label: 'Feature 1', col1: true, col2: true},
            {label: 'Feature 2', col1: false, col2: true},
            {label: 'Feature 3', col1: true, col2: false},
        ],
    },

    buildToolbar: async(container, data, onUpdate, PopupManager) => {
        try {
            const {html, js} = await Templates.renderForPromise(
                'tiny_studiolms/toolbar_infographic_comparison', {}
            );
            Templates.replaceNodeContents(container, html, js);

            const btnEdit = container.querySelector('#tb-infographic-comparison-edit');
            if (!btnEdit) {
                return;
            }

            btnEdit.addEventListener('click', () => {
                closePicker();

                const tplData = dataToPopupVars(data);

                PopupManager.open(
                    btnEdit,
                    'tiny_studiolms/popup_infographic_comparison_edit',
                    tplData,
                    (popup) => {
                        const titleEl = popup.querySelector('#cmp_title');
                        const col1El = popup.querySelector('#cmp_col1');
                        const col2El = popup.querySelector('#cmp_col2');
                        const themeButtons = popup.querySelectorAll('.slms-ig-theme-btn');
                        const aiBtnEl = popup.querySelector('#cmp-ai-btn');
                        const aiPromptEl = popup.querySelector('#cmp_ai_prompt');
                        const aiSpinner = popup.querySelector('#cmp-ai-spinner');
                        const aiError = popup.querySelector('#cmp-ai-error');

                        const applyChanges = () => {
                            if (titleEl) {
                                data.title = titleEl.value.trim();
                            }
                            if (col1El) {
                                data.col1 = col1El.value.trim();
                            }
                            if (col2El) {
                                data.col2 = col2El.value.trim();
                            }
                            readItemsFromPopup(popup, data);
                            onUpdate(data);
                        };

                        [titleEl, col1El, col2El].forEach(el => {
                            el?.addEventListener('input', applyChanges);
                        });

                        for (let i = 1; i <= 6; i++) {
                            popup.querySelector(`#cmp_item${i}_label`)
                                ?.addEventListener('input', applyChanges);
                            popup.querySelector(`#cmp_item${i}_col1`)
                                ?.addEventListener('change', applyChanges);
                            popup.querySelector(`#cmp_item${i}_col2`)
                                ?.addEventListener('change', applyChanges);
                        }

                        // Theme picker.
                        themeButtons.forEach(btn => {
                            btn.addEventListener('click', () => {
                                themeButtons.forEach(b => b.classList.remove('selected'));
                                btn.classList.add('selected');
                                data.theme = btn.getAttribute('data-theme') || 'blue';
                                onUpdate(data);
                            });
                        });

                        // AI generation.
                        if (aiBtnEl && aiPromptEl) {
                            aiBtnEl.addEventListener('click', async() => {
                                const prompt = aiPromptEl.value.trim();
                                if (!prompt) {
                                    return;
                                }
                                aiBtnEl.disabled = true;
                                aiSpinner?.classList.remove('d-none');
                                if (aiError) {
                                    aiError.textContent = '';
                                    aiError.classList.add('d-none');
                                }

                                try {
                                    const [promise] = ajaxCall([{
                                        methodname: 'tiny_studiolms_generate_infographic_comparison',
                                        args: {topic: prompt},
                                    }]);
                                    const result = await promise;

                                    data.title = result.title || '';
                                    data.col1 = result.col1 || '';
                                    data.col2 = result.col2 || '';
                                    data.items = JSON.parse(result.items || '[]');

                                    if (titleEl) {
                                        titleEl.value = data.title;
                                    }
                                    if (col1El) {
                                        col1El.value = data.col1;
                                    }
                                    if (col2El) {
                                        col2El.value = data.col2;
                                    }
                                    for (let i = 1; i <= 6; i++) {
                                        const item = data.items[i - 1] || null;
                                        const labelEl = popup.querySelector(`#cmp_item${i}_label`);
                                        const chk1 = popup.querySelector(`#cmp_item${i}_col1`);
                                        const chk2 = popup.querySelector(`#cmp_item${i}_col2`);
                                        if (labelEl) {
                                            labelEl.value = item ? item.label : '';
                                        }
                                        if (chk1) {
                                            chk1.checked = item ? item.col1 !== false : true;
                                        }
                                        if (chk2) {
                                            chk2.checked = item ? item.col2 !== false : true;
                                        }
                                    }
                                    onUpdate(data);
                                } catch (err) {
                                    if (aiError) {
                                        let msg = '';
                                        try {
                                            msg = await getString(
                                                'infographic_comparison_ai_error', 'tiny_studiolms'
                                            );
                                        } catch (_) {
                                            msg = 'Erro ao gerar o comparativo. Tente novamente.';
                                        }
                                        aiError.textContent = msg;
                                        aiError.classList.remove('d-none');
                                    }
                                } finally {
                                    aiBtnEl.disabled = false;
                                    aiSpinner?.classList.add('d-none');
                                }
                            });
                        }
                    }
                );
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
        const theme = data.theme || 'blue';
        const palette = THEMES[theme] || THEMES.blue;
        const content = buildComparisonHtml(data, palette);

        return Templates.render('tiny_studiolms/block_infographic_comparison', {
            theme,
            content,
        });
    },
};
