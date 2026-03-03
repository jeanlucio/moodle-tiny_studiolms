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

/**
 * Initializes the application inside the modal.
 *
 * @param {object} editor The TinyMCE editor instance.
 * @param {object} modal The Moodle Modal instance.
 */
export const initStudioApp = (editor, modal) => {
    tinyEditorInstance = editor;
    moodleModalInstance = modal;

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
        btnInsert.addEventListener('click', () => {
            if (!currentBlockType || !currentConfig) {
                return;
            }

            currentBlockType.renderHtml(currentConfig).then((finalHtml) => {
                tinyEditorInstance.insertContent(finalHtml);
                if (moodleModalInstance) {
                    moodleModalInstance.hide();
                }
                return true;
            }).catch(Notification.exception); // FIX: Usa o Notification para tratar o erro
        });
    }
};

/**
 * Toggles between Library grid and Editor view.
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
        viewLibrary.style.display = 'block'; // CORRIGIDO: Removido 'flex'
        viewEditor.style.display = 'none';
    } else {
        viewLibrary.style.display = 'none';
        viewEditor.style.display = 'block'; // CORRIGIDO: Removido 'flex'
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

    Object.values(Blocks).forEach((blockDef) => {
        const card = document.createElement('div');
        card.className = 'slms-card';
        card.tabIndex = 0;
        card.setAttribute('role', 'button');

        grid.appendChild(card);

        Promise.all([
            getString(blockDef.titleString, 'tiny_studiolms'),
            blockDef.renderHtml(blockDef.defaultData)
        ]).then(([translatedTitle, thumbHtml]) => {

            card.addEventListener('click', () => openConfigurationPanel(blockDef, translatedTitle));
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

            return Templates.render('tiny_studiolms/library_card', templateData);

        }).then((html) => {
            card.innerHTML = html;
            return true;
        }).catch(() => {
            card.innerHTML = '<div class="p-4 text-center text-danger">Preview Error</div>';
        });
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
const updateLivePreview = () => {
    const previewContainer = document.getElementById('slms-live-preview');
    if (!previewContainer || !currentBlockType) {
        return;
    }

    currentBlockType.renderHtml(currentConfig).then((html) => {
        previewContainer.innerHTML = html;
        return true;
    }).catch(() => {
        previewContainer.innerHTML = '<div class="alert alert-warning">Preview failed.</div>';
    });
};
