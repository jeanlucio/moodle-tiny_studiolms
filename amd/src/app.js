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
 * Core application logic for StudioLMS Canvas Composer.
 *
 * @module     tiny_studiolms/app
 * @copyright  2026 Jean Lúcio <jeanlucio@gmail.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import {Blocks} from './blocks/registry';
import {getString} from 'core/str';
import Templates from 'core/templates';
import Notification from 'core/notification';
import Modal from 'core/modal';
import {loadTemplates, renderTemplateGrid, saveTemplate, showInlineFeedback,
    exportTemplates, importTemplatesFromFile} from './templateslibrary';
import {initBlock as initAiBlock, initModel as initAiModel} from './aigenerator';
import {init as initAiKeys} from './aikeys';
import {init as initAiChat} from './aichat';

// Canvas state — array of {id, blockDef, config, element, previewEl}
let canvasBlocks = [];
let canvasBlockCounter = 0;

let tinyEditorInstance = null;
let moodleModalInstance = null;
let currentZoom = 1;
let targetEditNode = null;
let presetsData = [];
let hasAiEnabled = false;
let tabsListenerAttached = false;

const tabDataCache = new Map();

const invalidateTabCache = (...tabNames) => {
    tabNames.forEach((t) => tabDataCache.delete(t));
};

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

const setInsertButtonAsUpdate = () => {
    const btnInsert = document.getElementById('slms-btn-insert');
    if (!btnInsert) {
        return;
    }
    const stateInsert = btnInsert.querySelector('.slms-state-insert');
    const stateUpdate = btnInsert.querySelector('.slms-state-update');
    if (stateInsert) {
        stateInsert.classList.add('d-none');
    }
    if (stateUpdate) {
        stateUpdate.classList.remove('d-none');
    }
    btnInsert.classList.remove('btn-primary');
    btnInsert.classList.add('btn-success');
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
    canvasBlocks = [];
    canvasBlockCounter = 0;

    if (editData && editData.node) {
        targetEditNode = editData.node;
    }

    setupNavigation(canManageGlobal);
    setupZoomControls();
    setupTabs();
    setupSidebarToggle();
    setupSidebarSearch();
    setupAiKeysButton();
    setupImportExportButtons();

    setTimeout(async() => {
        showCanvasEmptyState();

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

                    await addBlockToCanvas(blockDef, mergedConfig);
                    setInsertButtonAsUpdate();

                    const footerLeft = document.getElementById('slms-footer-left');
                    if (footerLeft && targetEditNode) {
                        const [strDelete, strConfirmDel, strConfirmTitle, strYes, strNo] =
                            await Promise.all([
                                getString('btn_delete', 'tiny_studiolms'),
                                getString('confirm_delete', 'tiny_studiolms'),
                                getString('confirm', 'core'),
                                getString('yes', 'core'),
                                getString('no', 'core'),
                            ]);

                        const btnDelete = document.createElement('button');
                        btnDelete.id = 'slms-btn-delete-block';
                        btnDelete.className = 'btn btn-danger px-3 shadow-sm rounded-pill btn-sm';

                        const delIcon = document.createElement('i');
                        delIcon.className = 'fa-solid fa-trash';
                        delIcon.setAttribute('aria-hidden', 'true');
                        btnDelete.appendChild(delIcon);
                        btnDelete.appendChild(document.createTextNode(' ' + strDelete));

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
                        footerLeft.appendChild(btnDelete);
                    }
                }
            }
        }

        renderLibrary();
    }, 100);
};

// -----------------------------------------
// CANVAS MANAGEMENT
// -----------------------------------------

/**
 * Add a block to the canvas, auto-select it and render its preview.
 *
 * @param {object} blockDef Block definition from the Blocks registry.
 * @param {object|null} config Initial configuration, or null for defaults.
 * @param {boolean} skipScroll Skip scrollIntoView after adding the block.
 * @returns {Promise<void>}
 */
