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
 * Stylized Table block definition.
 *
 * @module     tiny_studiolms/blocks/table
 * @copyright  2026 Jean Lúcio <jeanlucio@gmail.com>
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import Templates from 'core/templates';
import {getString} from 'core/str';

export default {
    id: 'table',
    titleString: 'block_table_title',
    icon: '📊',
    defaultData: {
        cols: 3,
        rows: 4,
        style: 'striped',
        headerBg: '#0f172a',
        headerText: '#ffffff',
        cellData: []
    },

    // Cell content is excluded from the Base64 state chip.
    excludeFromState: ['cellData'],

    extractDOM: (node, state) => {
        const tableRows = node.querySelectorAll('tr');
        state.cellData = [];

        tableRows.forEach(tr => {
            const rowContent = [];
            const cells = tr.querySelectorAll('th, td');

            cells.forEach(cell => {
                const innerDiv = cell.querySelector('.slms-cell-content');
                if (innerDiv) {
                    rowContent.push(innerDiv.innerHTML);
                } else {
                    // Fallback for cells edited with the native TinyMCE toolbar, which omits our wrapper div.
                    rowContent.push(cell.innerHTML);
                }
            });
            state.cellData.push(rowContent);
        });

        if (state.cellData.length > 0) {
            state.rows = state.cellData.length;
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
                    content = '&nbsp;';
                }

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
