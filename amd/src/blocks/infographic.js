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
 * Infographic block — renders stat cards with FA6 icons and optional AI generation.
 *
 * The `layout` field in defaultData is the extensibility hook: future layouts
 * (steps, features, timeline, comparison) register a renderer in RENDERERS and
 * appear in the layout selector in the popup.
 *
 * @module     tiny_studiolms/blocks/infographic
 * @copyright  2026 Jean Lúcio <jeanlucio@gmail.com>
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import Templates from 'core/templates';
import {call as ajaxCall} from 'core/ajax';
import {getString} from 'core/str';
import {THEMES, ICONS, esc, normaliseIcon, iconToSpan, openPicker, closePicker} from './infographic_shared';

const DEFAULT_ICON = 'fa-solid fa-circle-info';

// ---------------------------------------------------------------------------
// Layout renderers — add future layouts here.
// ---------------------------------------------------------------------------

/**
 * Builds the inner HTML for the "stats" layout.
 * @param {object} data Block data.
 * @param {object} c Theme colour palette.
 * @returns {string} HTML string.
 */
const buildStatsHtml = (data, c) => {
    const items = Array.isArray(data.items) ? data.items.filter(i => i.value || i.label) : [];
    if (!items.length) {
        return '';
    }
    const parts = [];

    if (data.title && data.title.trim()) {
        parts.push(
            `<div class="slms-infographic__title" style="color:${c.titleColor};">`
            + esc(data.title.trim())
            + `</div>`
        );
    }

    parts.push(`<div class="slms-infographic__grid">`);
    items.forEach(item => {
        const iconClass = normaliseIcon(item.icon) || DEFAULT_ICON;
        parts.push(
            `<div class="slms-infographic__stat" style="background:${c.bg};border-color:${c.borderColor};">`
            + `<div class="slms-infographic__icon" style="background:${c.iconBg};color:${c.iconColor};">`
            + iconToSpan(iconClass)
            + `</div>`
            + `<div class="slms-infographic__value" style="color:${c.valuColor};">${esc(item.value)}</div>`
            + `<div class="slms-infographic__label" style="color:${c.labelColor};">${esc(item.label)}</div>`
            + `</div>`
        );
    });
    parts.push(`</div>`);

    return parts.join('');
};

/**
 * Registry of layout renderers.
 * To add a new layout: implement a buildXxxHtml(data, palette) function and add it here.
 * @type {Object.<string, Function>}
 */
const RENDERERS = {
    stats: buildStatsHtml,
};

// ---------------------------------------------------------------------------
// Popup data helpers.
// ---------------------------------------------------------------------------

/**
 * Converts data.items to flat popup template variables.
 * @param {object} data
 * @returns {object}
 */
const dataToPopupVars = (data) => {
    const items = Array.isArray(data.items) ? data.items : [];
    const out = {
        title: data.title || '',
        themeBlue: (data.theme || 'blue') === 'blue',
        themeGreen: data.theme === 'green',
        themePurple: data.theme === 'purple',
        themeOrange: data.theme === 'orange',
        themeRed: data.theme === 'red',
        themeBlack: data.theme === 'black',
    };
    for (let i = 0; i < 4; i++) {
        const item = items[i] || {};
        out[`item${i + 1}_icon`] = item.icon || DEFAULT_ICON;
        out[`item${i + 1}_value`] = item.value || '';
        out[`item${i + 1}_label`] = item.label || '';
    }
    return out;
};

/**
 * Reads the 4 item rows from the popup DOM back into data.items.
 * @param {Element} popup
 * @param {object} data
 */
const readItemsFromPopup = (popup, data) => {
    const items = [];
    for (let i = 1; i <= 4; i++) {
        const icon = popup.querySelector(`#ig_item${i}_icon`)?.value?.trim() || DEFAULT_ICON;
        const value = popup.querySelector(`#ig_item${i}_value`)?.value?.trim() || '';
        const label = popup.querySelector(`#ig_item${i}_label`)?.value?.trim() || '';
        if (value || label) {
            items.push({icon, value, label});
        }
    }
    data.items = items.length ? items : [{icon: DEFAULT_ICON, value: '–', label: ''}];
};

// ---------------------------------------------------------------------------
// Block export.
// ---------------------------------------------------------------------------