const addBlockToCanvas = async(blockDef, config = null, skipScroll = false) => {
    const blockId = ++canvasBlockCounter;
    const blockConfig = config
        ? JSON.parse(JSON.stringify(config))
        : JSON.parse(JSON.stringify(blockDef.defaultData));

    const entry = {id: blockId, blockDef, config: blockConfig, element: null, previewEl: null};
    canvasBlocks.push(entry);

    const blocksList = document.getElementById('slms-canvas-blocks');

    const emptyState = blocksList.querySelector('.slms-canvas-empty');
    if (emptyState) {
        emptyState.remove();
    }

    const translatedTitle = await getString(blockDef.titleString, 'tiny_studiolms');
    const [strUp, strDown, strRemove] = await Promise.all([
        getString('block_move_up', 'tiny_studiolms'),
        getString('block_move_down', 'tiny_studiolms'),
        getString('block_remove', 'tiny_studiolms'),
    ]);

    const blockEl = document.createElement('div');
    blockEl.className = 'slms-canvas-block';
    blockEl.dataset.canvasBlockId = String(blockId);
    blockEl.setAttribute('role', 'group');
    blockEl.setAttribute('aria-label', translatedTitle);

    const header = document.createElement('div');
    header.className = 'slms-canvas-block-header';

    const titleSpan = document.createElement('span');
    titleSpan.className = 'slms-canvas-block-title';
    titleSpan.textContent = translatedTitle;

    const actions = document.createElement('div');
    actions.className = 'slms-canvas-block-actions';

    const btnUp = document.createElement('button');
    btnUp.type = 'button';
    btnUp.className = 'slms-canvas-block-action-btn slms-btn-block-up';
    btnUp.setAttribute('aria-label', strUp);
    btnUp.title = strUp;
    btnUp.innerHTML = '<i class="fa-solid fa-arrow-up" aria-hidden="true"></i>';

    const btnDown = document.createElement('button');
    btnDown.type = 'button';
    btnDown.className = 'slms-canvas-block-action-btn slms-btn-block-down';
    btnDown.setAttribute('aria-label', strDown);
    btnDown.title = strDown;
    btnDown.innerHTML = '<i class="fa-solid fa-arrow-down" aria-hidden="true"></i>';

    const btnRemove = document.createElement('button');
    btnRemove.type = 'button';
    btnRemove.className = 'slms-canvas-block-action-btn slms-btn-block-remove';
    btnRemove.setAttribute('aria-label', strRemove);
    btnRemove.title = strRemove;
    btnRemove.innerHTML = '<i class="fa-solid fa-xmark" aria-hidden="true"></i>';

    actions.appendChild(btnUp);
    actions.appendChild(btnDown);
    actions.appendChild(btnRemove);
    header.appendChild(titleSpan);
    header.appendChild(actions);

    const previewEl = document.createElement('div');
    previewEl.className = 'slms-canvas-block-preview';

    blockEl.appendChild(header);
    blockEl.appendChild(previewEl);

    entry.element = blockEl;
    entry.previewEl = previewEl;

    // Re-check: the empty state may have been injected by showCanvasEmptyState during
    // the awaits above (getString calls yield the event loop, allowing the async
    // Promise in showCanvasEmptyState to resolve and append the placeholder).
    const raceEmptyState = blocksList.querySelector('.slms-canvas-empty');
    if (raceEmptyState) {
        raceEmptyState.remove();
    }

    blocksList.appendChild(blockEl);

    await renderBlockPreview(entry);

    blockEl.addEventListener('click', (e) => {
        if (e.target.closest('.slms-canvas-block-actions')) {
            return;
        }
        selectCanvasBlock(blockId);
    });

    btnRemove.addEventListener('click', (e) => {
        e.stopPropagation();
        removeCanvasBlock(blockId);
    });

    btnUp.addEventListener('click', (e) => {
        e.stopPropagation();
        moveCanvasBlock(blockId, -1);
    });

    btnDown.addEventListener('click', (e) => {
        e.stopPropagation();
        moveCanvasBlock(blockId, 1);
    });

    selectCanvasBlock(blockId);

    if (!skipScroll) {
        blockEl.scrollIntoView({behavior: 'smooth', block: 'nearest'});
    }
};

