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
 * Advanced Card block definition.
 *
 * @module     tiny_studiolms/blocks/card
 * @copyright  2026 Jean Lúcio
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import Templates from 'core/templates';
import {call as ajaxCall} from 'core/ajax';
import {getString} from 'core/str';
import Notification from 'core/notification';
import {getContextId} from '../context';
import {parseVideoUrl} from './video_embed';
import {applyTitleColor} from './title_color';
import {alignVars, bindAlign, normalizeAlign} from './block_align';
import {bindWidth, normalizeWidth, widthVars} from './block_width';

export default {
    id: 'advancedCard',
    titleString: 'block_card_title',
    icon: '🃏',
    defaultData: {
        align: 'left',
        width: 'reduced',
        bg: '#ffffff',
        text: '#212529',
        // Colour of the headings of the text. Empty is the colour of the text.
        titleColor: '',
        border: '#0d47a1',
        radius: 8,
        shadow: 'md',
        mediaType: 'none',
        mediaUrl: '',
        // 'rect' fills the media area; 'circle' draws an image as a round picture, as the profile card does.
        mediaShape: 'rect',
        layout: 'vertical',
        accent: true,
        btnText: '',
        btnUrl: '#',
        btnBg: '#0d47a1',
        btnTextCol: '#ffffff',
        btnAlign: 'left',
        content: '',
        hoverEffect: 'none',
        btnHoverEffect: 'none',
        btnClickSound: 'none'
    },

    // Exclude the rich text area from the Base64 state chip.
    excludeFromState: ['content'],

    // Extract the rich text back from the Moodle DOM node.
    extractDOM: (node, state) => {
        const contentNode = node.querySelector('.studiolms-editable-area');
        // Defense in depth: never leave a caller-supplied state.content (e.g. a value that
        // survived from an attacker-controlled data-slms-state) in place just because this
        // specific markup shape has no matching child — fall back to empty, never to whatever
        // was already there.
        state.content = contentNode ? contentNode.innerHTML : '';
    },

    buildToolbar: async(container, data, onUpdate, PopupManager) => {
        try {
            const {html, js} = await Templates.renderForPromise('tiny_studiolms/toolbar_card', {});
            Templates.replaceNodeContents(container, html, js);

            const btnDesign = container.querySelector('#tb-card-design');
            const btnMedia = container.querySelector('#tb-card-media');
            const btnButton = container.querySelector('#tb-card-button');

            if (btnDesign) {
                btnDesign.addEventListener('click', () => {
                    const tplData = Object.assign({}, data);
                    tplData[`shadow_${data.shadow}`] = true;
                    tplData['hover_' + (data.hoverEffect || 'none')] = true;
                    // A card saved before the accent could be turned off has no such key, and has the accent.
                    tplData.accent = data.accent !== false;
                    tplData.titleColorValue = data.titleColor || data.text;
                    Object.assign(tplData, alignVars(data.align, 'left'));
                    Object.assign(tplData, widthVars(data.width, 'reduced'));

                    PopupManager.open(btnDesign, 'tiny_studiolms/popup_card_design', tplData, (popup) => {
                        bindAlign(popup, data, onUpdate);
                        bindWidth(popup, data, onUpdate);
                        // Explicit property mapping.
                        const propMap = {
                            '#pop_card_bg': 'bg',
                            '#pop_card_text': 'text',
                            '#pop_card_title_color': 'titleColor',
                            '#pop_card_border': 'border',
                            '#pop_card_radius': 'radius',
                            '#pop_card_shadow': 'shadow',
                            '#pop_card_hover': 'hoverEffect'
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

                        // The accent colour is the only thing the border colour sets, so it goes with the accent.
                        const accentEl = popup.querySelector('#pop_card_accent');
                        accentEl?.addEventListener('change', () => {
                            data.accent = accentEl.checked;
                            popup.querySelector('#pop_card_border_row')?.classList.toggle('d-none', !accentEl.checked);
                            onUpdate(data);
                        });

                        const aiBtnEl = popup.querySelector('#card-ai-btn');
                        const aiPromptEl = popup.querySelector('#card_ai_prompt');
                        const aiSpinner = popup.querySelector('#card-ai-spinner');
                        const aiError = popup.querySelector('#card-ai-error');

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
                                        methodname: 'tiny_studiolms_generate_card',
                                        args: {topic: prompt, contextid: getContextId()},
                                    }]);
                                    const result = await promise;
                                    data.content = result.content || '';
                                    if (result.btntext) {
                                        data.btnText = result.btntext;
                                    }
                                    onUpdate(data);
                                } catch (err) {
                                    if (aiError) {
                                        // The err.message is already the translated moodle_exception text the
                                        // server sent (card_ai_error) — no need to fetch it again client-side.
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

            if (btnMedia) {
                btnMedia.addEventListener('click', () => {
                    const tplData = Object.assign({}, data);
                    tplData[`media_${data.mediaType}`] = true;
                    tplData[`layout_${data.layout}`] = true;
                    tplData.shapeCircle = data.mediaShape === 'circle';
                    tplData.shapeRect = data.mediaShape !== 'circle';

                    PopupManager.open(btnMedia, 'tiny_studiolms/popup_card_media', tplData, (popup) => {
                        const propMap = {
                            '#pop_card_mediaType': 'mediaType',
                            '#pop_card_mediaUrl': 'mediaUrl',
                            '#pop_card_mediaShape': 'mediaShape',
                            '#pop_card_layout': 'layout'
                        };
                        // A video link the block cannot embed would make the media vanish without a word, so say so.
                        const hint = popup.querySelector('#pop_card_mediaUrl_hint');
                        const showVideoHint = () => {
                            const unrecognised = data.mediaType === 'video' && data.mediaUrl.trim() !== '' &&
                                parseVideoUrl(data.mediaUrl) === null;
                            hint?.classList.toggle('d-none', !unrecognised);
                        };
                        Object.keys(propMap).forEach(selector => {
                            const el = popup.querySelector(selector);
                            if (el) {
                                el.addEventListener('input', (ev) => {
                                    data[propMap[selector]] = ev.target.value;
                                    showVideoHint();
                                    onUpdate(data);
                                });
                            }
                        });
                        showVideoHint();
                    });
                });
            }

            if (btnButton) {
                btnButton.addEventListener('click', () => {
                    const tplData = Object.assign({}, data);
                    tplData.isAlignLeft = data.btnAlign === 'left';
                    tplData.isAlignCenter = data.btnAlign === 'center';
                    tplData.isAlignRight = data.btnAlign === 'right';
                    tplData.isAlignFull = data.btnAlign === 'full';
                    tplData['btn_hover_' + (data.btnHoverEffect || 'none')] = true;
                    tplData['btn_sound_opt_' + (data.btnClickSound || 'none')] = true;

                    PopupManager.open(btnButton, 'tiny_studiolms/popup_card_button', tplData, (popup) => {
                        const propMap = {
                            '#pop_card_btnText': 'btnText',
                            '#pop_card_btnUrl': 'btnUrl',
                            '#pop_card_btnBg': 'btnBg',
                            '#pop_card_btnTextCol': 'btnTextCol',
                            '#pop_card_btnAlign': 'btnAlign',
                            '#pop_card_btn_hover': 'btnHoverEffect',
                            '#pop_card_btn_sound': 'btnClickSound'
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
        // A class, not an inline box-shadow: HTMLPurifier drops that property from stored content, so the
        // shadow would show in the editor and vanish on the course page.
        const shadowClasses = {none: '', sm: 'slms-shadow-sm', md: 'slms-shadow-md', lg: 'slms-shadow-lg'};
        templateData.shadowClass = shadowClasses[data.shadow] ?? shadowClasses.md;
        templateData.align = normalizeAlign(data.align, 'left');
        templateData.width = normalizeWidth(data.width, 'reduced');

        templateData.hasMedia = data.mediaType !== 'none' && data.mediaUrl.trim() !== '';
        // A preset leaves a marker such as [URL_DA_FOTO] for the author to replace. It is not an address, so a
        // stand-in is drawn instead of a broken image.
        const hasImageAddress = /^(?:https?:)?\/\//i.test(data.mediaUrl.trim()) || data.mediaUrl.trim().startsWith('/');
        templateData.isImage = data.mediaType === 'image' && hasImageAddress;
        templateData.isImagePlaceholder = data.mediaType === 'image' && !hasImageAddress;
        // Only a picture can be round: a video keeps its frame. Anything but 'circle' is the rectangle.
        templateData.mediaCircle = data.mediaShape === 'circle' && data.mediaType === 'image';

        if (data.mediaType === 'video' && data.mediaUrl) {
            const video = parseVideoUrl(data.mediaUrl);
            if (video) {
                templateData.mediaUrl = video.embedUrl;
                templateData.isVideo = true;
            } else {
                templateData.hasMedia = false;
            }
        }

        // The layout names where the media goes: vertical (above), horizontal (beside), and the same with _end
        // for after the text. Anything else is the plain vertical card.
        templateData.isHorizontal = data.layout === 'horizontal' || data.layout === 'horizontal_end';
        templateData.mediaEnd = data.layout === 'horizontal_end' || data.layout === 'vertical_end';
        templateData.accent = data.accent !== false;
        templateData.hasButton = data.btnText.trim() !== '';

        if (!templateData.content || templateData.content.trim() === '') {
            const [defaultTitle, defaultText] = await Promise.all([
                getString('default_card_title', 'tiny_studiolms'),
                getString('default_card_text', 'tiny_studiolms')
            ]);
            templateData.content = '<h4 style="margin-top: 0; color: inherit; font-weight: bold;">' +
                defaultTitle + '</h4><p style="margin-bottom: 0;">' + defaultText + '</p>';
        }

        templateData.content = applyTitleColor(templateData.content, data.titleColor);

        templateData.isAlignLeft = data.btnAlign === 'left';
        templateData.isAlignCenter = data.btnAlign === 'center';
        templateData.isAlignRight = data.btnAlign === 'right';
        templateData.isAlignFull = data.btnAlign === 'full';
        templateData.btnDisplayMode = (data.btnAlign === 'full') ? 'flex' : 'inline-flex';
        templateData.isBtnFullWidth = data.btnAlign === 'full';

        return Templates.render('tiny_studiolms/block_card', templateData);
    }
};
