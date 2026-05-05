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
import {loadTemplates, renderTemplateGrid, saveTemplate, showInlineFeedback} from './templateslibrary';
import {init as initAiGenerator} from './aigenerator';
import {init as initAiKeys} from './aikeys';

let currentConfig = null;
let currentBlockType = null;
let tinyEditorInstance = null;
let moodleModalInstance = null;
let currentZoom = 1;
let targetEditNode = null;
let presetsData = [];
let hasAiEnabled = false;

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

export const initStudioApp = (
    editor,
    modal,
    editData = null,
    canManageGlobal = false,
    presets = [],
    hasAi = false
) => {
    tinyEditorInstance = editor;
    moodleModalInstance = modal;
    currentZoom = 1;
    targetEditNode = null;
    presetsData = presets;
    hasAiEnabled = hasAi;

    if (editData && editData.node) {
        targetEditNode = editData.node;
    }

    setTimeout(async() => {
        setupNavigation();
        setupZoomControls();
        setupTabs();
        setupSaveTemplateButton(canManageGlobal);

        if (editData && editData.type && editData.state) {
            const blockDef = Blocks[editData.type];
            if (blockDef) {
                const restoredState = StateManager.decode(editData.state);

                if (restoredState) {
                    const mergedConfig = Object.assign(
                        JSON.parse(JSON.stringify(blockDef.defaultData)),
                        restoredState
                    );

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

            Templates.replaceNodeContents(anchor, html, js);

            const footerContainer = document.createElement('div');
            footerContainer.className = 'd-flex justify-content-end gap-2 mt-3 pt-3 border-top slms-popup-footer';

            const btnCancel = document.createElement('button');
            btnCancel.type = 'button';
            btnCancel.className = 'btn btn-sm btn-outline-secondary slms-btn-cancel';
            btnCancel.textContent = strCancel;

            const btnOk = document.createElement('button');
            btnOk.type = 'button';
            btnOk.className = 'btn btn-sm btn-primary slms-btn-ok px-3';
            btnOk.textContent = strOk;

            footerContainer.appendChild(btnCancel);
            footerContainer.appendChild(btnOk);
            anchor.appendChild(footerContainer);

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

const setupTabs = () => {
    const tabs = document.querySelectorAll('[data-slms-tab]');
    tabs.forEach((btn) => {
        btn.addEventListener('click', () => {
            tabs.forEach((t) => {
                t.classList.remove('active');
                t.setAttribute('aria-selected', 'false');
            });
            btn.classList.add('active');
            btn.setAttribute('aria-selected', 'true');
            switchTab(btn.getAttribute('data-slms-tab'));
        });
    });
};

/**
 * Render a single block into a fully attributed HTML string ready for editor insertion.
 *
 * @param {object} blockDef Block definition from the Blocks registry.
 * @param {object} config   Block configuration object.
 * @returns {Promise<string>}
 */
const renderSingleBlockForInsert = async(blockDef, config) => {
    const rawHtml = await blockDef.renderHtml(config);
    const excludeKeys = blockDef.excludeFromState || [];
    const base64State = StateManager.encode(config, excludeKeys);

    const temp = document.createElement('div');
    temp.innerHTML = rawHtml.trim();
    const root = temp.firstElementChild;

    if (root) {
        root.setAttribute('data-slms-block-type', blockDef.id);
        root.setAttribute('data-slms-state', base64State);
        if (blockDef.id !== 'table') {
            root.classList.add('mceNonEditable');
        }
        return root.outerHTML;
    }
    return rawHtml;
};

/**
 * Render a single preset definition into a flat HTML string with SLMS block attributes.
 *
 * @param {object} preset Preset definition with a blocks array or a raw content string.
 * @returns {Promise<string>}
 */
const renderPresetToHtml = async(preset) => {
    if (preset.content) {
        return preset.content;
    }
    const parts = [];
    for (const block of preset.blocks) {
        const blockDef = Blocks[block.type];
        if (!blockDef) {
            continue;
        }
        const config = Object.assign({}, blockDef.defaultData, block.config ?? {});
        const rawHtml = await blockDef.renderHtml(config);
        const excludeKeys = blockDef.excludeFromState || [];
        const base64State = StateManager.encode(config, excludeKeys);

        const temp = document.createElement('div');
        temp.innerHTML = rawHtml.trim();
        const root = temp.firstElementChild;
        if (root) {
            root.setAttribute('data-slms-block-type', blockDef.id);
            root.setAttribute('data-slms-state', base64State);
            if (blockDef.id !== 'table') {
                root.classList.add('mceNonEditable');
            }
            parts.push(root.outerHTML);
        }
    }
    return parts.join('<p><br></p>');
};

/**
 * Convert raw preset definitions into template-compatible objects for renderTemplateGrid.
 *
 * @param {Array} presets
 * @returns {Promise<Array>}
 */
const renderPresetsAsTemplates = async(presets) => {
    const result = [];
    for (const preset of presets) {
        try {
            const content = await renderPresetToHtml(preset);
            result.push({
                id: null,
                name: preset.name,
                content,
                isglobal: 1,
                ismine: false,
                isfavourite: false,
                isPreset: true,
            });
        } catch (e) {
            window.console.error('StudioLMS: error rendering preset', preset.name, e);
        }
    }
    return result;
};

const switchTab = async(tabName) => {
    const grid = document.getElementById('slms-library-grid');
    const tabToolbar = document.getElementById('slms-tab-toolbar');

    if (tabToolbar) {
        tabToolbar.classList.toggle('d-none', tabName !== 'mine');
    }

    if (tabName === 'components') {
        grid.style.gridTemplateColumns = '';
        renderLibrary();
        return;
    }

    if (!grid) {
        return;
    }

    grid.style.gridTemplateColumns = '';
    grid.innerHTML = '';

    if (tabName === 'ai') {
        await initAiGenerator(grid, hasAiEnabled, {
            onConfigure: async(blockDef, mergedConfig) => {
                const title = await getString(blockDef.titleString, 'tiny_studiolms');
                openConfigurationPanel(blockDef, title, mergedConfig);
            },
            onInsert: async(type, data) => {
                const html = type === 'block'
                    ? await renderSingleBlockForInsert(data.blockDef, data.config)
                    : await renderPresetToHtml(data);
                tinyEditorInstance.undoManager.transact(() => {
                    tinyEditorInstance.insertContent(html + '<p><br></p>');
                });
                if (moodleModalInstance) {
                    moodleModalInstance.hide();
                }
            },
            onSave: async(name, type, data) => {
                const html = type === 'block'
                    ? await renderSingleBlockForInsert(data.blockDef, data.config)
                    : await renderPresetToHtml(data);
                await saveTemplate(name, html, 0);
                showInlineFeedback(await getString('tpl_saved', 'tiny_studiolms'), 'success');
            },
        });
        return;
    }

    if (tabName === 'ai-keys') {
        await initAiKeys(grid);
        return;
    }

    try {
        let templates = [];
        if (tabName === 'global') {
            const [dbTemplates, presetTemplates] = await Promise.all([
                loadTemplates('global'),
                renderPresetsAsTemplates(presetsData),
            ]);
            templates = [...presetTemplates, ...dbTemplates];
        } else {
            templates = await loadTemplates(tabName);
        }
        await renderTemplateGrid(grid, templates, tinyEditorInstance, moodleModalInstance);
    } catch (error) {
        Notification.exception(error);
    }
};

const setupSaveTemplateButton = (canManageGlobal = false) => {
    const btn = document.getElementById('slms-btn-save-template');
    if (!btn) {
        return;
    }

    btn.addEventListener('click', async() => {
        try {
            const stringsToLoad = [
                getString('btn_save_template', 'tiny_studiolms'),
                getString('placeholder_tpl_name', 'tiny_studiolms'),
                getString('ok', 'core'),
                getString('cancel', 'core'),
            ];
            if (canManageGlobal) {
                stringsToLoad.push(getString('mark_as_global', 'tiny_studiolms'));
            }
            const [strTitle, strPlaceholder, strOk, strCancel, strMarkGlobal = ''] =
                await Promise.all(stringsToLoad);

            const anchor = document.getElementById('slms-tab-toolbar');
            if (!anchor) {
                return;
            }

            const existingForm = anchor.querySelector('.slms-save-tpl-form');
            if (existingForm) {
                existingForm.remove();
                return;
            }

            const form = document.createElement('div');
            form.className = 'slms-save-tpl-form d-flex align-items-center gap-2 mt-2';

            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'form-control form-control-sm';
            input.placeholder = strPlaceholder;
            input.setAttribute('aria-label', strTitle);
            input.maxLength = 255;

            const btnOk = document.createElement('button');
            btnOk.type = 'button';
            btnOk.className = 'btn btn-sm btn-primary';
            btnOk.textContent = strOk;

            const btnCancelEl = document.createElement('button');
            btnCancelEl.type = 'button';
            btnCancelEl.className = 'btn btn-sm btn-outline-secondary';
            btnCancelEl.textContent = strCancel;

            form.appendChild(input);
            form.appendChild(btnOk);
            form.appendChild(btnCancelEl);

            let chkGlobal = null;
            if (canManageGlobal) {
                form.classList.add('flex-wrap');

                const chkWrap = document.createElement('div');
                chkWrap.className = 'd-flex align-items-center gap-1 w-100';

                chkGlobal = document.createElement('input');
                chkGlobal.type = 'checkbox';
                chkGlobal.id = 'slms-chk-global';
                chkGlobal.className = 'form-check-input m-0';

                const chkLabel = document.createElement('label');
                chkLabel.htmlFor = 'slms-chk-global';
                chkLabel.className = 'form-check-label small mb-0';
                chkLabel.textContent = strMarkGlobal;

                chkWrap.appendChild(chkGlobal);
                chkWrap.appendChild(chkLabel);
                form.appendChild(chkWrap);
            }

            anchor.appendChild(form);
            input.focus();

            btnCancelEl.addEventListener('click', () => form.remove());

            btnOk.addEventListener('click', async() => {
                const name = input.value.trim();
                if (!name) {
                    return;
                }
                const isglobal = chkGlobal && chkGlobal.checked ? 1 : 0;
                form.remove();
                try {
                    const content = tinyEditorInstance.getContent();
                    await saveTemplate(name, content, isglobal);
                    showInlineFeedback(await getString('tpl_saved', 'tiny_studiolms'), 'success');
                    await switchTab(isglobal ? 'global' : 'mine');
                } catch (saveError) {
                    Notification.exception(saveError);
                }
            });

            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    btnOk.click();
                } else if (e.key === 'Escape') {
                    form.remove();
                }
            });
        } catch (error) {
            Notification.exception(error);
        }
    });
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
            card.remove();
            window.console.error('StudioLMS: Error rendering block library card', error);
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

    const strEditMode = await getString('mode_edit', 'tiny_studiolms');
    const strDelete = await getString('btn_delete', 'tiny_studiolms');
    const strConfirmDel = await getString('confirm_delete', 'tiny_studiolms');
    const strConfirmTitle = await getString('confirm', 'core');
    const strYes = await getString('yes', 'core');
    const strNo = await getString('no', 'core');

    if (headerTitle) {
        headerTitle.textContent = '';
        if (restoredConfig) {
            const badgeSpan = document.createElement('span');
            badgeSpan.className = 'badge bg-warning text-dark me-2 small align-middle';
            badgeSpan.textContent = strEditMode;
            headerTitle.appendChild(badgeSpan);
        }
        headerTitle.appendChild(document.createTextNode(translatedTitle));
    }

    if (btnBack) {
        btnBack.style.display = restoredConfig ? 'none' : 'inline-flex';
    }

    if (btnInsert) {
        const stateInsert = btnInsert.querySelector('.slms-state-insert');
        const stateUpdate = btnInsert.querySelector('.slms-state-update');
        let btnDelete = document.getElementById('slms-btn-delete-block');

        if (restoredConfig && targetEditNode) {
            if (stateInsert) {
                stateInsert.classList.add('d-none');
            }
            if (stateUpdate) {
                stateUpdate.classList.remove('d-none');
            }
            btnInsert.classList.remove('btn-primary');
            btnInsert.classList.add('btn-success');

            if (!btnDelete) {
                btnDelete = document.createElement('button');
                btnDelete.id = 'slms-btn-delete-block';
                btnDelete.className = 'btn btn-danger px-3 shadow-sm rounded-pill btn-sm me-2';

                const delIcon = document.createElement('span');
                delIcon.setAttribute('aria-hidden', 'true');
                delIcon.textContent = '🗑️ ';

                btnDelete.appendChild(delIcon);
                btnDelete.appendChild(document.createTextNode(strDelete));

                btnDelete.onclick = (e) => {
                    e.preventDefault();
                    Notification.confirm(
                        strConfirmTitle,
                        strConfirmDel,
                        strYes,
                        strNo,
                        () => {
                            tinyEditorInstance.undoManager.transact(() => {
                                targetEditNode.remove();
                            });
                            PopupManager.closeAll();
                            if (moodleModalInstance) {
                                moodleModalInstance.hide();
                            }
                        }
                    );
                };
                btnInsert.parentNode.insertBefore(btnDelete, btnInsert);
            }
            btnDelete.style.display = 'inline-flex';
        } else {
            if (stateUpdate) {
                stateUpdate.classList.add('d-none');
            }
            if (stateInsert) {
                stateInsert.classList.remove('d-none');
            }
            btnInsert.classList.remove('btn-success');
            btnInsert.classList.add('btn-primary');

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
        previewContainer.innerHTML = '';
        Notification.exception(error);
    }
};