/**
 * Render the preview HTML of a canvas block entry.
 *
 * @param {object} entry Canvas block entry.
 * @returns {Promise<void>}
 */
const renderBlockPreview = async(entry) => {
    if (!entry.previewEl) {
        return;
    }
    try {
        const html = await entry.blockDef.renderHtml(entry.config);
        entry.previewEl.innerHTML = html;
    } catch (error) {
        entry.previewEl.innerHTML = '';
        Notification.exception(error);
    }
};

/**
 * Select a canvas block by id, updating the toolbar to that block's controls.
 *
 * @param {number|null} blockId
 * @returns {Promise<void>}
 */
const selectCanvasBlock = async(blockId) => {
    document.querySelectorAll('.slms-canvas-block').forEach((el) => {
        el.classList.remove('slms-active-block');
    });

    PopupManager.closeAll();

    const toolbarContainer = document.getElementById('slms-top-toolbar');
    if (toolbarContainer) {
        toolbarContainer.innerHTML = '';
    }

    if (blockId === null) {
        showToolbarHint();
        return;
    }

    const entry = canvasBlocks.find((b) => b.id === blockId);
    if (!entry) {
        return;
    }

    if (entry.element) {
        entry.element.classList.add('slms-active-block');
    }

    if (toolbarContainer && entry.blockDef.buildToolbar) {
        await entry.blockDef.buildToolbar(
            toolbarContainer,
            entry.config,
            async(updatedData) => {
                entry.config = updatedData;
                await renderBlockPreview(entry);
            },
            PopupManager
        );
    } else {
        showToolbarHint();
    }
};

/**
 * Show the placeholder hint text in the toolbar row.
 */
const showToolbarHint = () => {
    const toolbarContainer = document.getElementById('slms-top-toolbar');
    const hint = document.getElementById('slms-toolbar-hint');
    if (toolbarContainer && !hint) {
        const span = document.createElement('span');
        span.className = 'slms-toolbar-empty-hint';
        span.id = 'slms-toolbar-hint';
        getString('toolbar_select_hint', 'tiny_studiolms').then((str) => {
            span.textContent = str;
            return str;
        }).catch(() => undefined);
        toolbarContainer.appendChild(span);
    }
};

/**
 * Remove a block from the canvas.
 *
 * @param {number} blockId
 */
const removeCanvasBlock = (blockId) => {
    const idx = canvasBlocks.findIndex((b) => b.id === blockId);
    if (idx === -1) {
        return;
    }

    const entry = canvasBlocks[idx];
    if (entry.element) {
        entry.element.remove();
    }
    canvasBlocks.splice(idx, 1);

    if (canvasBlocks.length === 0) {
        showCanvasEmptyState();
        selectCanvasBlock(null);
        return;
    }

    const newActiveIdx = Math.min(idx, canvasBlocks.length - 1);
    selectCanvasBlock(canvasBlocks[newActiveIdx].id);
};

/**
 * Move a canvas block up or down in the list.
 *
 * @param {number} blockId
 * @param {number} direction -1 for up, +1 for down.
 */
const moveCanvasBlock = (blockId, direction) => {
    const idx = canvasBlocks.findIndex((b) => b.id === blockId);
    if (idx === -1) {
        return;
    }

    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= canvasBlocks.length) {
        return;
    }

    [canvasBlocks[idx], canvasBlocks[newIdx]] = [canvasBlocks[newIdx], canvasBlocks[idx]];

    const blocksList = document.getElementById('slms-canvas-blocks');
    canvasBlocks.forEach((b) => blocksList.appendChild(b.element));
};

/**
 * Display the empty canvas placeholder.
 */
