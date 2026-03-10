/**
 * Accordion block definition.
 *
 * @module     tiny_studiolms/blocks/accordion
 * @copyright  2026 Jean Lúcio <jeanlucio@gmail.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import Templates from 'core/templates';
import {getString} from 'core/str';

export default {
    id: 'accordion',
    titleString: 'block_accordion_title',
    icon: '📑',
    defaultData: {
        title: 'Tópico expansível',
        color: '#3b82f6',
        bg: '#ffffff',
        icon: '▼ / ▲',
        state: 'closed',
        content: '<p style="margin-top: 0;">Escreva o conteúdo do tópico aqui...</p>'
    },

    // Exclude strings and rich text from the Base64 state chip.
    excludeFromState: ['title', 'content'],

    // Extract the text back from the live Moodle DOM node.
    extractDOM: (node, state) => {
        const titleNode = node.querySelector('.slms-acc-title');
        if (titleNode) {
            state.title = titleNode.textContent.trim();
        }

        const contentNode = node.querySelector('.studiolms-editable-area');
        if (contentNode) {
            state.content = contentNode.innerHTML;
        }
    },

    buildToolbar: async(container, data, onUpdate, PopupManager) => {
        try {
            const {html, js} = await Templates.renderForPromise('tiny_studiolms/toolbar_accordion', {});
            Templates.replaceNodeContents(container, html, js);

            const btnContent = container.querySelector('#tb-acc-content');
            const btnDesign = container.querySelector('#tb-acc-design');

            if (btnContent) {
                btnContent.addEventListener('click', () => {
                    const tplData = Object.assign({}, data);
                    tplData.isOpen = data.state === 'open';
                    tplData.isClosed = data.state === 'closed';

                    PopupManager.open(btnContent, 'tiny_studiolms/popup_accordion_content', tplData, (popup) => {
                        const propMap = {
                            '#pop_acc_title': 'title',
                            '#pop_acc_state': 'state'
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

            if (btnDesign) {
                btnDesign.addEventListener('click', () => {
                    const tplData = Object.assign({}, data);

                    // Maps the selected icon to the Mustache variable.
                    const iconKey = {
                        '▼ / ▲': 'icon_arrow',
                        '➕ / ➖': 'icon_plus',
                        '📁 / 📂': 'icon_folder',
                        '▶ / ▼': 'icon_triangle'
                    }[data.icon] || 'icon_arrow';

                    tplData[iconKey] = true;

                    PopupManager.open(btnDesign, 'tiny_studiolms/popup_accordion_design', tplData, (popup) => {
                        const propMap = {
                            '#pop_acc_color': 'color',
                            '#pop_acc_bg': 'bg',
                            '#pop_acc_icon': 'icon'
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

    renderHtml: (data) => {
        const templateData = Object.assign({}, data);
        templateData.isOpen = data.state === 'open';
        // Gets only the first icon of the pair to display in the closed state.
        templateData.iconFirst = data.icon.split(' / ')[0];
        return Templates.render('tiny_studiolms/block_accordion', templateData);
    }
};
