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
 * Infographic Steps block — numbered/icon-led step flow with optional AI generation.
 *
 * @module     tiny_studiolms/blocks/infographic_steps
 * @copyright  2026 Jean Lúcio <jeanlucio@gmail.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import Templates from 'core/templates';
import {call as ajaxCall} from 'core/ajax';
import {getString} from 'core/str';
import {THEMES, ICONS, esc, normaliseIcon, iconToSpan, openPicker, closePicker} from './infographic_shared';

// HTML renderers — vertical (default) and horizontal.
// ---------------------------------------------------------------------------

/**
 * @param {object} item Step item.
 * @param {number} stepNum 1-based step number.
 * @param {object} c Theme palette.
 * @returns {string}
 */
const badgeHtml = (item, stepNum, c) => {
    const iconClass = item.icon ? normaliseIcon(item.icon) : '';
    const content = iconClass
        ? iconToSpan(iconClass)
        : `<span aria-hidden="true">${stepNum}</span>`;
    return `<div class="slms-steps__badge" style="background:${c.iconBg};color:${c.iconColor};">`
        + content
        + `</div>`;
};

/**
 * Builds the inner HTML for the vertical steps layout.
 * @param {object} data Block data.
 * @param {object} c Theme colour palette.
 * @returns {string}
 */
const buildVerticalHtml = (data, c) => {
    const items = Array.isArray(data.items) ? data.items.filter(i => i.title) : [];
    if (!items.length) {
        return '';
    }
    const parts = [];
    if (data.title && data.title.trim()) {
        parts.push(`<div class="slms-steps__title" style="color:${c.titleColor};">${esc(data.title.trim())}</div>`);
    }
    parts.push(`<div class="slms-steps__list">`);
    items.forEach((item, idx) => {
        const isLast = idx === items.length - 1;
        parts.push(
            `<div class="slms-steps__item">`
            + `<div class="slms-steps__left">`
            + badgeHtml(item, idx + 1, c)
            + (!isLast ? `<div class="slms-steps__connector" style="background:${c.borderColor};"></div>` : '')
            + `</div>`
            + `<div class="slms-steps__content" style="padding-bottom:${isLast ? '0' : '1.25rem'};">`
            + `<div class="slms-steps__step-title" style="color:${c.valuColor};">${esc(item.title)}</div>`
            + (item.description
                ? `<div class="slms-steps__step-desc" style="color:${c.labelColor};">${esc(item.description)}</div>`
                : '')
            + `</div>`
            + `</div>`
        );
    });
    parts.push(`</div>`);
    return parts.join('');
};

/**
 * Builds the inner HTML for the horizontal steps layout.
 * @param {object} data Block data.
 * @param {object} c Theme colour palette.
 * @returns {string}
 */
const buildHorizontalHtml = (data, c) => {
    const items = Array.isArray(data.items) ? data.items.filter(i => i.title) : [];
    if (!items.length) {
        return '';
    }
    const parts = [];
    if (data.title && data.title.trim()) {
        parts.push(`<div class="slms-steps__title" style="color:${c.titleColor};">${esc(data.title.trim())}</div>`);
    }
    parts.push(`<div class="slms-steps__list--h">`);
    items.forEach((item, idx) => {
        const isLast = idx === items.length - 1;
        parts.push(
            `<div class="slms-steps__item--h">`
            + badgeHtml(item, idx + 1, c)
            + `<div class="slms-steps__step-title--h" style="color:${c.valuColor};">${esc(item.title)}</div>`
            + (item.description
                ? `<div class="slms-steps__step-desc" style="color:${c.labelColor};">${esc(item.description)}</div>`
                : '')
            + `</div>`
        );
        if (!isLast) {
            parts.push(`<div class="slms-steps__hconnector" style="background:${c.borderColor};"></div>`);
        }
    });
    parts.push(`</div>`);
    return parts.join('');
};

// ---------------------------------------------------------------------------
// Popup data helpers.
// ---------------------------------------------------------------------------