const showCanvasEmptyState = () => {
    const blocksList = document.getElementById('slms-canvas-blocks');
    if (!blocksList || blocksList.querySelector('.slms-canvas-empty')) {
        return;
    }

    Promise.all([
        getString('canvas_empty_hint', 'tiny_studiolms'),
    ]).then(([hint]) => {
        const empty = document.createElement('div');
        empty.className = 'slms-canvas-empty';

        const icon = document.createElement('div');
        icon.className = 'slms-canvas-empty-icon';
        icon.setAttribute('aria-hidden', 'true');
        icon.innerHTML = '<i class="fa-solid fa-palette" aria-hidden="true"></i>';

        const text = document.createElement('p');
        text.className = 'slms-canvas-empty-text';
        text.textContent = hint;

        empty.appendChild(icon);
        empty.appendChild(text);
        blocksList.appendChild(empty);
        return empty;
    }).catch(() => undefined);
};

/**
 * Parse template HTML and load each SLMS block into the canvas.
 *
 * @param {string} htmlContent Raw HTML with data-slms-block-type elements.
 * @param {string} tplName Optional template name for display.
 * @returns {Promise<void>}
 */
export const loadTemplateToCanvas = async(htmlContent, tplName = '') => {
    const temp = document.createElement('div');
    temp.innerHTML = htmlContent;

    const blockElements = temp.querySelectorAll('[data-slms-block-type]');

    if (blockElements.length === 0) {
        showInlineFeedback(
            await getString('canvas_no_slms_blocks', 'tiny_studiolms'),
            'warning'
        );
        return;
    }

    const firstNewIdx = canvasBlocks.length;

    for (const el of blockElements) {
        const type = el.getAttribute('data-slms-block-type');
        const state = el.getAttribute('data-slms-state');
        const blockDef = Blocks[type];

        if (!blockDef) {
            continue;
        }

        const blockConfig = JSON.parse(JSON.stringify(blockDef.defaultData));

        if (state) {
            const savedState = StateManager.decode(state);
            if (savedState) {
                Object.assign(blockConfig, savedState);
            }
        }

        if (blockDef.extractDOM) {
            blockDef.extractDOM(el, blockConfig);
        }

        await addBlockToCanvas(blockDef, blockConfig, true);
    }

    if (canvasBlocks[firstNewIdx]) {
        canvasBlocks[firstNewIdx].element.scrollIntoView({behavior: 'smooth', block: 'nearest'});
    }

    if (tplName) {
        showInlineFeedback(tplName, 'info');
    }
};

// -----------------------------------------
// INSERT INTO TINYMCE
// -----------------------------------------

/**
 * Render a single block into a fully attributed HTML string.
 *
 * @param {object} blockDef
 * @param {object} config
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
 * Render a preset definition into flat HTML with SLMS block attributes.
 *
 * @param {object} preset
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
        parts.push(await renderSingleBlockForInsert(blockDef, config));
    }
    return parts.join('<p><br></p>');
};

/**
 * Insert all canvas blocks into the TinyMCE editor and close the modal.
 *
 * @returns {Promise<void>}
 */
const insertCanvasToEditor = async() => {
    if (canvasBlocks.length === 0) {
        return;
    }

    try {
        const parts = [];
        for (const entry of canvasBlocks) {
            parts.push(await renderSingleBlockForInsert(entry.blockDef, entry.config));
        }

        const finalHtml = parts.join('<p><br></p>') + '<p><br></p>';

        tinyEditorInstance.undoManager.transact(() => {
            if (targetEditNode && canvasBlocks.length === 1) {
                const temp = document.createElement('div');
                temp.innerHTML = parts[0];
                const newNode = temp.firstElementChild;
                if (newNode) {
                    targetEditNode.replaceWith(newNode);
                }
            } else {
                tinyEditorInstance.insertContent(finalHtml);
            }
        });

        if (moodleModalInstance) {
            moodleModalInstance.hide();
        }
    } catch (error) {
        Notification.exception(error);
    }
};

// -----------------------------------------
// NAVIGATION & CONTROLS
// -----------------------------------------

