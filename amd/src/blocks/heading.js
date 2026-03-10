/**
 * Stylized Heading block definition.
 *
 * @module     tiny_studiolms/blocks/heading
 * @copyright  2026 Jean Lúcio <jeanlucio@gmail.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import Templates from 'core/templates';

export default {
    id: 'stylizedHeading',
    titleString: 'block_heading_title',
    icon: '🔠',
    defaultData: {
        text: '<strong>Novo Título</strong>',
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
            container.innerHTML = '<div class="text-danger small">Erro</div>';
        }
    },

    renderHtml: (data) => {
        const templateData = Object.assign({}, data);
        templateData.isH3 = data.level === 'h3';
        templateData.isH4 = data.level === 'h4';
        return Templates.render('tiny_studiolms/block_heading', templateData);
    }
};