/**
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
        layoutVertical: (data.layout || 'vertical') === 'vertical',
        layoutHorizontal: data.layout === 'horizontal',
    };
    for (let i = 0; i < 6; i++) {
        const item = items[i] || {};
        out[`item${i + 1}_icon`] = item.icon || '';
        out[`item${i + 1}_title`] = item.title || '';
        out[`item${i + 1}_description`] = item.description || '';
        out[`item${i + 1}_stepnum`] = i + 1;
        out[`item${i + 1}_hasicon`] = !!(item.icon);
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
        const icon = popup.querySelector(`#st_item${i}_icon`)?.value?.trim() || '';
        const title = popup.querySelector(`#st_item${i}_title`)?.value?.trim() || '';
        const description = popup.querySelector(`#st_item${i}_description`)?.value?.trim() || '';
        if (title) {
            items.push({icon, title, description});
        }
    }
    data.items = items.length ? items : [{icon: '', title: 'Step 1', description: ''}];
};

// ---------------------------------------------------------------------------
// Block export.
// ---------------------------------------------------------------------------

export default {
    id: 'infographicSteps',
    titleString: 'block_infographic_steps_title',
    icon: '🪜',

    defaultData: {
        title: '',
        theme: 'blue',
        layout: 'vertical',
        items: [
            {icon: '', title: 'First step', description: ''},
            {icon: '', title: 'Second step', description: ''},
            {icon: '', title: 'Third step', description: ''},
        ],
    },

    buildToolbar: async(container, data, onUpdate, PopupManager) => {
        try {
            const {html, js} = await Templates.renderForPromise('tiny_studiolms/toolbar_infographic_steps', {});
            Templates.replaceNodeContents(container, html, js);

            const btnEdit = container.querySelector('#tb-infographic-steps-edit');
            if (!btnEdit) {
                return;
            }

            btnEdit.addEventListener('click', () => {
                closePicker();

                const tplData = dataToPopupVars(data);

                PopupManager.open(btnEdit, 'tiny_studiolms/popup_infographic_steps_edit', tplData, (popup) => {
                    const titleEl = popup.querySelector('#st_title');
                    const themeButtons = popup.querySelectorAll('.slms-ig-theme-btn');
                    const aiBtnEl = popup.querySelector('#st-ai-btn');
                    const aiPromptEl = popup.querySelector('#st_ai_prompt');
                    const aiSpinner = popup.querySelector('#st-ai-spinner');
                    const aiError = popup.querySelector('#st-ai-error');

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
                            popup.querySelector(`#st_item${i}_${field}`)
                                ?.addEventListener('input', applyChanges);
                        });
                    }

                    // Icon picker buttons.
                    for (let i = 1; i <= 6; i++) {
                        const iconBtn = popup.querySelector(`.slms-st-icon-btn[data-item="${i}"]`);
                        const iconInput = popup.querySelector(`#st_item${i}_icon`);
                        if (iconBtn && iconInput) {
                            iconBtn.addEventListener('click', (e) => {
                                e.stopPropagation();
                                openPicker(iconBtn, (cls) => {
                                    iconInput.value = cls;
                                    iconBtn.innerHTML = `<i class="${cls}" aria-hidden="true"></i>`;
                                    applyChanges();
                                }, ICONS);
                            }, ICONS);
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

                    // Layout picker.
                    const layoutButtons = popup.querySelectorAll('.slms-st-layout-btn');
                    layoutButtons.forEach(btn => {
                        btn.addEventListener('click', () => {
                            layoutButtons.forEach(b => b.classList.remove('selected'));
                            btn.classList.add('selected');
                            data.layout = btn.getAttribute('data-layout') || 'vertical';
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
                                    methodname: 'tiny_studiolms_generate_infographic_steps',
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
                                    const iconInput = popup.querySelector(`#st_item${i}_icon`);
                                    const iconBtn = popup.querySelector(`.slms-st-icon-btn[data-item="${i}"]`);
                                    const titleInput = popup.querySelector(`#st_item${i}_title`);
                                    const descInput = popup.querySelector(`#st_item${i}_description`);
                                    const iconVal = newVars[`item${i}_icon`] || '';
                                    if (iconInput) {
                                        iconInput.value = iconVal;
                                    }
                                    if (iconBtn) {
                                        iconBtn.innerHTML = iconVal
                                            ? `<i class="${iconVal}" aria-hidden="true"></i>`
                                            : `<span aria-hidden="true">${i}</span>`;
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
                                        msg = await getString('infographic_steps_ai_error', 'tiny_studiolms');
                                    } catch (_) {
                                        msg = 'Erro ao gerar os passos. Tente novamente.';
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
        const layout = data.layout || 'vertical';
        const content = layout === 'horizontal'
            ? buildHorizontalHtml(data, palette)
            : buildVerticalHtml(data, palette);

        return Templates.render('tiny_studiolms/block_infographic_steps', {
            theme,
            layout,
            content,
        });
    },
};