const setupNavigation = (canManageGlobal = false) => {
    const btnInsert = document.getElementById('slms-btn-insert');
    if (btnInsert) {
        btnInsert.addEventListener('click', () => {
            insertCanvasToEditor();
        });
    }

    setupSaveTemplateButton(canManageGlobal);
};

const setupSidebarToggle = () => {
    const btn = document.getElementById('slms-sidebar-toggle');
    const sidebar = document.getElementById('slms-sidebar');
    const icon = document.getElementById('slms-sidebar-toggle-icon');

    if (!btn || !sidebar) {
        return;
    }

    btn.addEventListener('click', () => {
        const collapsed = sidebar.classList.toggle('slms-sidebar-collapsed');
        if (icon) {
            icon.classList.toggle('fa-chevron-right', collapsed);
            icon.classList.toggle('fa-chevron-left', !collapsed);
        }
    });
};

const setupZoomControls = () => {
    const btnIn = document.getElementById('slms-zoom-in');
    const btnOut = document.getElementById('slms-zoom-out');
    const lblZoom = document.getElementById('slms-zoom-level');
    const blocksList = document.getElementById('slms-canvas-blocks');
    const canvasArea = document.getElementById('slms-canvas-area');

    if (!btnIn || !btnOut || !lblZoom || !blocksList) {
        return;
    }

    const updateZoom = (newZoom) => {
        currentZoom = Math.max(0.5, Math.min(newZoom, 1.5));
        lblZoom.textContent = `${Math.round(currentZoom * 100)}%`;
        blocksList.style.transform = `scale(${currentZoom})`;
    };

    btnIn.addEventListener('click', () => updateZoom(currentZoom + 0.1));
    btnOut.addEventListener('click', () => updateZoom(currentZoom - 0.1));

    lblZoom.style.cursor = 'pointer';
    lblZoom.addEventListener('click', () => {
        if (currentZoom !== 1) {
            updateZoom(1);
        }
    });

    if (canvasArea) {
        canvasArea.addEventListener('wheel', (e) => {
            if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
                updateZoom(currentZoom + (e.deltaY > 0 ? -0.05 : 0.05));
            }
        }, {passive: false});
    }
};

const setupTabs = () => {
    if (tabsListenerAttached) {
        return;
    }
    tabsListenerAttached = true;

    // Use document-level capture delegation so the listener fires regardless of
    // where in the DOM #studiolms-app ends up (modal attachment point, fullscreen
    // element, etc.) and before any inner handler can stop propagation.
    document.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-slms-tab]');
        if (!btn) {
            return;
        }
        const app = btn.closest('#studiolms-app');
        if (!app) {
            return;
        }
        app.querySelectorAll('[data-slms-tab]').forEach((t) => {
            t.classList.remove('active');
            t.setAttribute('aria-selected', 'false');
        });
        btn.classList.add('active');
        btn.setAttribute('aria-selected', 'true');
        switchTab(btn.getAttribute('data-slms-tab'));
    }, true);
};

// -----------------------------------------
// TABS & LIBRARY
// -----------------------------------------

