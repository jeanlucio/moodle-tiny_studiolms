/**
 * Action Button (CTA) block definition.
 *
 * @module     tiny_studiolms/blocks/button
 * @copyright  2026 Jean Lúcio <jeanlucio@gmail.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import Templates from 'core/templates';
import {getString} from 'core/str';

export default {
    id: 'actionButton',
    titleString: 'button_cta',
    icon: '🔘',
    defaultData: {
        btnText: '',
        btnUrl: '#',
        btnBg: '#0d47a1',
        btnTextCol: '#ffffff',
        radius: 6,
        target: '_blank',
        align: 'left'
    },

    // Exclude plain text from the Base64 state chip.
    excludeFromState: ['btnText'],

    // Extract the text back from the injected Moodle DOM node.
    extractDOM: (node, state) => {
        const anchorNode = node.querySelector('a');
        if (anchorNode) {
            state.btnText = anchorNode.textContent.trim();
        }
    },

    buildToolbar: async(container, data, onUpdate, PopupManager) => {
        try {
            const {html, js} = await Templates.renderForPromise('tiny_studiolms/toolbar_button', {});
            Templates.replaceNodeContents(container, html, js);

            const btnContent = container.querySelector('#tb-btn-content');
            const btnDesign = container.querySelector('#tb-btn-design');

            if (btnContent) {
                btnContent.addEventListener('click', () => {
                    const tplData = Object.assign({}, data);
                    tplData.isTargetBlank = data.target === '_blank';

                    PopupManager.open(btnContent, 'tiny_studiolms/popup_button_content', tplData, (popupNode) => {
                        const inputs = ['#pop_btn_text', '#pop_btn_url', '#pop_btn_target'];
                        inputs.forEach(selector => {
                            const el = popupNode.querySelector(selector);
                            if (el) {
                                el.addEventListener('input', (ev) => {
                                    const prop = selector.replace('#pop_btn_', '');
                                    const propMap = {
                                        'text': 'btnText',
                                        'url': 'btnUrl'
                                    };
                                    const finalProp = propMap[prop] || prop;
                                    data[finalProp] = ev.target.value;
                                    onUpdate(data);
                                });
                            }
                        });
                    });
                });
            }

            if (btnDesign) {
                btnDesign.addEventListener('click', () => {
                    const tplData = Object.assign({}, data);
                    // Booleans for Mustache to select the correct option.
                    tplData.isAlignLeft = data.align === 'left';
                    tplData.isAlignCenter = data.align === 'center';
                    tplData.isAlignRight = data.align === 'right';
                    tplData.isAlignFull = data.align === 'full';

                    PopupManager.open(btnDesign, 'tiny_studiolms/popup_button_design', tplData, (popupNode) => {
                        const inputs = ['#pop_btn_bg', '#pop_btn_text_col', '#pop_btn_radius', '#pop_btn_align'];
                        inputs.forEach(selector => {
                            const el = popupNode.querySelector(selector);
                            if (el) {
                                el.addEventListener('input', (ev) => {
                                    const prop = selector.replace('#pop_btn_', '');
                                    const propMap = {
                                        'text_col': 'btnTextCol',
                                        'bg': 'btnBg'
                                    };
                                    const finalProp = propMap[prop] || prop;
                                    data[finalProp] = ev.target.value;
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

    renderHtml: (data) => {
        const templateData = Object.assign({}, data);
        templateData.isTargetBlank = data.target === '_blank';

        // Translate the "align" property to actual CSS rules.
        templateData.textAlign = (data.align === 'full') ? 'center' : data.align;
        templateData.displayMode = (data.align === 'full') ? 'flex' : 'inline-flex';
        templateData.isFullWidth = data.align === 'full';

        return Templates.render('tiny_studiolms/block_button', templateData);
    }
};