export default {
    id: 'infographic',
    titleString: 'block_infographic_title',
    icon: '📊',

    defaultData: {
        layout: 'stats',
        title: '',
        theme: 'blue',
        items: [
            {icon: 'fa-solid fa-chart-line', value: '85%', label: 'Taxa de aprovação'},
            {icon: 'fa-solid fa-book-open', value: '12', label: 'Módulos concluídos'},
            {icon: 'fa-solid fa-users', value: '240', label: 'Participantes'},
        ],
    },

    buildToolbar: async(container, data, onUpdate, PopupManager) => {
        try {
            const {html, js} = await Templates.renderForPromise('tiny_studiolms/toolbar_infographic', {});
            Templates.replaceNodeContents(container, html, js);

            const btnEdit = container.querySelector('#tb-infographic-edit');
            if (!btnEdit) {
                return;
            }

            btnEdit.addEventListener('click', () => {
                // Close any lingering picker when popup opens.
                closePicker();

                const tplData = dataToPopupVars(data);

                PopupManager.open(btnEdit, 'tiny_studiolms/popup_infographic_edit', tplData, (popup) => {
                    const titleEl = popup.querySelector('#ig_title');
                    const themeButtons = popup.querySelectorAll('.slms-ig-theme-btn');
                    const aiBtnEl = popup.querySelector('#ig-ai-btn');
                    const aiPromptEl = popup.querySelector('#ig_ai_prompt');
                    const aiSpinner = popup.querySelector('#ig-ai-spinner');
                    const aiError = popup.querySelector('#ig-ai-error');

                    const applyChanges = () => {
                        if (titleEl) {
                            data.title = titleEl.value.trim();
                        }
                        readItemsFromPopup(popup, data);
                        onUpdate(data);
                    };

                    if (titleEl) {
                        titleEl.addEventListener('input', applyChanges);
                    }

                    // Value and label field listeners.
                    for (let i = 1; i <= 4; i++) {
                        ['value', 'label'].forEach(field => {
                            popup.querySelector(`#ig_item${i}_${field}`)
                                ?.addEventListener('input', applyChanges);
                        });
                    }

                    // Icon picker buttons.
                    for (let i = 1; i <= 4; i++) {
                        const iconBtn = popup.querySelector(`.slms-ig-icon-btn[data-item="${i}"]`);
                        const iconInput = popup.querySelector(`#ig_item${i}_icon`);
                        if (iconBtn && iconInput) {
                            iconBtn.addEventListener('click', (e) => {
                                e.stopPropagation();
                                openPicker(iconBtn, (cls) => {
                                    iconInput.value = cls;
                                    const iEl = iconBtn.querySelector('i');
                                    if (iEl) {
                                        iEl.className = `${cls}`;
                                    }
                                    applyChanges();
                                }, ICONS);
                            });
                        }
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
                                    methodname: 'tiny_studiolms_generate_infographic',
                                    args: {topic: prompt},
                                }]);
                                const result = await promise;

                                data.title = result.title || '';
                                data.items = JSON.parse(result.items || '[]');

                                // Repopulate popup fields.
                                if (titleEl) {
                                    titleEl.value = data.title;
                                }
                                const newVars = dataToPopupVars(data);
                                for (let i = 1; i <= 4; i++) {
                                    const iconInput = popup.querySelector(`#ig_item${i}_icon`);
                                    const iconBtn = popup.querySelector(`.slms-ig-icon-btn[data-item="${i}"]`);
                                    const valueEl = popup.querySelector(`#ig_item${i}_value`);
                                    const labelEl = popup.querySelector(`#ig_item${i}_label`);
                                    const newIcon = newVars[`item${i}_icon`] || DEFAULT_ICON;
                                    if (iconInput) {
                                        iconInput.value = newIcon;
                                    }
                                    if (iconBtn) {
                                        const iEl = iconBtn.querySelector('i');
                                        if (iEl) {
                                            iEl.className = newIcon;
                                        }
                                    }
                                    if (valueEl) {
                                        valueEl.value = newVars[`item${i}_value`];
                                    }
                                    if (labelEl) {
                                        labelEl.value = newVars[`item${i}_label`];
                                    }
                                }
                                onUpdate(data);
                            } catch (err) {
                                if (aiError) {
                                    let msg = '';
                                    try {
                                        msg = await getString('infographic_ai_error', 'tiny_studiolms');
                                    } catch (_) {
                                        msg = 'Erro ao gerar infográfico. Tente novamente.';
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
        const theme = data.theme || 'blue';
        const palette = THEMES[theme] || THEMES.blue;
        const layout = data.layout || 'stats';
        const renderer = RENDERERS[layout] || RENDERERS.stats;
        const content = renderer(data, palette);

        return Templates.render('tiny_studiolms/block_infographic', {
            layout,
            theme,
            content,
        });
    },
};