/**
 * Convert preset definitions into template-compatible objects.
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
    PopupManager.closeAll();

    const grid = document.getElementById('slms-library-grid');
    const tabToolbar = document.getElementById('slms-tab-toolbar');
    const sidebar = document.getElementById('slms-sidebar');

    if (tabToolbar) {
        tabToolbar.classList.toggle('d-none', tabName !== 'mine');
    }

    if (sidebar) {
        sidebar.classList.toggle('slms-tab-mine', tabName === 'mine');
        sidebar.classList.toggle('slms-tab-favourites', tabName === 'favourites');
    }

    if (grid) {
        grid.style.gridTemplateColumns = '';
    }

    if (tabName === 'components') {
        renderLibrary();
        return;
    }

    if (!grid) {
        return;
    }

    grid.innerHTML = '';

    if (tabName === 'ai-block' || tabName === 'ai-model' || tabName === 'ai-chat') {
        grid.style.gridTemplateColumns = '1fr';

        if (tabName === 'ai-chat') {
            await initAiChat(grid, hasAiEnabled, presetsData, {
                onApplyPreset: async(presetName) => {
                    const found = presetsData.find((p) => p.name === presetName);
                    if (found) {
                        const html = await renderPresetToHtml(found);
                        await loadTemplateToCanvas(html, found.name);
                    }
                },
                onGenerateTemplate: async(preset) => {
                    const html = await renderPresetToHtml(preset);
                    await loadTemplateToCanvas(html, preset.name);
                },
            });
            return;
        }

        const aiCallbacks = {
            onConfigure: async(blockDef, mergedConfig) => {
                await addBlockToCanvas(blockDef, mergedConfig);
            },
            onInsert: async(type, data) => {
                if (type === 'block') {
                    await addBlockToCanvas(data.blockDef, data.config);
                } else {
                    const html = await renderPresetToHtml(data);
                    await loadTemplateToCanvas(html);
                }
            },
            onSave: async(name, type, data) => {
                const html = type === 'block'
                    ? await renderSingleBlockForInsert(data.blockDef, data.config)
                    : await renderPresetToHtml(data);
                await saveTemplate(name, html, 0);
                showInlineFeedback(await getString('tpl_saved', 'tiny_studiolms'), 'success');
            },
        };
        if (tabName === 'ai-block') {
            await initAiBlock(grid, hasAiEnabled, aiCallbacks);
        } else {
            await initAiModel(grid, hasAiEnabled, aiCallbacks);
        }
        return;
    }

    try {
        if (!tabDataCache.has(tabName)) {
            if (tabName === 'global') {
                const [dbTemplates, presetTemplates] = await Promise.all([
                    loadTemplates('global'),
                    renderPresetsAsTemplates(presetsData),
                ]);
                tabDataCache.set('global', [...presetTemplates, ...dbTemplates]);
            } else {
                tabDataCache.set(tabName, await loadTemplates(tabName));
            }
        }
        const templates = tabDataCache.get(tabName) ?? [];
        await renderTemplateGrid(grid, templates, tinyEditorInstance, moodleModalInstance, {
            onLoadToCanvas: loadTemplateToCanvas,
            onInvalidateCache: invalidateTabCache,
        });
    } catch (error) {
        Notification.exception(error);
    }
};

const renderLibrary = () => {
    const grid = document.getElementById('slms-library-grid');
    if (!grid) {
        return;
    }

    grid.innerHTML = '';
    grid.style.gridTemplateColumns = '';

    Object.values(Blocks).forEach(async(blockDef) => {
        const card = document.createElement('div');
        card.className = 'slms-card';
        card.tabIndex = 0;
        card.setAttribute('role', 'button');
        grid.appendChild(card);

        try {
            const translatedTitle = await getString(blockDef.titleString, 'tiny_studiolms');
            card.setAttribute('aria-label', translatedTitle);
            card.dataset.slmsLabel = translatedTitle.toLowerCase();

            card.addEventListener('click', (e) => {
                e.preventDefault();
                addBlockToCanvas(blockDef, null);
            });

            card.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    addBlockToCanvas(blockDef, null);
                }
            });

            const thumbWrapper = document.createElement('div');
            thumbWrapper.className = 'slms-card-thumb-wrapper';

            const thumbContent = document.createElement('div');
            thumbContent.className = 'slms-card-thumb-content';

            try {
                thumbContent.innerHTML = await blockDef.renderHtml(blockDef.defaultData);
            } catch (renderErr) {
                const icon = document.createElement('span');
                icon.setAttribute('aria-hidden', 'true');
                icon.innerHTML = blockDef.icon
                    ? `<span aria-hidden="true">${blockDef.icon}</span>`
                    : '<i class="fa-solid fa-cube" aria-hidden="true"></i>';
                thumbContent.appendChild(icon);
            }

            thumbWrapper.appendChild(thumbContent);
            card.appendChild(thumbWrapper);

            const label = document.createElement('div');
            label.className = 'slms-card-thumb-label';
            label.textContent = translatedTitle;
            label.title = translatedTitle;
            card.appendChild(label);

            const searchInput = document.getElementById('slms-sidebar-search');
            if (searchInput && searchInput.value.trim()) {
                const query = searchInput.value.toLowerCase().trim();
                card.style.display = card.dataset.slmsLabel.includes(query) ? '' : 'none';
            }

        } catch (error) {
            card.remove();
            window.console.error('StudioLMS: Error rendering block library card', error);
        }
    });
};

// -----------------------------------------
// SIDEBAR SEARCH
// -----------------------------------------

const setupSidebarSearch = () => {
    const input = document.getElementById('slms-sidebar-search');
    if (!input) {
        return;
    }

    input.addEventListener('input', () => {
        const query = input.value.toLowerCase().trim();
        const activeTabEl = document.querySelector('[data-slms-tab].active');
        const tabName = activeTabEl ? activeTabEl.getAttribute('data-slms-tab') : 'components';

        if (tabName === 'components') {
            document.querySelectorAll('#slms-library-grid .slms-card').forEach((card) => {
                const lbl = (card.dataset.slmsLabel || '').toLowerCase();
                card.style.display = (!query || lbl.includes(query)) ? '' : 'none';
            });
        } else {
            document.querySelectorAll('#slms-library-grid .slms-tpl-card').forEach((card) => {
                const nameEl = card.querySelector('.slms-tpl-name');
                const text = nameEl ? nameEl.textContent.toLowerCase() : '';
                card.style.display = (!query || text.includes(query)) ? '' : 'none';
            });
        }
    });
};

// -----------------------------------------
// SAVE TEMPLATE
// -----------------------------------------

const setupSaveTemplateButton = (canManageGlobal = false) => {
    const btn = document.getElementById('slms-btn-save-template');
    if (!btn) {
        return;
    }

    btn.addEventListener('click', async() => {
        if (canvasBlocks.length === 0) {
            return;
        }

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

            const anchor = document.getElementById('slms-editor-footer');
            if (!anchor) {
                return;
            }

            const existingForm = document.getElementById('slms-save-tpl-form');
            if (existingForm) {
                existingForm.remove();
                return;
            }

            const form = document.createElement('div');
            form.id = 'slms-save-tpl-form';
            form.className = 'slms-save-tpl-form d-flex align-items-center gap-2 px-3 py-2 border-top';

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

            anchor.insertAdjacentElement('beforebegin', form);
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
                    const parts = [];
                    for (const entry of canvasBlocks) {
                        parts.push(await renderSingleBlockForInsert(entry.blockDef, entry.config));
                    }
                    const content = parts.join('<p><br></p>');
                    await saveTemplate(name, content, isglobal);
                    showInlineFeedback(await getString('tpl_saved', 'tiny_studiolms'), 'success');
                    invalidateTabCache(isglobal ? 'global' : 'mine');
                    await switchTab(isglobal ? 'global' : 'mine');
                    const mineTab = document.getElementById('slms-tab-mine');
                    if (mineTab && !isglobal) {
                        document.querySelectorAll('[data-slms-tab]').forEach((t) => {
                            t.classList.remove('active');
                            t.setAttribute('aria-selected', 'false');
                        });
                        mineTab.classList.add('active');
                        mineTab.setAttribute('aria-selected', 'true');
                    }
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

/**
 * Wire up the AI Keys button in the logo bar to open a centred modal.
 */
