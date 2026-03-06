/**
 * Block definitions and renderers for StudioLMS.
 *
 * @module     tiny_studiolms/blocks
 * @copyright  2026 Jean Lúcio <jeanlucio@gmail.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import Templates from 'core/templates';
import {getString} from 'core/str';

export const Blocks = {
    actionButton: {
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
            align: 'left' // Nova propriedade
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
                        // Booleans para o Mustache selecionar a option correta
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

            // Traduz a propriedade "align" para CSS real
            templateData.textAlign = (data.align === 'full') ? 'center' : data.align;
            templateData.displayMode = (data.align === 'full') ? 'flex' : 'inline-flex';
            templateData.isFullWidth = data.align === 'full';

            return Templates.render('tiny_studiolms/block_button', templateData);
        }
    },
    advancedCard: {
        id: 'advancedCard',
        titleString: 'block_card_title',
        icon: '🃏',
        defaultData: {
            bg: '#ffffff',
            text: '#212529',
            border: '#0d47a1',
            radius: 8,
            shadow: 'md',
            mediaType: 'none',
            mediaUrl: '',
            layout: 'vertical',
            btnText: '',
            btnUrl: '#',
            btnBg: '#0d47a1',
            btnTextCol: '#ffffff',
            btnAlign: 'left' // Nova propriedade de alinhamento nativa!
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

                        PopupManager.open(btnDesign, 'tiny_studiolms/popup_card_design', tplData, (popup) => {
                            // MAPEAMENTO EXPLÍCITO (Sem atalhos que quebram)
                            const propMap = {
                                '#pop_card_bg': 'bg',
                                '#pop_card_text': 'text',
                                '#pop_card_border': 'border',
                                '#pop_card_radius': 'radius',
                                '#pop_card_shadow': 'shadow'
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

                if (btnMedia) {
                    btnMedia.addEventListener('click', () => {
                        const tplData = Object.assign({}, data);
                        tplData[`media_${data.mediaType}`] = true;
                        tplData[`layout_${data.layout}`] = true;

                        PopupManager.open(btnMedia, 'tiny_studiolms/popup_card_media', tplData, (popup) => {
                            const propMap = {
                                '#pop_card_mediaType': 'mediaType',
                                '#pop_card_mediaUrl': 'mediaUrl',
                                '#pop_card_layout': 'layout'
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

                if (btnButton) {
                    btnButton.addEventListener('click', () => {
                        const tplData = Object.assign({}, data);
                        tplData.isAlignLeft = data.btnAlign === 'left';
                        tplData.isAlignCenter = data.btnAlign === 'center';
                        tplData.isAlignRight = data.btnAlign === 'right';
                        tplData.isAlignFull = data.btnAlign === 'full';

                        PopupManager.open(btnButton, 'tiny_studiolms/popup_card_button', tplData, (popup) => {
                            const propMap = {
                                '#pop_card_btnText': 'btnText',
                                '#pop_card_btnUrl': 'btnUrl',
                                '#pop_card_btnBg': 'btnBg',
                                '#pop_card_btnTextCol': 'btnTextCol',
                                '#pop_card_btnAlign': 'btnAlign'
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
            const shadowMap = {
                'none': 'none',
                'sm': '0 1px 3px rgba(0, 0, 0, 0.1)',
                'md': '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                'lg': '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
            };
            templateData.shadowCss = shadowMap[data.shadow] || shadowMap.md;

            templateData.hasMedia = data.mediaType !== 'none' && data.mediaUrl.trim() !== '';
            templateData.isImage = data.mediaType === 'image';

            if (data.mediaType === 'video' && data.mediaUrl) {
                const ytPattern = '^.*(?:(?:youtu\\.be/|v/|vi/|u/\\w/|embed/|shorts/)|' +
                    '(?:(?:watch)?\\?v(?:i)?=|&v(?:i)?=))([^#&?]*).*';
                const regExp = new RegExp(ytPattern);
                const match = data.mediaUrl.match(regExp);

                if (match && match[1]) {
                    templateData.mediaUrl = `https://www.youtube.com/embed/${match[1]}`;
                    templateData.isVideo = true;
                } else {
                    templateData.hasMedia = false;
                }
            }

            templateData.isHorizontal = data.layout === 'horizontal';
            templateData.hasButton = data.btnText.trim() !== '';

            // A MÁGICA DO ALINHAMENTO IMPORTADA PARA O CARD
            templateData.btnTextAlign = (data.btnAlign === 'full') ? 'center' : data.btnAlign;
            templateData.btnDisplayMode = (data.btnAlign === 'full') ? 'flex' : 'inline-flex';
            templateData.isBtnFullWidth = data.btnAlign === 'full';

            return Templates.render('tiny_studiolms/block_card', templateData);
        }
    },

    accordion: {
        id: 'accordion',
        titleString: 'block_accordion_title',
        icon: '📑',
        defaultData: {
            title: 'Tópico expansível',
            color: '#3b82f6',
            bg: '#ffffff',
            icon: '▼ / ▲',
            state: 'closed'
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

                        // Mapeia o ícone selecionado para o Mustache
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
            // Pega apenas o primeiro ícone do par para mostrar no estado fechado/inicial
            templateData.iconFirst = data.icon.split(' / ')[0];

            return Templates.render('tiny_studiolms/block_accordion', templateData);
        }
    },

    webteca: {
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
            layout: 'list', // NOVA PROPRIEDADE
            resources: [
                {type: 'pdf', title: 'Artigo Científico', url: 'https://scholar.google.com'},
                {type: 'video', title: 'Vídeo Explicativo', url: 'https://youtube.com'}
            ]
        },
        buildToolbar: async(container, data, onUpdate, PopupManager) => {
            try {
                const {html, js} = await Templates.renderForPromise('tiny_studiolms/toolbar_webteca', {});
                Templates.replaceNodeContents(container, html, js);

                const btnGeneral = container.querySelector('#tb-web-general');
                const btnResources = container.querySelector('#tb-web-resources');

                // POPUP 1: Configurações Gerais
                if (btnGeneral) {
                    btnGeneral.addEventListener('click', () => {
                        const tplData = Object.assign({}, data);
                        tplData.isList = data.layout === 'list';
                        tplData.isGrid = data.layout === 'grid';

                        PopupManager.open(btnGeneral, 'tiny_studiolms/popup_webteca_general', tplData, (popup) => {
                            const propMap = {
                                '#pop_web_layout': 'layout', // MAPEAMENTO DO GRID
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

                // POPUP 2: Gerenciador de Links Dinâmico (AGORA COM TIPOS DE ARQUIVO)
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

                                    // HTML interno com Seletor de Tipo
                                    row.innerHTML = `
                                    <div class="flex-grow-1">
                                        <div class="input-group input-group-sm mb-1">
                                            <select class="form-select res-type slms-webteca-select" title="Tipo de Recurso">
                                                <option value="link" ${res.type === 'link' ? 'selected' : ''}>🔗 Link</option>
                                                <option value="pdf" ${res.type === 'pdf' ? 'selected' : ''}>📄 PDF</option>
                                                <option value="video" ${res.type === 'video' ? 'selected' : ''}>▶️ Vídeo</option>
                                                <option value="audio" ${res.type === 'audio' ? 'selected' : ''}>🎧 Áudio</option>
                                            </select>
                                            <input type="text" class="form-control res-title" +
                                            value="${res.title}" placeholder="Título">
                                        </div>
                                        <input type="text" class="form-control form-control-sm res-url"+
                                         value="${res.url}" placeholder="https://...">
                                    </div>
                                    <button type="button" class="btn btn-sm btn-outline-danger res-del slms-btn-fit" +
                                    title="Remover">🗑️</button>
                                    `;

                                    // Eventos
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

            // Variáveis CSS Dinâmicas para Lista vs Grid
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
    },
};
