/**
 * Grid Cards (Container) block definition.
 *
 * @module     tiny_studiolms/blocks/gridcards
 * @copyright  2026 Jean Lúcio <jeanlucio@gmail.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import Templates from 'core/templates';

export default {
    id: 'gridcards',
    titleString: 'block_gridcards_title',
    icon: '🔲',
    defaultData: {
        columns: '2',
        gap: 20,
        containerTitle: '',
        containerTitleSize: '24px',
        titleColor: '#333333',
        background: 'transparent',
        borderColor: '#e2e8f0',
        borderWidth: 0,
        borderRadius: 0,
        shadow: 'none',
        padding: 'none',
        slots: []
    },

    excludeFromState: ['containerTitle', 'slots'],

    extractDOM: (node, state) => {
        const titleNode = node.querySelector('.slms-grid-title');
        state.containerTitle = titleNode ? titleNode.innerHTML.trim() : '';

        const slotNodes = node.querySelectorAll('.slms-grid-slot');
        state.slots = Array.from(slotNodes).map(el => el.innerHTML);
    },

    buildToolbar: async(container, data, onUpdate, PopupManager) => {
        try {
            const {html, js} = await Templates.renderForPromise('tiny_studiolms/toolbar_gridcards', {});
            Templates.replaceNodeContents(container, html, js);

            const btnLayout = container.querySelector('#tb-grid-layout');
            const btnDesign = container.querySelector('#tb-grid-design');

            if (btnLayout) {
                btnLayout.addEventListener('click', () => {
                    const tplData = Object.assign({}, data);
                    tplData[`col${data.columns}`] = true;

                    PopupManager.open(btnLayout, 'tiny_studiolms/popup_gridcards_layout', tplData, (popup) => {
                        const propMap = {
                            '#pop_grid_cols': 'columns',
                            '#pop_grid_gap': 'gap'
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
                    const safeSize = data.containerTitleSize.replace('px', '');
                    tplData[`size${safeSize}`] = true;

                    PopupManager.open(btnDesign, 'tiny_studiolms/popup_gridcards_design', tplData, (popup) => {
                        const propMap = {
                            '#pop_grid_title': 'containerTitle',
                            '#pop_grid_title_size': 'containerTitleSize',
                            '#pop_grid_title_color': 'titleColor',
                            '#pop_grid_bg': 'background',
                            '#pop_grid_border': 'borderColor',
                            '#pop_grid_radius': 'borderRadius'
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
        const tData = Object.assign({}, data);

        const pdMap = {'none': '0px', 'sm': '10px', 'md': '20px', 'lg': '40px'};
        const bg = data.background === 'transparent' ? 'transparent' : data.background;
        const pad = pdMap[data.padding] || '0px';
        const bdw = data.borderWidth || 0;

        let borderStyle = 'none';
        if (bdw > 0) {
            borderStyle = `${bdw}px solid ${data.borderColor}`;
        }

        tData.containerStyle = `background: ${bg}; border: ${borderStyle}; ` +
            `border-radius: ${data.borderRadius}px; padding: ${pad}; ` +
            `width: 100%; box-sizing: border-box; margin-bottom: 1.5rem;`;

        tData.contentStyle = `display: grid; gap: ${data.gap}px; ` +
            `grid-template-columns: repeat(${data.columns}, 1fr);`;

        const colCount = parseInt(data.columns) || 2;
        const slotsArray = [];

        for (let i = 0; i < colCount; i++) {
            let content = (data.slots && data.slots[i]) ? data.slots[i] : '';

            // Insere apenas um parágrafo vazio invisível se a caixa estiver limpa
            if (!content || content.trim() === '') {
                content = '<p><br></p>';
            }

            slotsArray.push(
                `<div class="slms-grid-slot mceEditable" style="outline: none; display: flex; ` +
                `flex-direction: column; min-width: 0; height: 100%;">${content}</div>`
            );
        }

        tData.slotsHtml = slotsArray.join('');

        return Templates.render('tiny_studiolms/block_gridcards', tData);
    }
};
