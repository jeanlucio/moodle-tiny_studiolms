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
 * Resources (Web Library) block definition.
 *
 * @module     tiny_studiolms/blocks/resources
 * @copyright  2026 Jean Lúcio
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import Templates from 'core/templates';
import {call as ajaxCall} from 'core/ajax';
import {getString} from 'core/str';
import Notification from 'core/notification';
import {getContextId} from '../context';

export default {
    id: 'resources',
    titleString: 'block_resources_title',
    icon: '📚',
    defaultData: {
        title: '',
        desc: '',
        bg: '#ffffff',
        headerBg: '#f8f9fa',
        color: '#0d47a1',
        isOpen: true,
        layout: 'list',
        hoverEffect: 'none',
        openSound: 'none',
        resources: [
            {type: 'pdf', title: '', url: 'https://scholar.google.com'},
            {type: 'video', title: '', url: 'https://youtube.com'}
        ]
    },

    // Exclude title and description. Resources array remains in state because it drives the UI list.
    excludeFromState: ['title', 'desc'],

    extractDOM: (node, state) => {
        const titleNode = node.querySelector('.slms-resources-title');
        if (titleNode) {
            state.title = titleNode.textContent.trim();
        }
        const descNode = node.querySelector('.slms-resources-desc');
        if (descNode) {
            state.desc = descNode.textContent.trim();
        }
    },

    buildToolbar: async(container, data, onUpdate, PopupManager) => {
        try {
            const {html, js} = await Templates.renderForPromise('tiny_studiolms/toolbar_resources', {});
            Templates.replaceNodeContents(container, html, js);

            const btnGeneral = container.querySelector('#tb-res-general');
            const btnResources = container.querySelector('#tb-res-items');

            if (btnGeneral) {
                btnGeneral.addEventListener('click', () => {
                    const tplData = Object.assign({}, data);
                    tplData.isList = data.layout === 'list';
                    tplData.isGrid = data.layout === 'grid';
                    tplData['hover_' + (data.hoverEffect || 'none')] = true;
                    tplData['sound_opt_' + (data.openSound || 'none')] = true;

                    PopupManager.open(btnGeneral, 'tiny_studiolms/popup_resources_general', tplData, (popup) => {
                        const propMap = {
                            '#pop_res_layout': 'layout',
                            '#pop_res_title': 'title',
                            '#pop_res_desc': 'desc',
                            '#pop_res_bg': 'bg',
                            '#pop_res_hover': 'hoverEffect',
                            '#pop_res_sound': 'openSound'
                        };
                        Object.keys(propMap).forEach(selector => {
                            const el = popup.querySelector(selector);
                            if (el) {
                                el.addEventListener('input', (ev) => {
                                    data[propMap[selector]] = ev.target.value;
                                    onUpdate(data);
                                });
                            }
                        });

                        const elOpen = popup.querySelector('#pop_res_open');
                        if (elOpen) {
                            elOpen.addEventListener('input', (ev) => {
                                data.isOpen = ev.target.value === 'true';
                                onUpdate(data);
                            });
                        }

                        const aiBtnEl = popup.querySelector('#resources-ai-btn');
                        const aiPromptEl = popup.querySelector('#resources_ai_prompt');
                        const aiSpinner = popup.querySelector('#resources-ai-spinner');
                        const aiError = popup.querySelector('#resources-ai-error');

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
                                        methodname: 'tiny_studiolms_generate_resources',
                                        args: {topic: prompt, contextid: getContextId()},
                                    }]);
                                    const result = await promise;
                                    const titleEl = popup.querySelector('#pop_res_title');
                                    const descEl = popup.querySelector('#pop_res_desc');
                                    if (titleEl && result.title) {
                                        titleEl.value = result.title;
                                        data.title = result.title;
                                    }
                                    if (descEl && result.desc) {
                                        descEl.value = result.desc;
                                        data.desc = result.desc;
                                    }
                                    if (result.resources) {
                                        data.resources = JSON.parse(result.resources);
                                    }
                                    onUpdate(data);
                                } catch (err) {
                                    if (aiError) {
                                        // The err.message is already the translated moodle_exception text the
                                        // server sent (resources_ai_error) — no need to fetch it again client-side.
                                        aiError.textContent = err.message;
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
            }

            if (btnResources) {
                btnResources.addEventListener('click', async() => {
                    const [
                        typeAria, typeLinkLabel, typePdfLabel, typeVideoLabel, typeAudioLabel,
                        titlePlaceholder, titleAria, urlPlaceholder, urlAria, removeAria,
                    ] = await Promise.all([
                        getString('resources_res_type_aria', 'tiny_studiolms'),
                        getString('resources_res_type_link', 'tiny_studiolms'),
                        getString('resources_res_type_pdf', 'tiny_studiolms'),
                        getString('resources_res_type_video', 'tiny_studiolms'),
                        getString('resources_res_type_audio', 'tiny_studiolms'),
                        getString('resources_res_title_placeholder', 'tiny_studiolms'),
                        getString('resources_res_title_aria', 'tiny_studiolms'),
                        getString('resources_res_url_placeholder', 'tiny_studiolms'),
                        getString('resources_res_url_aria', 'tiny_studiolms'),
                        getString('resources_res_remove_aria', 'tiny_studiolms'),
                    ]);

                    PopupManager.open(btnResources, 'tiny_studiolms/popup_resources_items', {}, (popup) => {
                        const listContainer = popup.querySelector('#slms-resources-list');
                        const btnAdd = popup.querySelector('#pop_res_add_btn');

                        const renderList = () => {
                            listContainer.innerHTML = '';
                            data.resources.forEach((res, index) => {
                                const row = document.createElement('div');
                                row.className = 'd-flex gap-2 mb-2 align-items-center p-2 border rounded bg-light';

                                // The title/url values come from attacker-controllable state (see
                                // StateManager.restore) and must never be interpolated into an
                                // HTML string: set them as DOM properties below instead, which
                                // cannot be broken out of. The label/placeholder strings above
                                // come from core/str, not user input, so interpolating them here
                                // is safe.
                                row.innerHTML = `
                                <div class="flex-grow-1">
                                    <div class="input-group input-group-sm mb-1">
                                        <select class="form-select res-type slms-resources-select" aria-label="${typeAria}">
                                            <option value="link" ${res.type === 'link' ? 'selected' : ''}>
                                                ${typeLinkLabel}
                                            </option>
                                            <option value="pdf" ${res.type === 'pdf' ? 'selected' : ''}>
                                                ${typePdfLabel}
                                            </option>
                                            <option value="video" ${res.type === 'video' ? 'selected' : ''}>
                                                ${typeVideoLabel}
                                            </option>
                                            <option value="audio" ${res.type === 'audio' ? 'selected' : ''}>
                                                ${typeAudioLabel}
                                            </option>
                                        </select>
                                        <input type="text" class="form-control res-title"
                                            placeholder="${titlePlaceholder}" aria-label="${titleAria}">
                                    </div>
                                    <input type="text" class="form-control form-control-sm res-url"
                                        placeholder="${urlPlaceholder}" aria-label="${urlAria}">
                                </div>
                                <button type="button" class="btn btn-sm btn-outline-danger res-del slms-btn-fit"
                                    aria-label="${removeAria}">🗑️</button>
                                `;
                                row.querySelector('.res-title').value = res.title;
                                row.querySelector('.res-url').value = res.url;

                                row.querySelector('.res-type').addEventListener('change', (e) => {
                                    data.resources[index].type = e.target.value;
                                    onUpdate(data);
                                });
                                row.querySelector('.res-title').addEventListener('input', (e) => {
                                    data.resources[index].title = e.target.value;
                                    onUpdate(data);
                                });
                                row.querySelector('.res-url').addEventListener('input', (e) => {
                                    data.resources[index].url = e.target.value;
                                    onUpdate(data);
                                });
                                row.querySelector('.res-del').addEventListener('click', () => {
                                    data.resources.splice(index, 1);
                                    renderList();
                                    onUpdate(data);
                                });
                                listContainer.appendChild(row);
                            });
                        };

                        renderList();

                        if (btnAdd) {
                            btnAdd.addEventListener('click', async() => {
                                const defaultTitle = await getString(
                                    'resources_default_item_title', 'tiny_studiolms'
                                );
                                data.resources.push({type: 'link', title: defaultTitle, url: '#'});
                                renderList();
                                onUpdate(data);
                                listContainer.scrollTop = listContainer.scrollHeight;
                            });
                        }
                    });
                });
            }

        } catch (error) {
            // A genuinely unexpected failure (a template/DOM error, not an anticipated business
            // rule), so it goes through Notification.exception() instead of inline text —
            // reserved for real bugs, not routine validation failures.
            container.innerHTML = '';
            Notification.exception(error);
        }
    },

    renderHtml: async(data) => {
        const templateData = Object.assign({}, data);
        templateData.isGrid = data.layout === 'grid';
        templateData.listFlexDirection = data.layout === 'grid' ? 'row' : 'column';
        templateData.listFlexWrap = data.layout === 'grid' ? 'wrap' : 'nowrap';

        if (!templateData.title || templateData.title.trim() === '') {
            templateData.title = await getString('resources_default_title', 'tiny_studiolms');
        }
        if (!templateData.desc || templateData.desc.trim() === '') {
            templateData.desc = await getString('resources_default_desc', 'tiny_studiolms');
        }

        const defaultItemTitle = await getString('resources_default_item_title', 'tiny_studiolms');
        templateData.mappedResources = data.resources.map(r => {
            let icon = '🔗';
            let typeColor = '#6c757d';

            if (r.type === 'pdf') {
                icon = '📄';
                typeColor = '#dc3545';
            }
            if (r.type === 'video') {
                icon = '▶️';
                typeColor = '#fd7e14';
            }
            if (r.type === 'audio') {
                icon = '🎧';
                typeColor = '#6f42c1';
            }
            if (r.type === 'link') {
                icon = '🔗';
                typeColor = '#0d6efd';
            }

            const title = (r.title && r.title.trim()) ? r.title : defaultItemTitle;
            return {...r, title: title, icon: icon, typeColor: typeColor};
        });

        return Templates.render('tiny_studiolms/block_resources', templateData);
    }
};
