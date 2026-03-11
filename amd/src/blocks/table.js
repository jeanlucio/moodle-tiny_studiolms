/**
 * Stylized Table block definition.
 *
 * @module     tiny_studiolms/blocks/table
 * @copyright  2026 Jean Lúcio <jeanlucio@gmail.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import Templates from 'core/templates';

export default {
    id: 'table',
    titleString: 'block_table_title',
    icon: '📊',
    defaultData: {
        cols: 3,
        rows: 4, // 1 Cabeçalho + 3 Linhas de corpo
        style: 'striped',
        headerBg: '#0f172a', // Azul muito escuro/Slate
        headerText: '#ffffff',
        cellData: [] // Matriz 2D: cellData[rowIndex][colIndex]
    },

    // O conteúdo das células não vai para o Base64
    excludeFromState: ['cellData'],

    // A MÁGICA DE PRESERVAÇÃO TURBINADA: Aceita alterações feitas pela barra nativa do Moodle!
    extractDOM: (node, state) => {
        const tableRows = node.querySelectorAll('tr');
        state.cellData = [];

        tableRows.forEach(tr => {
            const rowContent = [];
            // Lê todas as células, sejam do nosso padrão (th/td) ou injetadas pelo TinyMCE
            const cells = tr.querySelectorAll('th, td');

            cells.forEach(cell => {
                // Verifica se tem a nossa div protetora
                const innerDiv = cell.querySelector('.slms-cell-content');
                if (innerDiv) {
                    rowContent.push(innerDiv.innerHTML);
                } else {
                    // Se não tiver (porque o professor usou a barra nativa do Moodle), pega o conteúdo cru!
                    rowContent.push(cell.innerHTML);
                }
            });
            state.cellData.push(rowContent);
        });

        // Atualiza a estrutura no painel do StudioLMS automaticamente!
        if (state.cellData.length > 0) {
            state.rows = state.cellData.length;
            // Pega o número máximo de colunas encontrado nas linhas
            state.cols = Math.max(...state.cellData.map(row => row.length));
        }
    },

    buildToolbar: async(container, data, onUpdate, PopupManager) => {
        try {
            const {html, js} = await Templates.renderForPromise('tiny_studiolms/toolbar_table', {});
            Templates.replaceNodeContents(container, html, js);

            const btnSetup = container.querySelector('#tb-table-setup');
            const btnDesign = container.querySelector('#tb-table-design');

            if (btnSetup) {
                btnSetup.addEventListener('click', () => {
                    PopupManager.open(btnSetup, 'tiny_studiolms/popup_table_setup', data, (popup) => {
                        const propMap = {
                            '#pop_table_cols': 'cols',
                            '#pop_table_rows': 'rows'
                        };
                        Object.keys(propMap).forEach(selector => {
                            const el = popup.querySelector(selector);
                            if (el) {
                                el.addEventListener('input', (ev) => {
                                    // Garante que sejam números inteiros
                                    data[propMap[selector]] = parseInt(ev.target.value) || 1;
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
                    tplData.isStriped = data.style === 'striped';
                    tplData.isDefault = data.style === 'default';

                    PopupManager.open(btnDesign, 'tiny_studiolms/popup_table_design', tplData, (popup) => {
                        const propMap = {
                            '#pop_table_style': 'style',
                            '#pop_table_header_bg': 'headerBg',
                            '#pop_table_header_text': 'headerText'
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
            container.innerHTML = '<div class="text-danger small">Erro ao carregar toolbar</div>';
        }
    },

    renderHtml: (data) => {
        const tData = Object.assign({}, data);
        tData.isStriped = data.style === 'striped';

        const numRows = Math.max(2, parseInt(data.rows) || 4);
        const numCols = Math.max(1, parseInt(data.cols) || 3);

        tData.headerCells = [];
        tData.bodyRows = [];

        for (let r = 0; r < numRows; r++) {
            const currentRowData = (data.cellData && data.cellData[r]) ? data.cellData[r] : [];
            const cellsInThisRow = [];

            for (let c = 0; c < numCols; c++) {
                let content = currentRowData[c];
                if (!content || content.trim() === '') {
                    content = (r === 0) ? 'Cabeçalho' : '&nbsp;';
                }

                // MÁGICA: Injetando a cor DENTRO do objeto de cada célula!
                cellsInThisRow.push({
                    content: content,
                    headerBg: data.headerBg,
                    headerText: data.headerText
                });
            }

            if (r === 0) {
                tData.headerCells = cellsInThisRow;
            } else {
                tData.bodyRows.push({cells: cellsInThisRow});
            }
        }

        return Templates.render('tiny_studiolms/block_table', tData);
    }
};
