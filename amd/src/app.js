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
 * Core application logic for StudioLMS with Live Preview and Canva-style Toolbar.
 *
 * @module     tiny_studiolms/app
 * @copyright  2026 Jean Lúcio <jeanlucio@gmail.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import {Blocks} from './blocks/registry';
import {getString} from 'core/str';
import Templates from 'core/templates';
import Notification from 'core/notification';

let currentConfig = null;
let currentBlockType = null;
let tinyEditorInstance = null;
let moodleModalInstance = null;
let currentZoom = 1;
let targetEditNode = null;

const StateManager = {
    encode: (data, excludeKeys = []) => {
        const state = Object.assign({}, data);
        excludeKeys.forEach((k) => {
            delete state[k];
        });
        return btoa(encodeURIComponent(JSON.stringify(state)));
    },
    decode: (base64) => {
        try {
            return JSON.parse(decodeURIComponent(atob(base64)));
        } catch (e) {
            return null;
        }
    }
};

export const initStudioApp = (editor, modal, editData = null) => {
    tinyEditorInstance = editor;
    moodleModalInstance = modal;
    currentZoom = 1;
    targetEditNode = null;

    if (editData && editData.node) {
        targetEditNode = editData.node;
    }

    setTimeout(async() => {
        setupNavigation();
        setupZoomControls();

        if (editData && editData.type && editData.state) {
            const blockDef = Blocks[editData.type];
            if (blockDef) {
                const restoredState = StateManager.decode(editData.state);
                if (restoredState) {
                    const mergedConfig = Object.assign(JSON.parse(JSON.stringify(blockDef.defaultData)), restoredState);

                    if (blockDef.extractDOM && targetEditNode) {
                        blockDef.extractDOM(targetEditNode, mergedConfig);
                    }

                    const translatedTitle = await getString('configuration', 'tiny_studiolms');
                    currentBlockType = blockDef;
                    currentConfig = mergedConfig;

                    openConfigurationPanel(blockDef, translatedTitle, mergedConfig);
                    return;
                }
            }
        }

        renderLibrary();
    }, 100);
};

const setupZoomControls = () => {
    const btnIn = document.getElementById('slms-zoom-in');
    const btnOut = document.getElementById('slms-zoom-out');
    const lblZoom = document.getElementById('slms-zoom-level');
    const previewPanel = document.getElementById('slms-live-preview');
    const canvasArea = document.querySelector('.slms-canvas-area');

    if (!btnIn || !btnOut || !lblZoom || !previewPanel) {
        return;
    }

    const updateZoom = (newZoom) => {
        currentZoom = Math.max(0.5, Math.min(newZoom, 1.5));
        lblZoom.textContent = `${Math.round(currentZoom * 100)}%`;
        previewPanel.style.transform = `scale(${currentZoom})`;
    };

    btnIn.addEventListener('click', () => {
        updateZoom(currentZoom + 0.1);
    });

    btnOut.addEventListener('click', () => {
        updateZoom(currentZoom - 0.1);
    });

    lblZoom.addEventListener('click', () => {
        if (currentZoom !== 1) {
            updateZoom(1);
        }
    });

    lblZoom.style.cursor = 'pointer';

    if (canvasArea) {
        canvasArea.addEventListener('wheel', (e) => {
            if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
                if (e.deltaY > 0) {
                    updateZoom(currentZoom - 0.05);
                } else if (e.deltaY < 0) {
                    updateZoom(currentZoom + 0.05);
                }
            }
        }, {passive: false});
    }
};

const setupNavigation = () => {
    const btnBack = document.getElementById('slms-btn-back');
    const btnInsert = document.getElementById('slms-btn-insert');

    if (btnBack) {
        btnBack.addEventListener('click', () => {
            PopupManager.closeAll();
            toggleView('library');
        });
    }

    if (btnInsert) {
        btnInsert.addEventListener('click', async() => {
            if (!currentBlockType || !currentConfig) {
                return;
            }

            try {
                const rawHtml = await currentBlockType.renderHtml(currentConfig);
                const excludeKeys = currentBlockType.excludeFromState || [];
                const base64State = StateManager.encode(currentConfig, excludeKeys);

                const tempContainer = document.createElement('div');
                tempContainer.innerHTML = rawHtml.trim();
                const rootElement = tempContainer.firstElementChild;

                if (rootElement) {
                    rootElement.setAttribute('data-slms-block-type', currentBlockType.id);
                    rootElement.setAttribute('data-slms-state', base64State);

                    // A MÁGICA AQUI: Só adiciona o bloqueio (mceNonEditable) se NÃO for a tabela!
                    if (currentBlockType.id !== 'table') {
                        rootElement.classList.add('mceNonEditable');
                    }
                }

                tinyEditorInstance.undoManager.transact(() => {
                    if (targetEditNode) {
                        targetEditNode.replaceWith(rootElement);
                    } else {
                        const finalHtml = rootElement.outerHTML + '<p><br></p>';
                        tinyEditorInstance.insertContent(finalHtml);
                    }
                });

                if (moodleModalInstance) {
                    moodleModalInstance.hide();
                }
            } catch (error) {
                Notification.exception(error);
            }
        });
    }
};