const setupAiKeysButton = () => {
    const btn = document.getElementById('slms-btn-ai-keys');
    if (!btn) {
        return;
    }
    btn.addEventListener('click', async() => {
        try {
            const titleStr = await getString('tab_ai_keys', 'tiny_studiolms');
            const modal = await Modal.create({
                title: titleStr,
                body: '<div></div>',
                removeOnClose: true,
            });
            const bodyEl = modal.getBody()[0];
            await initAiKeys(bodyEl);
            modal.show();
        } catch (error) {
            Notification.exception(error);
        }
    });
};

/**
 * Wire up the export and import buttons in the "mine" tab toolbar.
 */
const setupImportExportButtons = () => {
    const btnExport = document.getElementById('slms-btn-export');
    const btnImport = document.getElementById('slms-btn-import');

    if (btnExport) {
        btnExport.addEventListener('click', async() => {
            try {
                btnExport.disabled = true;
                const checked = [...document.querySelectorAll('.slms-tpl-select:checked')];
                const ids = checked.map((el) => parseInt(el.dataset.templateid, 10));
                await exportTemplates(ids, 'studiolms-templates.json');
                showInlineFeedback(
                    await getString('export_success', 'tiny_studiolms'),
                    'success'
                );
            } catch (error) {
                Notification.exception(error);
            } finally {
                btnExport.disabled = false;
            }
        });
    }

    if (btnImport) {
        btnImport.addEventListener('click', async() => {
            try {
                btnImport.disabled = true;
                const created = await importTemplatesFromFile();
                if (created.length > 0) {
                    showInlineFeedback(
                        await getString('import_success', 'tiny_studiolms'),
                        'success'
                    );
                    invalidateTabCache('mine');
                    await switchTab('mine');
                }
            } catch (error) {
                const msgKey = error.message === 'invalid_import_file'
                    ? 'import_invalid_file'
                    : null;
                if (msgKey) {
                    showInlineFeedback(
                        await getString(msgKey, 'tiny_studiolms'),
                        'danger'
                    );
                } else {
                    Notification.exception(error);
                }
            } finally {
                btnImport.disabled = false;
            }
        });
    }
};

