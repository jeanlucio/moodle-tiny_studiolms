/**
 * Core application logic for StudioLMS with Live Preview.
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
let initialSelectedText = ''; // Nova variável de estado

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

    setTimeout(() => {
        setupNavigation();
        renderLibrary();
    }, 100);
};

/**
 * Sets up basic navigation buttons (Back, Insert).
 */
const setupNavigation = () => {
    const btnBack = document.getElementById('slms-btn-back');
    const btnInsert = document.getElementById('slms-btn-insert');

    if (btnBack) {
        btnBack.addEventListener('click', () => {
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

    // CAMINHO INVERSO: Se houver texto selecionado, tenta injetar no campo principal do bloco
    if (initialSelectedText !== '') {
        if (typeof currentConfig.btnText !== 'undefined') {
            currentConfig.btnText = initialSelectedText;
        } else if (typeof currentConfig.title !== 'undefined') {
            currentConfig.title = initialSelectedText;
        }
    }

    const formContainer = document.getElementById('slms-config-form');
    const headerTitle = document.getElementById('slms-editor-title');

    if (headerTitle) {
        headerTitle.textContent = translatedTitle;
    }

    toggleView('editor');

    blockDef.buildConfigForm(formContainer, currentConfig, (updatedData) => {
        currentConfig = updatedData;
        updateLivePreview();
    });

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