const toggleView = (viewName) => {
    const viewLibrary = document.getElementById('slms-view-library');
    const viewEditor = document.getElementById('slms-view-editor');

    if (!viewLibrary || !viewEditor) {
        return;
    }

    if (viewName === 'library') {
        viewLibrary.classList.remove('d-none');
        viewEditor.classList.add('d-none');
    } else {
        viewLibrary.classList.add('d-none');
        viewEditor.classList.remove('d-none');
    }
};

export const PopupManager = {
    closeAll: () => {
        const anchor = document.getElementById('slms-popup-anchor');
        if (anchor) {
            anchor.innerHTML = '';
            anchor.classList.add('d-none');
        }
    },
    open: async(btnElement, templateName, templateData, setupListeners) => {
        const anchor = document.getElementById('slms-popup-anchor');
        if (!anchor) {
            return;
        }

        PopupManager.closeAll();
        const snapshot = JSON.parse(JSON.stringify(currentConfig));

        try {
            const {html, js} = await Templates.renderForPromise(templateName, templateData);
            const strCancel = await getString('cancel', 'core');
            const strOk = await getString('ok', 'core');

            const footerHtml = `
                <div class="d-flex justify-content-end gap-2 mt-3 pt-3 border-top slms-popup-footer">
                    <button type="button" class="btn btn-sm btn-outline-secondary slms-btn-cancel">${strCancel}</button>
                    <button type="button" class="btn btn-sm btn-primary slms-btn-ok px-3">${strOk}</button>
                </div>
            `;

            Templates.replaceNodeContents(anchor, html, js);

            const footerContainer = document.createElement('div');
            footerContainer.innerHTML = footerHtml;
            anchor.appendChild(footerContainer.firstElementChild);

            anchor.classList.remove('d-none');
            anchor.classList.add('slms-popup-container');

            const btnRect = btnElement.getBoundingClientRect();
            const editorRect = document.getElementById('slms-view-editor').getBoundingClientRect();
            let topPos = (btnRect.bottom - editorRect.top) + 8;
            let leftPos = btnRect.left - editorRect.left;

            if (leftPos + 320 > editorRect.width) {
                leftPos = editorRect.width - 340;
            }

            anchor.style.top = `${topPos}px`;
            anchor.style.left = `${Math.max(10, leftPos)}px`;

            if (setupListeners) {
                setupListeners(anchor);
            }

            anchor.querySelector('.slms-btn-cancel').addEventListener('click', () => {
                Object.keys(currentConfig).forEach((k) => {
                    delete currentConfig[k];
                });
                Object.assign(currentConfig, snapshot);
                updateLivePreview();
                PopupManager.closeAll();
            });

            anchor.querySelector('.slms-btn-ok').addEventListener('click', () => {
                PopupManager.closeAll();
            });

            const outClick = (e) => {
                if (!anchor.contains(e.target) && !btnElement.contains(e.target)) {
                    PopupManager.closeAll();
                    document.removeEventListener('click', outClick);
                }
            };

            setTimeout(() => {
                document.addEventListener('click', outClick);
            }, 50);

        } catch (error) {
            Notification.exception(error);
        }
    }
};