// -----------------------------------------
// POPUP MANAGER
// -----------------------------------------

export const PopupManager = {
    closeAll: () => {
        const panel = document.getElementById('slms-properties-panel');
        const content = document.getElementById('slms-properties-content');
        const grid = document.getElementById('slms-library-grid');
        const feedback = document.getElementById('slms-feedback-area');
        const tabToolbar = document.getElementById('slms-tab-toolbar');

        document.querySelectorAll('.slms-toolbar-btn.active').forEach(b => b.classList.remove('active'));

        if (panel) {
            panel.classList.add('d-none');
        }
        if (content) {
            content.innerHTML = '';
        }
        if (grid) {
            grid.classList.remove('d-none');
        }
        if (feedback) {
            feedback.classList.remove('d-none');
        }
        if (tabToolbar) {
            const activeTabEl = document.querySelector('[data-slms-tab].active');
            const activeTab = activeTabEl ? activeTabEl.getAttribute('data-slms-tab') : '';
            tabToolbar.classList.toggle('d-none', activeTab !== 'mine');
        }
    },
    open: async(btnElement, templateName, templateData, setupListeners) => {
        const panel = document.getElementById('slms-properties-panel');
        const content = document.getElementById('slms-properties-content');
        const grid = document.getElementById('slms-library-grid');
        const feedback = document.getElementById('slms-feedback-area');
        const tabToolbar = document.getElementById('slms-tab-toolbar');

        if (!panel || !content) {
            return;
        }

        content.innerHTML = '';

        if (grid) {
            grid.classList.add('d-none');
        }
        if (feedback) {
            feedback.classList.add('d-none');
        }
        if (tabToolbar) {
            tabToolbar.classList.add('d-none');
        }

        try {
            const {html, js} = await Templates.renderForPromise(templateName, templateData);
            Templates.replaceNodeContents(content, html, js);
            panel.classList.remove('d-none');

            document.querySelectorAll('.slms-toolbar-btn.active').forEach(b => b.classList.remove('active'));
            if (btnElement) {
                btnElement.classList.add('active');
            }

            if (setupListeners) {
                setupListeners(content);
            }
        } catch (error) {
            Notification.exception(error);
        }
    }
};
