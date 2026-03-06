/**
 * Core application logic for StudioLMS with Live Preview and Canva-style Toolbar.
 *
 * @module     tiny_studiolms/app
 * @copyright  2026 Jean Lúcio <jeanlucio@gmail.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import {Blocks} from './blocks';
import {getString} from 'core/str';
import Templates from 'core/templates';
import Notification from 'core/notification';

// State management.
let currentConfig = null;
let currentBlockType = null;
let tinyEditorInstance = null;
let moodleModalInstance = null;
let initialSelectedText = '';
let currentZoom = 1;

/**
 * Initializes the application inside the modal.
 *
 * @param {object} editor The TinyMCE editor instance.
 * @param {object} modal The Moodle Modal instance.
 * @param {string} selectedText Text selected in the editor prior to opening.
 */
export const initStudioApp = (editor, modal, selectedText = '') => {
    tinyEditorInstance = editor;
    moodleModalInstance = modal;
    initialSelectedText = selectedText;
    currentZoom = 1; // Garante que começa a 100%

    setTimeout(() => {
        setupNavigation();
        setupZoomControls(); // Inicializa o Zoom
        renderLibrary();
    }, 100);
};

/**
 * Sets up the Zoom controls for the Canvas area.
 */
const setupZoomControls = () => {
    const btnIn = document.getElementById('slms-zoom-in');
    const btnOut = document.getElementById('slms-zoom-out');
    const lblZoom = document.getElementById('slms-zoom-level');
    const previewPanel = document.getElementById('slms-live-preview');

    // Capturamos a área inteira do Canvas para detetar o scroll
    const canvasArea = document.querySelector('.slms-canvas-area');

    if (!btnIn || !btnOut || !lblZoom || !previewPanel) {
        return;
    }

    const updateZoom = (newZoom) => {
        // Limita o zoom entre 50% e 150%
        currentZoom = Math.max(0.5, Math.min(newZoom, 1.5));
        lblZoom.textContent = `${Math.round(currentZoom * 100)}%`;
        previewPanel.style.transform = `scale(${currentZoom})`;
    };

    btnIn.addEventListener('click', () => updateZoom(currentZoom + 0.1));
    btnOut.addEventListener('click', () => updateZoom(currentZoom - 0.1));

    // Reseta o zoom para 100% ao clicar no número
    lblZoom.addEventListener('click', () => {
        if (currentZoom !== 1) {
            updateZoom(1);
        }
    });
    lblZoom.style.cursor = 'pointer';

    // NOVO: Atalho CTRL + Scroll do Rato (Estilo Canva/Figma)
    if (canvasArea) {
        canvasArea.addEventListener('wheel', (e) => {
            // Verifica se o CTRL (Windows) ou CMD (Mac) está pressionado
            if (e.ctrlKey || e.metaKey) {
                e.preventDefault(); // Impede o zoom nativo da página inteira do navegador

                // e.deltaY > 0 significa scroll para baixo (afastar)
                // Usamos 0.05 para um zoom mais suave e contínuo com a rodinha
                if (e.deltaY > 0) {
                    updateZoom(currentZoom - 0.05);
                } else if (e.deltaY < 0) {
                    updateZoom(currentZoom + 0.05);
                }
            }
        }, {passive: false}); // O passive: false é obrigatório para o preventDefault funcionar no 'wheel'
    }
};

/**
 * Sets up basic navigation buttons (Back, Insert).
 */
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
                const finalHtml = await currentBlockType.renderHtml(currentConfig);
                tinyEditorInstance.insertContent(finalHtml);
                if (moodleModalInstance) {
                    moodleModalInstance.hide();
                }
            } catch (error) {
                Notification.exception(error);
            }
        });
    }
};

/**
 * Toggles between Library grid and Editor view utilizing Bootstrap 5 classes.
 *
 * @param {string} viewName 'library' or 'editor'.
 */
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