const renderLibrary = () => {
    const grid = document.getElementById('slms-library-grid');
    if (!grid) {
        return;
    }

    grid.innerHTML = '';

    Object.values(Blocks).forEach(async(blockDef) => {
        const card = document.createElement('div');
        card.className = 'slms-card';
        card.tabIndex = 0;
        card.setAttribute('role', 'button');
        grid.appendChild(card);

        try {
            const [translatedTitle, thumbHtml] = await Promise.all([
                getString(blockDef.titleString, 'tiny_studiolms'),
                blockDef.renderHtml(blockDef.defaultData)
            ]);

            card.addEventListener('click', (e) => {
                e.preventDefault();
                openConfigurationPanel(blockDef, translatedTitle);
            });

            card.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    openConfigurationPanel(blockDef, translatedTitle);
                }
            });

            const templateData = {
                title: translatedTitle,
                thumbHtml: thumbHtml
            };

            const html = await Templates.render('tiny_studiolms/library_card', templateData);
            card.innerHTML = html;

        } catch (error) {
            card.innerHTML = '<div class="p-4 text-center text-danger">Erro</div>';
        }
    });
};

const openConfigurationPanel = async(blockDef, translatedTitle, restoredConfig = null) => {
    currentBlockType = blockDef;

    if (restoredConfig) {
        currentConfig = restoredConfig;
    } else {
        currentConfig = JSON.parse(JSON.stringify(blockDef.defaultData));
    }

    const headerTitle = document.getElementById('slms-editor-title');
    const btnBack = document.getElementById('slms-btn-back');
    const btnInsert = document.getElementById('slms-btn-insert');

    if (headerTitle) {
        if (restoredConfig) {
            headerTitle.innerHTML = `<span class="badge bg-warning text-dark me-2" style="font-size: 0.8em;+
             vertical-align: middle;">Modo Edição</span> ${translatedTitle}`;
        } else {
            headerTitle.textContent = translatedTitle;
        }
    }

    if (btnBack) {
        btnBack.style.display = restoredConfig ? 'none' : 'inline-flex';
    }

    // --- MÁGICA UX: Agrupamento de Ações no Header ---
    if (btnInsert) {
        let btnDelete = document.getElementById('slms-btn-delete-block');

        if (restoredConfig && targetEditNode) {
            // 1. Transforma o botão "Inserir" em "Atualizar" (com tom verde)
            btnInsert.innerHTML = '<span aria-hidden="true">💾</span> Atualizar';
            btnInsert.classList.remove('btn-primary');
            btnInsert.classList.add('btn-success');

            // 2. Cria e posiciona o botão "Excluir" ao lado dele
            if (!btnDelete) {
                btnDelete = document.createElement('button');
                btnDelete.id = 'slms-btn-delete-block';
                btnDelete.className = 'btn btn-danger px-3 shadow-sm rounded-pill btn-sm me-2';
                btnDelete.innerHTML = '<span aria-hidden="true">🗑️</span> Excluir';
                btnDelete.onclick = () => {
                    // eslint-disable-next-line no-alert
                    if (confirm('Tem certeza que deseja excluir este bloco do Moodle?')) {
                        tinyEditorInstance.undoManager.transact(() => {
                            targetEditNode.remove();
                        });
                        PopupManager.closeAll();
                        if (moodleModalInstance) {
                            moodleModalInstance.hide();
                        }
                    }
                };
                // Injeta o botão Excluir exatamente antes do botão Atualizar
                btnInsert.parentNode.insertBefore(btnDelete, btnInsert);
            }
            btnDelete.style.display = 'inline-flex';

        } else {
            // Se for Inserção Nova, reseta o botão para o Padrão (Azul)
            btnInsert.innerHTML = '<span aria-hidden="true">🚀</span> Inserir no Moodle';
            btnInsert.classList.remove('btn-success');
            btnInsert.classList.add('btn-primary');

            // Esconde o botão Excluir
            if (btnDelete) {
                btnDelete.style.display = 'none';
            }
        }
    }

    toggleView('editor');

    const toolbarContainer = document.getElementById('slms-top-toolbar');
    if (toolbarContainer) {
        toolbarContainer.innerHTML = '';

        if (blockDef.buildToolbar) {
            await blockDef.buildToolbar(toolbarContainer, currentConfig, (updatedData) => {
                currentConfig = updatedData;
                updateLivePreview();
            }, PopupManager);
        }
    }
    updateLivePreview();
};

const updateLivePreview = async() => {
    const previewContainer = document.getElementById('slms-live-preview');
    if (!previewContainer || !currentBlockType) {
        return;
    }

    try {
        const html = await currentBlockType.renderHtml(currentConfig);
        previewContainer.innerHTML = html;
    } catch (error) {
        previewContainer.innerHTML = '<div class="alert alert-warning">Erro no preview.</div>';
    }
};
