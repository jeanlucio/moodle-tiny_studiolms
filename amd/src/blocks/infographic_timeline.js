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
 * Infographic Timeline block — vertical timeline with date/period badges and descriptions.
 *
 * @module     tiny_studiolms/blocks/infographic_timeline
 * @copyright  2026 Jean Lúcio <jeanlucio@gmail.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import Templates from 'core/templates';
import {call as ajaxCall} from 'core/ajax';
import {getString} from 'core/str';
import {THEMES, esc, closePicker} from './infographic_shared';

/**
 * Builds the inner HTML for the timeline.
 * @param {object} data Block data.
 * @param {object} c Theme colour palette.
 * @returns {string}
 */
const buildTimelineHtml = (data, c) => {
    const items = Array.isArray(data.items) ? data.items.filter(i => i.title) : [];
    if (!items.length) {
        return '';
    }
    const parts = [];
    if (data.title && data.title.trim()) {
        parts.push(
            `<div class="slms-timeline__title" style="color:${c.titleColor};">`
            + esc(data.title.trim())
            + `</div>`
        );
    }
    parts.push(`<div class="slms-timeline__list">`);
    items.forEach((item, idx) => {
        const isLast = idx === items.length - 1;
        parts.push(
            `<div class="slms-timeline__item">`
            + `<div class="slms-timeline__marker">`
            + `<div class="slms-timeline__dot" style="background:${c.iconBg};"></div>`
            + (!isLast
                ? `<div class="slms-timeline__connector" style="background:${c.borderColor};"></div>`
                : '')
            + `</div>`
            + `<div class="slms-timeline__body" style="background:${c.bg};border-color:${c.borderColor};">`
            + (item.date
                ? `<div class="slms-timeline__date"`
                    + ` style="background:${c.iconBg};color:${c.iconColor};">`
                    + esc(item.date)
                    + `</div>`
                : '')
            + `<div class="slms-timeline__event-title"`
                + ` style="color:${c.valuColor};">`
                + esc(item.title)
                + `</div>`
            + (item.description
                ? `<div class="slms-timeline__event-desc"`
                    + ` style="color:${c.labelColor};">`
                    + esc(item.description)
                    + `</div>`
                : '')
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
        themeBlue: (data.theme || 'blue') === 'blue',
        themeGreen: data.theme === 'green',
        themePurple: data.theme === 'purple',
        themeOrange: data.theme === 'orange',
        themeRed: data.theme === 'red',
        themeBlack: data.theme === 'black',
    };
    for (let i = 0; i < 6; i++) {
        const item = items[i] || {};
        out[`item${i + 1}_date`] = item.date || '';
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
        const date = popup.querySelector(`#tl_item${i}_date`)?.value?.trim() || '';
        const title = popup.querySelector(`#tl_item${i}_title`)?.value?.trim() || '';
        const description = popup.querySelector(`#tl_item${i}_description`)?.value?.trim() || '';
        if (title) {
            items.push({date, title, description});
        }
    }
    data.items = items.length ? items : [{date: '', title: 'Event 1', description: ''}];
};

// ---------------------------------------------------------------------------
// Block export.
// ---------------------------------------------------------------------------

export default {
    id: 'infographic_timeline',
    titleString: 'block_infographic_timeline_title',
    icon: '📅',

    defaultData: {
        title: '',
        theme: 'blue',
        items: [
            {date: '2020', title: 'Event 1', description: ''},
            {date: '2021', title: 'Event 2', description: ''},
            {date: '2022', title: 'Event 3', description: ''},
        ],
    },

    buildToolbar: async(container, data, onUpdate, PopupManager) => {
        try {
            const {html, js} = await Templates.renderForPromise(
                'tiny_studiolms/toolbar_infographic_timeline', {}
            );
            Templates.replaceNodeContents(container, html, js);

            const btnEdit = container.querySelector('#tb-infographic-timeline-edit');
            if (!btnEdit) {
                return;
            }

            btnEdit.addEventListener('click', () => {
                closePicker();

                const tplData = dataToPopupVars(data);

                PopupManager.open(
                    btnEdit,
                    'tiny_studiolms/popup_infographic_timeline_edit',
                    tplData,
                    (popup) => {
                        const titleEl = popup.querySelector('#tl_title');
                        const themeButtons = popup.querySelectorAll('.slms-ig-theme-btn');
                        const aiBtnEl = popup.querySelector('#tl-ai-btn');
                        const aiPromptEl = popup.querySelector('#tl_ai_prompt');
                        const aiSpinner = popup.querySelector('#tl-ai-spinner');
                        const aiError = popup.querySelector('#tl-ai-error');

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
                            ['date', 'title', 'description'].forEach(field => {
                                popup.querySelector(`#tl_item${i}_${field}`)
                                    ?.addEventListener('input', applyChanges);
                            });
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
                                        methodname: 'tiny_studiolms_generate_infographic_timeline',
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
                                        ['date', 'title', 'description'].forEach(field => {
                                            const el = popup.querySelector(`#tl_item${i}_${field}`);
                                            if (el) {
                                                el.value = newVars[`item${i}_${field}`] || '';
                                            }
                                        });
                                    }
                                    onUpdate(data);
                                } catch (err) {
                                    if (aiError) {
                                        let msg = '';
                                        try {
                                            msg = await getString(
                                                'infographic_timeline_ai_error', 'tiny_studiolms'
                                            );
                                        } catch (_) {
                                            msg = 'Erro ao gerar a linha do tempo. Tente novamente.';
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
        const content = buildTimelineHtml(data, palette);

        return Templates.render('tiny_studiolms/block_infographic_timeline', {
            theme,
            content,
        });
    },
};
