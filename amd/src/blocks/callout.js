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
 * Callout (Highlight Box) block definition.
 *
 * @module     tiny_studiolms/blocks/callout
 * @copyright  2026 Jean Lúcio <jeanlucio@gmail.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import Templates from 'core/templates';
import {call as ajaxCall} from 'core/ajax';
import {getString} from 'core/str';

export default {
    id: 'callout',
    titleString: 'block_callout_title',
    icon: '💡',
    defaultData: {
        icon: '💡',
        backgroundColor: '#fef9c3',
        textColor: '#854d0e',
        borderColor: '#eab308',
        borderLeftWidth: 4,
        borderRadius: 6,
        contentHtml: '',
        hoverEffect: 'none'
    },

    // Rich text is excluded from the Base64 state chip.
    excludeFromState: ['contentHtml'],

    extractDOM: (node, state) => {
        const contentNode = node.querySelector('.slms-callout-content');
        if (contentNode) {
            state.contentHtml = contentNode.innerHTML;
        }
    },

    buildToolbar: async(container, data, onUpdate, PopupManager) => {
        try {
            const {html, js} = await Templates.renderForPromise('tiny_studiolms/toolbar_callout', {});
            Templates.replaceNodeContents(container, html, js);

            const btnDesign = container.querySelector('#tb-callout-design');

            if (btnDesign) {
                btnDesign.addEventListener('click', () => {
                    const tplData = Object.assign({}, data);
                    tplData['hover_' + (data.hoverEffect || 'none')] = true;

                    PopupManager.open(btnDesign, 'tiny_studiolms/popup_callout_design', tplData, (popup) => {
                        const propMap = {
                            '#pop_callout_icon': 'icon',
                            '#pop_callout_bg': 'backgroundColor',
                            '#pop_callout_text': 'textColor',
                            '#pop_callout_border': 'borderColor',
                            '#pop_callout_hover': 'hoverEffect'
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

                        const btnClearIcon = popup.querySelector('#pop_callout_clear_icon');
                        if (btnClearIcon) {
                            btnClearIcon.addEventListener('click', () => {
                                popup.querySelector('#pop_callout_icon').value = '';
                                data.icon = '';
                                onUpdate(data);
                            });
                        }

                        const aiBtnEl = popup.querySelector('#callout-ai-btn');
                        const aiPromptEl = popup.querySelector('#callout_ai_prompt');
                        const aiSpinner = popup.querySelector('#callout-ai-spinner');
                        const aiError = popup.querySelector('#callout-ai-error');

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
                                        methodname: 'tiny_studiolms_generate_callout',
                                        args: {topic: prompt},
                                    }]);
                                    const result = await promise;
                                    const iconEl = popup.querySelector('#pop_callout_icon');
                                    if (iconEl && result.icon) {
                                        iconEl.value = result.icon;
                                        data.icon = result.icon;
                                    }
                                    data.contentHtml = result.contenthtml || '';
                                    onUpdate(data);
                                } catch (err) {
                                    if (aiError) {
                                        let msg = '';
                                        try {
                                            msg = await getString('callout_ai_error', 'tiny_studiolms');
                                        } catch (_) {
                                            msg = 'Erro ao gerar callout. Tente novamente.';
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
            }
        } catch (error) {
            container.innerHTML = '';
            const errorNode = document.createElement('div');
            errorNode.className = 'text-danger small';
            try {
                errorNode.textContent = await getString('error_loading_form', 'tiny_studiolms');
            } catch (innerError) {
                errorNode.textContent = 'Error';
            }
            container.appendChild(errorNode);
        }
    },

    renderHtml: async(data) => {
        const tData = Object.assign({}, data);

        tData.hasIcon = data.icon && data.icon.trim() !== '';

        if (!tData.contentHtml || tData.contentHtml.trim() === '') {
            tData.contentHtml = await getString('default_callout_content', 'tiny_studiolms');
        }

        return Templates.render('tiny_studiolms/block_callout', tData);
    }
};
