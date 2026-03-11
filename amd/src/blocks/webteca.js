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
 * Webteca (Resource Library) block definition.
 *
 * @module     tiny_studiolms/blocks/webteca
 * @copyright  2026 Jean Lúcio <jeanlucio@gmail.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import Templates from 'core/templates';

export default {
    id: 'webteca',
    titleString: 'block_webteca_title',
    icon: '📚',
    defaultData: {
        title: 'Material Complementar',
        desc: 'Acesse os recursos abaixo para aprofundar seus conhecimentos.',
        bg: '#ffffff',
        headerBg: '#f8f9fa',
        color: '#0d47a1',
        isOpen: true,
        layout: 'list',
        resources: [
            {type: 'pdf', title: 'Artigo Científico', url: 'https://scholar.google.com'},
            {type: 'video', title: 'Vídeo Explicativo', url: 'https://youtube.com'}
        ]
    },

    // Exclude title and description. Resources array remains in state because it drives the UI list.
    excludeFromState: ['title', 'desc'],

    extractDOM: (node, state) => {
        const titleNode = node.querySelector('.slms-wt-title');
        if (titleNode) {
            state.title = titleNode.textContent.trim();
        }
        const descNode = node.querySelector('.slms-wt-desc');
        if (descNode) {
            state.desc = descNode.textContent.trim();
        }
    },

    buildToolbar: async(container, data, onUpdate, PopupManager) => {
        try {
            const {html, js} = await Templates.renderForPromise('tiny_studiolms/toolbar_webteca', {});
            Templates.replaceNodeContents(container, html, js);

            const btnGeneral = container.querySelector('#tb-web-general');
            const btnResources = container.querySelector('#tb-web-resources');

            if (btnGeneral) {
                btnGeneral.addEventListener('click', () => {
                    const tplData = Object.assign({}, data);
                    tplData.isList = data.layout === 'list';
                    tplData.isGrid = data.layout === 'grid';

                    PopupManager.open(btnGeneral, 'tiny_studiolms/popup_webteca_general', tplData, (popup) => {
                        const propMap = {
                            '#pop_web_layout': 'layout',
                            '#pop_web_title': 'title',
                            '#pop_web_desc': 'desc',
                            '#pop_web_bg': 'bg'
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

            if (btnResources) {
                btnResources.addEventListener('click', () => {
                    PopupManager.open(btnResources, 'tiny_studiolms/popup_webteca_resources', {}, (popup) => {
                        const listContainer = popup.querySelector('#slms-webteca-resource-list');
                        const btnAdd = popup.querySelector('#pop_web_add_btn');

                        const renderList = () => {
                            listContainer.innerHTML = '';
                            data.resources.forEach((res, index) => {
                                const row = document.createElement('div');
                                row.className = 'd-flex gap-2 mb-2 align-items-center p-2 border rounded bg-light';

                                // HTML quebrado em múltiplas linhas para respeitar o limite de 132 caracteres
                                row.innerHTML = `
                                <div class="flex-grow-1">
                                    <div class="input-group input-group-sm mb-1">
                                        <select class="form-select res-type slms-webteca-select" aria-label="Type">
                                            <option value="link" ${res.type === 'link' ? 'selected' : ''}>🔗 Link</option>
                                            <option value="pdf" ${res.type === 'pdf' ? 'selected' : ''}>📄 PDF</option>
                                            <option value="video" ${res.type === 'video' ? 'selected' : ''}>▶️ Vídeo</option>
                                            <option value="audio" ${res.type === 'audio' ? 'selected' : ''}>🎧 Áudio</option>
                                        </select>
                                        <input type="text" class="form-control res-title" value="${res.title}"
                                            placeholder="Título" aria-label="Title">
                                    </div>
                                    <input type="text" class="form-control form-control-sm res-url"
                                        value="${res.url}" placeholder="https://..." aria-label="URL">
                                </div>
                                <button type="button" class="btn btn-sm btn-outline-danger res-del slms-btn-fit"
                                    aria-label="Remove">🗑️</button>
                                `;

                                row.querySelector('.res-type').addEventListener('change', (e) => {
                                    data.resources[index].type = e.target.value;
                                    onUpdate(data);
                                });
                                row.querySelector('.res-title').addEventListener('input', (e) => {
                                    data.resources[index].title = e.target.value;
                                    onUpdate(data);
                                });
                                row.querySelector('.res-url').addEventListener('input', (e) => {
                                    data.resources[index].url = e.target.value;
                                    onUpdate(data);
                                });
                                row.querySelector('.res-del').addEventListener('click', () => {
                                    data.resources.splice(index, 1);
                                    renderList();
                                    onUpdate(data);
                                });
                                listContainer.appendChild(row);
                            });
                        };

                        renderList();

                        if (btnAdd) {
                            btnAdd.addEventListener('click', () => {
                                data.resources.push({type: 'link', title: 'Novo Recurso', url: '#'});
                                renderList();
                                onUpdate(data);
                                listContainer.scrollTop = listContainer.scrollHeight;
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
        const templateData = Object.assign({}, data);
        templateData.isGrid = data.layout === 'grid';
        templateData.listFlexDirection = data.layout === 'grid' ? 'row' : 'column';
        templateData.listFlexWrap = data.layout === 'grid' ? 'wrap' : 'nowrap';

        templateData.mappedResources = data.resources.map(r => {
            let icon = '🔗';
            let typeColor = '#6c757d';

            if (r.type === 'pdf') {
 icon = '📄'; typeColor = '#dc3545';
}
            if (r.type === 'video') {
 icon = '▶️'; typeColor = '#fd7e14';
}
            if (r.type === 'audio') {
 icon = '🎧'; typeColor = '#6f42c1';
}
            if (r.type === 'link') {
 icon = '🔗'; typeColor = '#0d6efd';
}

            return {...r, icon: icon, typeColor: typeColor};
        });

        return Templates.render('tiny_studiolms/block_webteca', templateData);
    }
};
