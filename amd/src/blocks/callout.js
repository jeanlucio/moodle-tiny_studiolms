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

export default {
    id: 'callout',
    titleString: 'block_callout_title',
    icon: '💡',
    defaultData: {
        icon: '💡',
        backgroundColor: '#fef9c3', // Amarelo bem claro
        textColor: '#854d0e', // Castanho escuro para contraste
        borderColor: '#eab308', // Amarelo mais forte na lateral
        borderLeftWidth: 4,
        borderRadius: 6,
        contentHtml: ''
    },

    // O texto é extraído dinamicamente para não pesar o Base64
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
                    PopupManager.open(btnDesign, 'tiny_studiolms/popup_callout_design', data, (popup) => {
                        const propMap = {
                            '#pop_callout_icon': 'icon',
                            '#pop_callout_bg': 'backgroundColor',
                            '#pop_callout_text': 'textColor',
                            '#pop_callout_border': 'borderColor'
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
                    });
                });
            }
        } catch (error) {
            container.innerHTML = '<div class="text-danger small">Erro ao carregar toolbar</div>';
        }
    },

    renderHtml: (data) => {
        const tData = Object.assign({}, data);

        tData.hasIcon = data.icon && data.icon.trim() !== '';

        // Se for uma inserção nova (sem texto extraído), coloca o texto de apoio
        if (!tData.contentHtml || tData.contentHtml.trim() === '') {
            tData.contentHtml = '<p style="margin: 0;">Escreva o seu destaque aqui...</p>';
        }

        return Templates.render('tiny_studiolms/block_callout', tData);
    }
};
