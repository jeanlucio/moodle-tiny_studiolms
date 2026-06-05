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
 * Infographic Features block — icon + title + description cards in a 2 or 3-column grid.
 *
 * @module     tiny_studiolms/blocks/infographic_features
 * @copyright  2026 Jean Lúcio <jeanlucio@gmail.com>
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import Templates from 'core/templates';
import {call as ajaxCall} from 'core/ajax';
import {getString} from 'core/str';
import {THEMES, ICONS, esc, normaliseIcon, iconToSpan, openPicker, closePicker} from './infographic_shared';

const DEFAULT_ICON = 'fa-solid fa-star';

/**
 * Builds the inner HTML for the features grid.
 * @param {object} data Block data.
 * @param {object} c Theme colour palette.
 * @returns {string}
 */
const buildFeaturesHtml = (data, c) => {
    const items = Array.isArray(data.items) ? data.items.filter(i => i.title) : [];
    if (!items.length) {
        return '';
    }
    const cols = data.columns === 2 ? 2 : 3;
    const parts = [];
    if (data.title && data.title.trim()) {
        parts.push(
            `<div class="slms-features__title" style="color:${c.titleColor};">`
            + esc(data.title.trim())
            + `</div>`
        );
    }
    parts.push(`<div class="slms-features__grid slms-features__grid--${cols}">`);
    items.forEach(item => {
        const iconClass = normaliseIcon(item.icon) || DEFAULT_ICON;
        parts.push(
            `<div class="slms-features__item" style="background:${c.bg};border-color:${c.borderColor};">`
            + `<div class="slms-features__icon" style="background:${c.iconBg};color:${c.iconColor};">`
            + iconToSpan(iconClass)
            + `</div>`
            + `<div class="slms-features__name" style="color:${c.valuColor};">${esc(item.title)}</div>`
            + (item.description
                ? `<div class="slms-features__desc" style="color:${c.labelColor};">${esc(item.description)}</div>`
                : '')
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
    const cols = data.columns === 2 ? 2 : 3;
    const out = {
        title: data.title || '',
        themeBlue: (data.theme || 'blue') === 'blue',
        themeGreen: data.theme === 'green',
        themePurple: data.theme === 'purple',
        themeOrange: data.theme === 'orange',
        themeRed: data.theme === 'red',
        themeBlack: data.theme === 'black',
        columns2: cols === 2,
        columns3: cols === 3,
    };
    for (let i = 0; i < 6; i++) {
        const item = items[i] || {};
        out[`item${i + 1}_icon`] = normaliseIcon(item.icon) || DEFAULT_ICON;
        out[`item${i + 1}_title`] = item.title || '';
        out[`item${i + 1}_description`] = item.description || '';
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
        const icon = popup.querySelector(`#ft_item${i}_icon`)?.value?.trim() || DEFAULT_ICON;
        const title = popup.querySelector(`#ft_item${i}_title`)?.value?.trim() || '';
        const description = popup.querySelector(`#ft_item${i}_description`)?.value?.trim() || '';
        if (title) {
            items.push({icon, title, description});
        }
    }
    data.items = items.length ? items : [{icon: DEFAULT_ICON, title: 'Feature 1', description: ''}];
};

// ---------------------------------------------------------------------------
// Block export.
// ---------------------------------------------------------------------------

export default {
    id: 'infographicFeatures',
    titleString: 'block_infographic_features_title',
    icon: '✨',

    defaultData: {
        title: '',
        theme: 'blue',
        columns: 3,
        items: [
            {icon: 'fa-solid fa-star', title: 'Feature 1', description: ''},
            {icon: 'fa-solid fa-bolt', title: 'Feature 2', description: ''},
            {icon: 'fa-solid fa-globe', title: 'Feature 3', description: ''},
        ],
    },

    buildToolbar: async(container, data, onUpdate, PopupManager) => {
        try {
            const {html, js} = await Templates.renderForPromise('tiny_studiolms/toolbar_infographic_features', {});
            Templates.replaceNodeContents(container, html, js);

            const btnEdit = container.querySelector('#tb-infographic-features-edit');
            if (!btnEdit) {
                return;
            }

            btnEdit.addEventListener('click', () => {
                closePicker();

                const tplData = dataToPopupVars(data);

                PopupManager.open(btnEdit, 'tiny_studiolms/popup_infographic_features_edit', tplData, (popup) => {
                    const titleEl = popup.querySelector('#ft_title');
                    const themeButtons = popup.querySelectorAll('.slms-ig-theme-btn');
                    const aiBtnEl = popup.querySelector('#ft-ai-btn');
                    const aiPromptEl = popup.querySelector('#ft_ai_prompt');
                    const aiSpinner = popup.querySelector('#ft-ai-spinner');
                    const aiError = popup.querySelector('#ft-ai-error');

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

                    for (let i = 1; i <= 6; i++) {
                        ['title', 'description'].forEach(field => {
                            popup.querySelector(`#ft_item${i}_${field}`)
                                ?.addEventListener('input', applyChanges);
                        });
                    }

                    // Icon picker buttons.
                    for (let i = 1; i <= 6; i++) {
                        const iconBtn = popup.querySelector(`.slms-ft-icon-btn[data-item="${i}"]`);
                        const iconInput = popup.querySelector(`#ft_item${i}_icon`);
                        if (iconBtn && iconInput) {
                            iconBtn.addEventListener('click', (e) => {
                                e.stopPropagation();
                                openPicker(iconBtn, (cls) => {
                                    iconInput.value = cls;
                                    iconBtn.innerHTML = `<i class="${cls}" aria-hidden="true"></i>`;
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

                    // Column picker.
                    const colButtons = popup.querySelectorAll('.slms-ft-col-btn');
                    colButtons.forEach(btn => {
                        btn.addEventListener('click', () => {
                            colButtons.forEach(b => b.classList.remove('selected'));
                            btn.classList.add('selected');
                            data.columns = parseInt(btn.getAttribute('data-cols') || '3', 10);
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
                                    methodname: 'tiny_studiolms_generate_infographic_features',
                                    args: {topic: prompt},
                                }]);
                                const result = await promise;

                                data.title = result.title || '';
                                data.items = JSON.parse(result.items || '[]');

                                if (titleEl) {
                                    titleEl.value = data.title;
                                }
                                const newVars = dataToPopupVars(data);
                                for (let i = 1; i <= 6; i++) {
                                    const iconInput = popup.querySelector(`#ft_item${i}_icon`);
                                    const iconBtn = popup.querySelector(`.slms-ft-icon-btn[data-item="${i}"]`);
                                    const titleInput = popup.querySelector(`#ft_item${i}_title`);
                                    const descInput = popup.querySelector(`#ft_item${i}_description`);
                                    const iconVal = newVars[`item${i}_icon`] || DEFAULT_ICON;
                                    if (iconInput) {
                                        iconInput.value = iconVal;
                                    }
                                    if (iconBtn) {
                                        iconBtn.innerHTML = `<i class="${iconVal}" aria-hidden="true"></i>`;
                                    }
                                    if (titleInput) {
                                        titleInput.value = newVars[`item${i}_title`] || '';
                                    }
                                    if (descInput) {
                                        descInput.value = newVars[`item${i}_description`] || '';
                                    }
                                }
                                onUpdate(data);
                            } catch (err) {
                                if (aiError) {
                                    let msg = '';
                                    try {
                                        msg = await getString('infographic_features_ai_error', 'tiny_studiolms');
                                    } catch (_) {
                                        msg = 'Erro ao gerar os recursos. Tente novamente.';
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
        const cols = data.columns === 2 ? 2 : 3;
        const content = buildFeaturesHtml(data, palette);

        return Templates.render('tiny_studiolms/block_infographic_features', {
            theme,
            columns: cols,
            content,
        });
    },
};