/**
 * Global Popup Manager for contextual menus.
 */
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

        // NOVO: Tira um Snapshot do estado atual para o botão Cancelar
        const snapshot = JSON.parse(JSON.stringify(currentConfig));

        try {
            const {html, js} = await Templates.renderForPromise(templateName, templateData);

            // Busca as strings de tradução do Moodle
            const strCancel = await getString('cancel', 'core');
            const strOk = await getString('ok', 'core');

            // Constrói o rodapé com os botões
            const footerHtml = `
                <div class="d-flex justify-content-end gap-2 mt-3 pt-3 border-top slms-popup-footer">
                    <button type="button" class="btn btn-sm btn-outline-secondary slms-btn-cancel">${strCancel}</button>
                    <button type="button" class="btn btn-sm btn-primary slms-btn-ok px-3">${strOk}</button>
                </div>
            `;

            Templates.replaceNodeContents(anchor, html, js);

            // Injeta o rodapé no final do popup
            const footerContainer = document.createElement('div');
            footerContainer.innerHTML = footerHtml;
            anchor.appendChild(footerContainer.firstElementChild);

            anchor.classList.remove('d-none');
            anchor.classList.add('slms-popup-container');

            // Posicionamento do popup
            const btnRect = btnElement.getBoundingClientRect();
            const editorCont = document.getElementById('slms-view-editor');
            const editorRect = editorCont.getBoundingClientRect();

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

            // NOVO: Listeners dos botões OK e Cancelar
            const btnCancel = anchor.querySelector('.slms-btn-cancel');
            const btnOk = anchor.querySelector('.slms-btn-ok');

            btnCancel.addEventListener('click', () => {
                // Limpa o objeto atual e restaura a "fotografia"
                Object.keys(currentConfig).forEach(k => delete currentConfig[k]);
                Object.assign(currentConfig, snapshot);
                updateLivePreview();
                PopupManager.closeAll();
            });

            btnOk.addEventListener('click', () => {
                PopupManager.closeAll(); // Apenas fecha, a edição já foi salva no currentConfig
            });

            // Clique fora do popup agora salva automaticamente (comportamento Canva mantido)
            setTimeout(() => {
                const outsideClickListener = (e) => {
                    if (!anchor.contains(e.target) && !btnElement.contains(e.target)) {
                        PopupManager.closeAll();
                        document.removeEventListener('click', outsideClickListener);
                    }
                };
                document.addEventListener('click', outsideClickListener);
            }, 50);

        } catch (error) {
            Notification.exception(error);
        }
    }
};

/**
 * Renders the library cards with dynamic thumbnails.
 */
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
            card.innerHTML = '';
            const errorNode = document.createElement('div');
            errorNode.className = 'p-4 text-center text-danger';

            try {
                errorNode.textContent = await getString('error_preview', 'tiny_studiolms');
            } catch (strError) {
                errorNode.textContent = await getString('error', 'core');
            }
            card.appendChild(errorNode);
        }
    });
};

/**
 * Opens the specific configuration panel and starts Live Preview.
 *
 * @param {object} blockDef The block definition from Blocks.
 * @param {string} translatedTitle The localized title of the block.
 */
const openConfigurationPanel = (blockDef, translatedTitle) => {
    currentBlockType = blockDef;
    currentConfig = Object.assign({}, blockDef.defaultData);

    if (initialSelectedText !== '') {
        if (typeof currentConfig.btnText !== 'undefined') {
            currentConfig.btnText = initialSelectedText;
        } else if (typeof currentConfig.title !== 'undefined') {
            currentConfig.title = initialSelectedText;
        }
    }

    const headerTitle = document.getElementById('slms-editor-title');
    if (headerTitle) {
        headerTitle.textContent = translatedTitle;
    }

    toggleView('editor');

    const toolbarContainer = document.getElementById('slms-top-toolbar');
    if (toolbarContainer) {
        toolbarContainer.innerHTML = '';

        // NOVO: Renderiza a barra superior contextual do bloco
        if (blockDef.buildToolbar) {
            blockDef.buildToolbar(toolbarContainer, currentConfig, (updatedData) => {
                currentConfig = updatedData;
                updateLivePreview();
            }, PopupManager);
        }
    }

    updateLivePreview();
};

/**
 * Re-renders the block template and injects into the preview box.
 */
const updateLivePreview = async() => {
    const previewContainer = document.getElementById('slms-live-preview');
    if (!previewContainer || !currentBlockType) {
        return;
    }

    try {
        const html = await currentBlockType.renderHtml(currentConfig);
        previewContainer.innerHTML = html;
    } catch (error) {
        previewContainer.innerHTML = '';
        const alertNode = document.createElement('div');
        alertNode.className = 'alert alert-warning';

        try {
            alertNode.textContent = await getString('error_preview_failed', 'tiny_studiolms');
        } catch (strError) {
            alertNode.textContent = await getString('error', 'core');
        }
        previewContainer.appendChild(alertNode);
    }
};
