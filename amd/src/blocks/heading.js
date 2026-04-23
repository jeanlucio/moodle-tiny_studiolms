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
 * Stylized Heading block definition.
 *
 * @module     tiny_studiolms/blocks/heading
 * @copyright  2026 Jean Lúcio <jeanlucio@gmail.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import Templates from 'core/templates';
import {getString} from 'core/str';

export default {
    id: 'stylizedHeading',
    titleString: 'block_heading_title',
    icon: '🔠',
    defaultData: {
        text: '',
        level: 'h3',
        icon: '🎯',
        bgColor: '#e3f2fd',
        textColor: '#0d47a1'
    },
    // Exclude rich text content from being serialized into the Base64 chip.
    excludeFromState: ['text'],

    // Reads the rich text back from the Moodle DOM node upon re-edition.
    extractDOM: (node, state) => {
        const textNode = node.querySelector('.slms-heading-text');
        if (textNode) {
            state.text = textNode.innerHTML;
        }
    },

    buildToolbar: async(container, data, onUpdate, PopupManager) => {
        try {
            const {html, js} = await Templates.renderForPromise('tiny_studiolms/toolbar_heading', {});
            Templates.replaceNodeContents(container, html, js);

            const btnConfig = container.querySelector('#tb-head-config');

            if (btnConfig) {
                btnConfig.addEventListener('click', () => {
                    const tplData = Object.assign({}, data);
                    tplData.isH3 = data.level === 'h3';
                    tplData.isH4 = data.level === 'h4';

                    PopupManager.open(btnConfig, 'tiny_studiolms/popup_heading', tplData, (popup) => {
                        const propMap = {
                            '#pop_head_level': 'level',
                            '#pop_head_icon': 'icon',
                            '#pop_head_bg': 'bgColor',
                            '#pop_head_color': 'textColor'
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
        const templateData = Object.assign({}, data);
        templateData.isH3 = data.level === 'h3';
        templateData.isH4 = data.level === 'h4';

        if (!templateData.text || templateData.text.trim() === '') {
            const defaultText = await getString('default_heading_text', 'tiny_studiolms');
            templateData.text = '<strong>' + defaultText + '</strong>';
        }

        return Templates.render('tiny_studiolms/block_heading', templateData);
    }
};
