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
 * Core application logic for StudioLMS Canvas Composer.
 *
 * @module     tiny_studiolms/app
 * @copyright  2026 Jean Lúcio
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import {Blocks, localizeBlockDefaults} from './blocks/registry';
import {INVALID_IMPORT_FILE} from './template_import';
import {getString} from 'core/str';
import Templates from 'core/templates';
import Notification from 'core/notification';
import {loadTemplates, renderTemplateGrid, saveTemplate, showInlineFeedback,
    exportTemplates, importTemplatesFromFile} from './templateslibrary';
import {initBlock as initAiBlock, initModel as initAiModel} from './aigenerator';
import {init as initAiChat} from './aichat';
import {setContextId} from './context';
import {sanitizeUntrustedHtml, sanitizeUrlFields} from './htmlsanitizer';
import {mergeAiConfig} from './ai_config_types';

// Canvas state — array of {id, blockDef, config, element, previewEl}
let canvasBlocks = [];
let canvasBlockCounter = 0;

let tinyEditorInstance = null;
let moodleModalInstance = null;
let currentZoom = 1;
let targetEditNode = null;
let presetsData = [];
let aiState = {available: false, keysUrl: ''};
let tabsListenerAttached = false;

const tabDataCache = new Map();

const invalidateTabCache = (...tabNames) => {
    tabNames.forEach((t) => tabDataCache.delete(t));
};

/**
 * Save a template and drop the cached list of the tab it belongs to.
 *
 * Every caller that writes a template goes through here, so a tab already opened in this session
 * never keeps showing a list from before the save.
 *
 * @param {string} name Template name.
 * @param {string} content Template HTML.
 * @param {number} isglobal 1 for an official template, 0 for a personal one.
 */
const saveTemplateAndRefresh = async(name, content, isglobal) => {
    await saveTemplate(name, content, isglobal);
    invalidateTabCache(isglobal ? 'global' : 'mine');
};

/**
 * Strip HTML markup from a string. Fields that are not excluded via excludeFromState are meant to
 * hold plain values only (colors, enums, emoji, short text) — the rich HTML fields are re-read
 * from the sanitized TinyMCE DOM via extractDOM instead. Any markup surviving in a plain field is
 * either stale data or an attacker-controlled payload, so it is always removed.
 *
 * A regex like /<[^>]*>/g only strips tags that are actually closed with '>' — an unclosed tag
 * such as '<img src=x onerror=...' (no trailing '>') passes straight through unmodified. DOMParser
 * builds an inert document (see loadTemplateToCanvas below for the same property) and reading
 * textContent back discards every element node regardless of how malformed its markup is.
 *
 * The result is plain text, not HTML-safe text: textContent decodes entities, so '&lt;b&gt;' comes
 * back as the characters '<b>'. That is correct for these fields, which every block renders escaped
 * ({{value}} or its own esc()), but the output must never be placed in a raw HTML sink as is.
 *
 * @param {string} value
 * @returns {string}
 */
const stripHtmlMarkup = (value) => new DOMParser().parseFromString(value, 'text/html').body.textContent || '';

/**
 * Coerce a single decoded value to the type of the block's own default value for that key.
 * A value whose type does not match the default falls back to the default, and any string is
 * stripped of HTML markup.
 *
 * @param {*} value Value decoded from the base64 state.
 * @param {*} sample Corresponding value from the block's defaultData.
 * @returns {*} Sanitized value.
 */
const sanitizeStateValue = (value, sample) => {
    if (typeof sample === 'string') {
        return typeof value === 'string' ? stripHtmlMarkup(value) : sample;
    }
    if (typeof sample === 'number') {
        return typeof value === 'number' && Number.isFinite(value) ? value : sample;
    }
    if (typeof sample === 'boolean') {
        return typeof value === 'boolean' ? value : sample;
    }
    if (Array.isArray(sample)) {
        if (!Array.isArray(value)) {
            return sample;
        }
        const itemSample = sample[0];
        if (itemSample && typeof itemSample === 'object') {
            return value.map((item) => sanitizeStateObject(item, itemSample));
        }
        return value.filter((item) => typeof item === typeof itemSample);
    }
    if (sample && typeof sample === 'object') {
        return sanitizeStateObject(value, sample);
    }
    return sample;
};

/**
 * Rebuild an object using only the keys the block declares in its reference object, sanitizing
 * each value against the matching default. This is what keeps an attacker-controlled
 * data-slms-state attribute from injecting arbitrary keys/markup into a block's config.
 *
 * @param {*} decoded Raw decoded object (or sub-object), possibly attacker-controlled.
 * @param {object} sample Reference object (block defaultData, or a nested default item).
 * @returns {object} Sanitized object with exactly the keys of sample.
 */
const sanitizeStateObject = (decoded, sample) => {
    const source = decoded && typeof decoded === 'object' ? decoded : {};
    const result = {};
    Object.keys(sample).forEach((key) => {
        result[key] = Object.prototype.hasOwnProperty.call(source, key)
            ? sanitizeStateValue(source[key], sample[key])
            : sample[key];
    });
    return result;
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
    },
    /**
     * Decode a base64 state and sanitize it against the block's own defaultData schema. Always
     * use this (never decode() directly) when the state comes from DOM content that Moodle did
     * not just generate itself — e.g. content restored from an editor node, or from an imported
     * template — since that HTML can be attacker-controlled and data-slms-state is not covered by
     * TinyMCE's own HTML filter.
     *
     * @param {string} base64
     * @param {object} blockDef Block definition from the Blocks registry.
     * @returns {object|null} Sanitized state, safe to merge into the block config, or null.
     */
    restore: (base64, blockDef) => {
        const decoded = StateManager.decode(base64);
        if (!decoded || !blockDef) {
            return null;
        }
        const sanitized = sanitizeStateObject(decoded, blockDef.defaultData || {});

        // Rich HTML fields (contentHtml, content, text, ...) are declared in excludeFromState
        // specifically so they are never carried inside data-slms-state — they are meant to be
        // re-read from the live, TinyMCE-filtered DOM via the block's own extractDOM instead.
        // sanitizeStateObject() above has no way to know that distinction: defaultData still
        // declares these keys (so their type can be validated), so it happily copies whatever
        // string the attacker put there, only weakly filtered by stripHtmlMarkup(). Force them
        // back to their default here so a block whose extractDOM finds no matching DOM child
        // (a silent no-op, see e.g. callout.js) cannot fall back to an attacker-controlled value.
        const defaultData = blockDef.defaultData || {};
        (blockDef.excludeFromState || []).forEach((key) => {
            if (Object.prototype.hasOwnProperty.call(sanitized, key)) {
                sanitized[key] = defaultData[key];
            }
        });

        return sanitized;
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
    hasAi = false,
    contextId = 0,
    aiKeysUrl = ''
) => {
    tinyEditorInstance = editor;
    moodleModalInstance = modal;
    currentZoom = 1;
    targetEditNode = null;
    presetsData = presets;
    setContextId(contextId);
    aiState = {available: hasAi, keysUrl: aiKeysUrl};
    canvasBlocks = [];
    canvasBlockCounter = 0;
    gridInsertTarget = null;

    if (editData && editData.node) {
        targetEditNode = editData.node;
    }

    setupNavigation(canManageGlobal);
    setupZoomControls();
    setupGridTargeting();
    setupSidebarSplit();
    setupTabs();
    setupSidebarToggle();
    setupSidebarSearch();
    setupImportExportButtons();

    setTimeout(async() => {
        // The blocks' example texts are translated strings: they must be in place before a block is
        // added, drawn as a library thumbnail or filled in from its defaults.
        await localizeBlockDefaults();
        showCanvasEmptyState();

        if (editData && editData.type && editData.state) {
            const blockDef = Blocks[editData.type];
            if (blockDef) {
                const restoredState = StateManager.restore(editData.state, blockDef);

                if (restoredState) {
                    const mergedConfig = Object.assign(
                        JSON.parse(JSON.stringify(blockDef.defaultData)),
                        restoredState
                    );

                    if (blockDef.extractDOM && targetEditNode) {
                        // Deliberately read from the live node, unsanitized, unlike loadTemplateToCanvas.
                        // It is not filtered (Moodle's editor keeps on* attributes on <p>/<i>), but any
                        // handler there already ran inside the editor iframe, same origin, before this
                        // point, so copying it here gives an attacker nothing new. Sanitizing would
                        // instead strip the teacher's own <iframe>/<style> content (an embedded video in
                        // a callout, say), and Update would then write the block back without it.
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
                        footerLeft.prepend(btnDelete);
                    }
                }
            }
        }

        renderLibrary();
    }, 100);
};

// -----------------------------------------
// SIDEBAR SPLIT (block properties / component list)
// -----------------------------------------

/** Where the author's choice of split is remembered between sessions. */
const SPLIT_STORAGE_KEY = 'tiny_studiolms.sidebarSplit';
/** Both areas shown; properties only (component list hidden); component list only (properties hidden). */
const SPLIT_BOTH = 'both';
const SPLIT_PROPERTIES = 'properties';
const SPLIT_LIST = 'list';

/** @type {string} The current split. */
let sidebarSplit = SPLIT_BOTH;

/** @type {object|null} Button labels, loaded once by setupSidebarSplit(). */
let splitLabels = null;

/**
 * Read the split saved by a previous session; any failure of the storage means "both".
 *
 * @returns {string}
 */
const readStoredSplit = () => {
    try {
        const stored = window.localStorage.getItem(SPLIT_STORAGE_KEY);
        return [SPLIT_PROPERTIES, SPLIT_LIST].includes(stored) ? stored : SPLIT_BOTH;
    } catch (error) {
        return SPLIT_BOTH;
    }
};

/**
 * Show the split on the sidebar and on the two buttons.
 *
 * The arrows move the bar between the areas: up hides the properties, down hides the component list,
 * and from either end the opposite arrow comes back to the middle. The arrow with nowhere left to go is
 * only marked as disabled, never removed, so keyboard focus stays on it.
 */
const renderSidebarSplit = () => {
    const sidebar = document.getElementById('slms-sidebar');
    const up = document.getElementById('slms-split-up');
    const down = document.getElementById('slms-split-down');
    if (!sidebar || !up || !down || !splitLabels) {
        return;
    }
    sidebar.classList.toggle('slms-split-properties', sidebarSplit === SPLIT_PROPERTIES);
    sidebar.classList.toggle('slms-split-list', sidebarSplit === SPLIT_LIST);

    const upLabel = sidebarSplit === SPLIT_PROPERTIES ? splitLabels.showLibrary : splitLabels.hideProperties;
    const downLabel = sidebarSplit === SPLIT_LIST ? splitLabels.showProperties : splitLabels.hideLibrary;
    up.setAttribute('aria-label', upLabel);
    up.setAttribute('title', upLabel);
    down.setAttribute('aria-label', downLabel);
    down.setAttribute('title', downLabel);
    up.setAttribute('aria-disabled', sidebarSplit === SPLIT_LIST ? 'true' : 'false');
    down.setAttribute('aria-disabled', sidebarSplit === SPLIT_PROPERTIES ? 'true' : 'false');
};

/**
 * Change the split.
 *
 * @param {string} split One of the SPLIT_* values.
 * @param {boolean} remember Save it for the next session.
 */
const setSidebarSplit = (split, remember = true) => {
    sidebarSplit = split;
    renderSidebarSplit();
    if (!remember) {
        return;
    }
    try {
        window.localStorage.setItem(SPLIT_STORAGE_KEY, split);
    } catch (error) {
        // Not remembered; the split is simply "both" the next time the composer opens.
    }
};

/**
 * Wire the two arrows of the bar above the component list.
 *
 * @returns {Promise<void>}
 */
const setupSidebarSplit = async() => {
    const up = document.getElementById('slms-split-up');
    const down = document.getElementById('slms-split-down');
    if (!up || !down) {
        return;
    }
    const [hideProperties, hideLibrary, showProperties, showLibrary] = await Promise.all([
        getString('split_hide_properties', 'tiny_studiolms'),
        getString('split_hide_library', 'tiny_studiolms'),
        getString('split_show_properties', 'tiny_studiolms'),
        getString('split_show_library', 'tiny_studiolms'),
    ]);
    splitLabels = {hideProperties, hideLibrary, showProperties, showLibrary};

    up.addEventListener('click', () => {
        if (sidebarSplit === SPLIT_BOTH) {
            setSidebarSplit(SPLIT_LIST);
        } else if (sidebarSplit === SPLIT_PROPERTIES) {
            setSidebarSplit(SPLIT_BOTH);
        }
    });
    down.addEventListener('click', () => {
        if (sidebarSplit === SPLIT_BOTH) {
            setSidebarSplit(SPLIT_PROPERTIES);
        } else if (sidebarSplit === SPLIT_LIST) {
            setSidebarSplit(SPLIT_BOTH);
        }
    });

    setSidebarSplit(readStoredSplit(), false);
};

// -----------------------------------------
// GRID COLUMN TARGET
// -----------------------------------------

/**
 * Columns of a grid block's own preview. The direct-child path keeps the columns of anything nested
 * in a column out of the list.
 */
const GRID_SLOT_SELECTOR = ':scope > .studiolms-grid-wrap > .studiolms-grid-content > .slms-grid-slot';

/** A column that only holds the editor's empty-paragraph placeholder counts as empty. */
const EMPTY_SLOT_PATTERN = /^\s*<p>(?:\s|&nbsp;|<br[^>]*>)*<\/p>\s*$/i;

/**
 * The grid column that receives the next block picked from the library, or null when blocks are
 * added to the end of the canvas as usual.
 *
 * @type {{blockId: number, slot: number}|null}
 */
let gridInsertTarget = null;

/**
 * Get the columns of a grid canvas entry.
 *
 * @param {object} entry Canvas entry of a gridcards block.
 * @returns {Element[]}
 */
const getGridSlots = (entry) => (entry.previewEl ? Array.from(entry.previewEl.querySelectorAll(GRID_SLOT_SELECTOR)) : []);

/**
 * Remove the "next blocks go here" highlight from every column.
 */
const unmarkGridSlots = () => {
    document.querySelectorAll('.slms-grid-slot.slms-slot-target').forEach((slot) => {
        slot.classList.remove('slms-slot-target');
        slot.removeAttribute('data-slms-target-label');
        slot.setAttribute('aria-pressed', 'false');
    });
};

/**
 * Forget the chosen column, so the next block goes to the end of the canvas again.
 */
const clearGridTarget = () => {
    gridInsertTarget = null;
    unmarkGridSlots();
};

/**
 * Highlight the chosen column. Run after every re-render of the grid preview, which rebuilds its columns.
 *
 * @returns {Promise<void>}
 */
const markGridTarget = async() => {
    unmarkGridSlots();
    if (!gridInsertTarget) {
        return;
    }
    const entry = canvasBlocks.find((b) => b.id === gridInsertTarget.blockId);
    const slot = entry ? getGridSlots(entry)[gridInsertTarget.slot] : null;
    if (!slot) {
        // The grid was removed or lost that column (fewer columns now).
        gridInsertTarget = null;
        return;
    }
    slot.classList.add('slms-slot-target');
    slot.setAttribute('aria-pressed', 'true');
    slot.setAttribute('data-slms-target-label', await getString('grid_slot_target', 'tiny_studiolms'));
};

/**
 * Make the columns of a grid preview reachable by keyboard and by screen reader, then restore the highlight.
 *
 * @param {object} entry Canvas entry of a gridcards block.
 * @returns {Promise<void>}
 */
const decorateGridSlots = async(entry) => {
    await Promise.all(getGridSlots(entry).map(async(slot, index) => {
        slot.setAttribute('role', 'button');
        slot.setAttribute('tabindex', '0');
        slot.setAttribute('aria-pressed', 'false');
        slot.setAttribute('aria-label', await getString('grid_slot_aria', 'tiny_studiolms', index + 1));
    }));
    await markGridTarget();
};

/**
 * Put a new block, with its default settings, at the end of a grid column.
 *
 * The block lands in the grid's slot HTML, so inside the modal it is static: to change it later,
 * select it in the editor and open StudioLMS.
 *
 * @param {object} gridEntry Canvas entry of the gridcards block.
 * @param {number} slotIndex Zero-based column.
 * @param {object} blockDef Definition of the block to add.
 * @returns {Promise<void>}
 */
const addBlockIntoGridSlot = async(gridEntry, slotIndex, blockDef) => {
    if (blockDef.id === 'gridcards') {
        // The grid's DOM reader (extractDOM) takes every .slms-grid-slot below the grid, so a grid nested
        // in a column would be read as extra columns of the outer one the next time the block is edited.
        showInlineFeedback(await getString('grid_nested_unsupported', 'tiny_studiolms'), 'warning');
        return;
    }
    const nestedConfig = sanitizeUrlFields(JSON.parse(JSON.stringify(blockDef.defaultData)));
    const html = await renderSingleBlockForInsert(blockDef, nestedConfig);
    const slots = Array.isArray(gridEntry.config.slots) ? gridEntry.config.slots : [];
    const current = slots[slotIndex] && !EMPTY_SLOT_PATTERN.test(slots[slotIndex]) ? slots[slotIndex] : '';
    slots[slotIndex] = current + html;
    gridEntry.config.slots = slots;
    await renderBlockPreview(gridEntry);
    showInlineFeedback(await getString('grid_block_added', 'tiny_studiolms', slotIndex + 1), 'success');
};

/**
 * Add the block picked in the component library: into the chosen grid column when there is one,
 * otherwise at the end of the canvas.
 *
 * @param {object} blockDef Block definition from the Blocks registry.
 * @returns {Promise<void>}
 */
const addBlockFromLibrary = async(blockDef) => {
    const gridEntry = gridInsertTarget ? canvasBlocks.find((b) => b.id === gridInsertTarget.blockId) : null;
    if (gridEntry) {
        await addBlockIntoGridSlot(gridEntry, gridInsertTarget.slot, blockDef);
        return;
    }
    await addBlockToCanvas(blockDef, null);
};

/**
 * Let the author choose a grid column in the canvas: a click (or Enter / Space) on a column makes it
 * the place for the next blocks picked in the library; the same column again, or anywhere else in
 * the canvas, undoes the choice.
 */
const setupGridTargeting = () => {
    const canvasArea = document.getElementById('slms-canvas-area');
    if (!canvasArea) {
        return;
    }

    const ownSlot = (target) => {
        const slot = target.closest ? target.closest('.slms-grid-slot') : null;
        const preview = slot ? slot.closest('.slms-canvas-block-preview') : null;
        const entry = preview ? canvasBlocks.find((b) => b.previewEl === preview) : null;
        const index = entry ? getGridSlots(entry).indexOf(slot) : -1;
        return index >= 0 ? {entry, index} : null;
    };

    const choose = (hit) => {
        const isChosen = gridInsertTarget
            && gridInsertTarget.blockId === hit.entry.id
            && gridInsertTarget.slot === hit.index;
        if (isChosen) {
            clearGridTarget();
            return;
        }
        gridInsertTarget = {blockId: hit.entry.id, slot: hit.index};
        markGridTarget();
    };

    canvasArea.addEventListener('click', (event) => {
        const hit = ownSlot(event.target);
        if (hit) {
            choose(hit);
        } else {
            clearGridTarget();
        }
    });

    canvasArea.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') {
            return;
        }
        const hit = event.target.classList && event.target.classList.contains('slms-grid-slot')
            ? ownSlot(event.target)
            : null;
        if (hit) {
            event.preventDefault();
            choose(hit);
        }
    });
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
    // Every canvas entry passes here (template, re-edit, preset, AI insert), so URL and target
    // fields are validated once for all of them; see sanitizeUrlFields() for why HTML
    // sanitization alone does not cover them.
    const blockConfig = sanitizeUrlFields(config
        ? JSON.parse(JSON.stringify(config))
        : JSON.parse(JSON.stringify(blockDef.defaultData)));

    const entry = {id: blockId, blockDef, config: blockConfig, element: null, previewEl: null};
    canvasBlocks.push(entry);
    updateClearCanvasButton();

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
        // Clicking a block means "edit this": bring the properties back if they were hidden. A click on a
        // grid column only picks where the next blocks go, so it leaves the split alone.
        if (sidebarSplit === SPLIT_LIST && !e.target.closest('.slms-grid-slot')) {
            setSidebarSplit(SPLIT_BOTH);
        }
        // Selecting rebuilds the whole toolbar and re-opens its first panel. Doing that for a block
        // that is already active threw away the tab the author was on, so every extra click on the
        // block made the properties panel flicker and jump back to the first tab. The panel being open is
        // part of the condition: switching to a template tab closes it while the block stays active,
        // and a click on the block must then bring it back.
        const propertiesPanel = document.getElementById('slms-properties-panel');
        const propertiesOpen = propertiesPanel && !propertiesPanel.classList.contains('d-none');
        if (blockEl.classList.contains('slms-active-block') && propertiesOpen) {
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
        // The preview is display-only (pointer-events: none in styles.css), but that does not stop
        // Tab + Enter from reaching a link or button inside it. tabindex="-1" closes that path while
        // keeping the content readable by screen readers, which inert would hide.
        entry.previewEl.querySelectorAll('a[href], button, input, select, textarea, iframe, [tabindex]')
            .forEach((el) => el.setAttribute('tabindex', '-1'));
        if (entry.blockDef.id === 'gridcards') {
            // After the tabindex pass above, which would otherwise take the columns out of the tab order.
            await decorateGridSlots(entry);
        }
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
    if (gridInsertTarget && gridInsertTarget.blockId !== blockId) {
        clearGridTarget();
    }

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
        const firstBtn = toolbarContainer.querySelector('.slms-toolbar-btn');
        if (firstBtn) {
            firstBtn.click();
        }
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
 * Show the "Clear canvas" button only while the canvas holds two or more blocks; with one block the
 * block's own remove button already does the job.
 */
const updateClearCanvasButton = () => {
    document.getElementById('slms-btn-clear-canvas')?.classList.toggle('d-none', canvasBlocks.length < 2);
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
    updateClearCanvasButton();
    if (gridInsertTarget && gridInsertTarget.blockId === blockId) {
        clearGridTarget();
    }

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
    // HtmlContent is arbitrary stored template HTML — never trusted markup (see
    // StateManager.restore() above for the same concern on a single block's own state).
    // DOMParser builds a separate, inert document: unlike assigning to a live div's innerHTML,
    // it never fetches images or fires event handlers, so reading attributes off it here cannot
    // execute a payload crafted into the template.
    const parsed = new DOMParser().parseFromString(htmlContent, 'text/html');
    const blockElements = parsed.body.querySelectorAll('[data-slms-block-type]');

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
            const savedState = StateManager.restore(state, blockDef);
            if (savedState) {
                Object.assign(blockConfig, savedState);
            }
        }

        if (blockDef.extractDOM) {
            // The extractDOM implementations render what they read into the preview, so the node
            // must be filtered first. el comes from parsing raw stored template HTML, which can
            // reach storage via a direct save_template/import_templates call that never went
            // through the editor at all, so a payload in it has not run anywhere yet. (The re-edit
            // path in initStudioApp differs on purpose; see the comment there.)
            // sanitizeUntrustedHtml() strips script-executing constructs (on* attributes,
            // <script>/<iframe>/etc., non-web URL schemes) while keeping this plugin's own
            // data-slms-* attributes and ordinary formatting intact. TinyMCE's own
            // serializer.serialize() is deliberately not used here: Moodle initializes the editor
            // with xss_sanitization:false and a p[*]/i[*] wildcard schema, so the serializer keeps
            // event handler attributes on those two tags rather than stripping them (see
            // htmlsanitizer.js for the full explanation).
            const sanitizedHtml = sanitizeUntrustedHtml(el.outerHTML);
            const sanitizedEl = new DOMParser().parseFromString(sanitizedHtml, 'text/html')
                .body.firstElementChild;
            if (sanitizedEl) {
                blockDef.extractDOM(sanitizedEl, blockConfig);
            }
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
        const config = mergeAiConfig(blockDef.defaultData, block.config);
        try {
            parts.push(await renderSingleBlockForInsert(blockDef, config));
        } catch (e) {
            // One block that cannot be drawn must not take the whole layout down with it.
            window.console.error('StudioLMS: render error for', block.type, e);
        }
    }
    return parts.join('');
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

        // Blocks go in back to back: an empty paragraph between them only added a blank line. The
        // caret can still be placed between two non-editable blocks (TinyMCE's block caret), and the
        // single paragraph at the end gives the author somewhere to keep typing after the last one.
        const finalHtml = `${parts.join('')}<p><br></p>`;

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
    setupClearCanvasButton();
};

/** Where the author's sidebar width is remembered between sessions. */
const SIDEBAR_WIDTH_STORAGE_KEY = 'tiny_studiolms.sidebarWidth';
/** Narrowest the sidebar may be dragged; matches the min-width in styles.css. */
const SIDEBAR_MIN_WIDTH = 240;
/** Widest the sidebar may be dragged, as a share of the composer width. */
const SIDEBAR_MAX_SHARE = 0.6;
/** Pixels the pointer must travel before a press on the handle counts as a drag, not a click. */
const SIDEBAR_DRAG_THRESHOLD = 4;
/** Pixels moved by each arrow key press. */
const SIDEBAR_KEY_STEP = 24;
/** Same breakpoint as the drawer layout in styles.css, where the sidebar overlays the canvas. */
const SIDEBAR_DRAWER_QUERY = '(max-width: 767.98px)';

/**
 * Read the sidebar width saved by a previous session.
 *
 * Storage can be blocked (private windows, site data cleared), so any failure just means "no saved width".
 *
 * @returns {number|null}
 */
const readStoredSidebarWidth = () => {
    try {
        const stored = parseInt(window.localStorage.getItem(SIDEBAR_WIDTH_STORAGE_KEY), 10);
        return Number.isFinite(stored) && stored >= SIDEBAR_MIN_WIDTH ? stored : null;
    } catch (error) {
        return null;
    }
};

/**
 * Remember the sidebar width for the next session; silently skipped when storage is unavailable.
 *
 * @param {number} width
 */
const storeSidebarWidth = (width) => {
    try {
        window.localStorage.setItem(SIDEBAR_WIDTH_STORAGE_KEY, String(Math.round(width)));
    } catch (error) {
        // The width simply falls back to the default the next time the composer opens.
    }
};

/**
 * Wire the divider between the sidebar and the canvas: a click collapses or expands the sidebar,
 * dragging it (or the left/right arrow keys) resizes the sidebar.
 */
const setupSidebarToggle = () => {
    const btn = document.getElementById('slms-sidebar-toggle');
    const sidebar = document.getElementById('slms-sidebar');
    const icon = document.getElementById('slms-sidebar-toggle-icon');
    const layout = sidebar ? sidebar.closest('.slms-composer-layout') : null;

    if (!btn || !sidebar || !layout) {
        return;
    }

    const isDrawer = () => window.matchMedia(SIDEBAR_DRAWER_QUERY).matches;
    const isCollapsed = () => sidebar.classList.contains('slms-sidebar-collapsed');
    // The sidebar sits on the inline-start side, so dragging towards the end widens it in LTR only.
    const direction = () => (window.getComputedStyle(layout).direction === 'rtl' ? -1 : 1);

    const applyWidth = (width) => {
        const max = Math.max(SIDEBAR_MIN_WIDTH, Math.floor(layout.clientWidth * SIDEBAR_MAX_SHARE));
        const clamped = Math.min(Math.max(Math.round(width), SIDEBAR_MIN_WIDTH), max);
        layout.style.setProperty('--slms-sidebar-w', `${clamped}px`);
        return clamped;
    };

    // The width the sidebar is heading for. Its rendered width trails this while the flex-basis
    // transition runs, so stepping from the rendered width made quick key presses land on odd values.
    const currentWidth = () => {
        const target = parseFloat(layout.style.getPropertyValue('--slms-sidebar-w'));
        return Number.isFinite(target) ? target : sidebar.getBoundingClientRect().width;
    };

    // Not clamped to the composer width here: the modal may not be laid out yet, and the max-width in
    // styles.css already keeps an oversized saved value in bounds.
    const savedWidth = readStoredSidebarWidth();
    if (savedWidth !== null) {
        layout.style.setProperty('--slms-sidebar-w', `${savedWidth}px`);
    }

    let drag = null;
    // A drag ends with a click on the same element; it must not also collapse the sidebar.
    let dragEnded = false;

    btn.addEventListener('pointerdown', (event) => {
        dragEnded = false;
        if (event.button !== 0 || isDrawer() || isCollapsed()) {
            return;
        }
        drag = {
            pointerId: event.pointerId,
            startX: event.clientX,
            startWidth: currentWidth(),
            moved: false,
        };
        btn.setPointerCapture(event.pointerId);
    });

    btn.addEventListener('pointermove', (event) => {
        if (!drag || event.pointerId !== drag.pointerId) {
            return;
        }
        const delta = (event.clientX - drag.startX) * direction();
        if (!drag.moved && Math.abs(delta) < SIDEBAR_DRAG_THRESHOLD) {
            return;
        }
        if (!drag.moved) {
            drag.moved = true;
            // Switches the width transition off for the duration of the drag, or the sidebar trails the pointer.
            layout.classList.add('slms-resizing');
        }
        applyWidth(drag.startWidth + delta);
    });

    const endDrag = (event) => {
        if (!drag || event.pointerId !== drag.pointerId) {
            return;
        }
        const moved = drag.moved;
        drag = null;
        layout.classList.remove('slms-resizing');
        if (moved) {
            dragEnded = true;
            storeSidebarWidth(currentWidth());
        }
    };
    btn.addEventListener('pointerup', endDrag);
    btn.addEventListener('pointercancel', endDrag);

    btn.addEventListener('keydown', (event) => {
        dragEnded = false;
        if ((event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') || isDrawer() || isCollapsed()) {
            return;
        }
        event.preventDefault();
        const towardsEnd = event.key === 'ArrowRight' ? 1 : -1;
        storeSidebarWidth(applyWidth(currentWidth() + towardsEnd * direction() * SIDEBAR_KEY_STEP));
    });

    btn.addEventListener('click', () => {
        if (dragEnded) {
            dragEnded = false;
            return;
        }
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
        if (!btn.closest('#studiolms-app')) {
            return;
        }
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

/**
 * Mark one tab as the active one, and every other as not.
 *
 * The search, the properties panel and the screen reader all find the current tab through this mark, so it
 * is set here, the single place every tab change goes through, and not by each caller.
 *
 * @param {string} tabName Value of the tab's data-slms-tab attribute.
 */
const markActiveTab = (tabName) => {
    document.querySelectorAll('#studiolms-app [data-slms-tab]').forEach((tab) => {
        const isActive = tab.getAttribute('data-slms-tab') === tabName;
        tab.classList.toggle('active', isActive);
        tab.setAttribute('aria-selected', String(isActive));
    });
};

const switchTab = async(tabName) => {
    markActiveTab(tabName);
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
            await initAiChat(grid, aiState, presetsData, {
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
                await saveTemplateAndRefresh(name, html, 0);
                showInlineFeedback(await getString('tpl_saved', 'tiny_studiolms'), 'success');
            },
        };
        if (tabName === 'ai-block') {
            await initAiBlock(grid, aiState, aiCallbacks);
        } else {
            await initAiModel(grid, aiState, aiCallbacks);
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
            // Stable, language-independent hook for automated tests (Behat) — aria-label is
            // translated and cannot be used to target a specific block type reliably.
            card.dataset.slmsBlockId = blockDef.id;

            card.addEventListener('click', (e) => {
                e.preventDefault();
                addBlockFromLibrary(blockDef);
            });

            card.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    addBlockFromLibrary(blockDef);
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

// -----------------------------------------
// CLEAR CANVAS
// -----------------------------------------

/**
 * Wire the "Clear canvas" button: after a confirmation it empties the canvas. Only the draft is
 * affected; the content already in the editor is changed by Insert/Update, never by this button.
 */
const setupClearCanvasButton = () => {
    const btn = document.getElementById('slms-btn-clear-canvas');
    if (!btn) {
        return;
    }

    btn.addEventListener('click', async() => {
        const total = canvasBlocks.length;
        const [title, message, yes, no] = await Promise.all([
            getString('btn_clear_canvas', 'tiny_studiolms'),
            getString('confirm_clear_canvas', 'tiny_studiolms', total),
            getString('yes', 'core'),
            getString('no', 'core'),
        ]);

        Notification.confirm(title, message, yes, no, () => {
            canvasBlocks.forEach((entry) => entry.element?.remove());
            canvasBlocks = [];
            clearGridTarget();
            updateClearCanvasButton();
            showCanvasEmptyState();
            selectCanvasBlock(null);
        });
    });
};

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
                    const content = parts.join('');
                    await saveTemplateAndRefresh(name, content, isglobal);
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
                    invalidateTabCache('mine', 'global');
                    await switchTab('mine');
                }
            } catch (error) {
                const msgKey = error.message === INVALID_IMPORT_FILE
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
        const heading = document.getElementById('slms-library-heading');
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
        if (heading) {
            heading.classList.add('d-none');
        }
        // Nothing to split once no block's settings are open.
        const sidebar = document.getElementById('slms-sidebar');
        if (sidebar) {
            sidebar.classList.remove('slms-split-on');
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
        const heading = document.getElementById('slms-library-heading');
        const tabToolbar = document.getElementById('slms-tab-toolbar');

        if (!panel || !content) {
            return;
        }

        content.innerHTML = '';

        // The component list stays under the block's settings, so the author can edit one block and
        // add the next without going back through the tab. That only holds for the components tab:
        // on the template tabs the list below would be templates, not blocks to add.
        const activeTab = document.querySelector('[data-slms-tab].active');
        const showLibrary = !activeTab || activeTab.getAttribute('data-slms-tab') === 'components';
        if (grid) {
            grid.classList.toggle('d-none', !showLibrary);
        }
        if (heading) {
            heading.classList.toggle('d-none', !showLibrary);
        }
        // The split only applies while the bar is there: on the template tabs the list is hidden and
        // the properties must never be hidden with it.
        const sidebar = document.getElementById('slms-sidebar');
        if (sidebar) {
            sidebar.classList.toggle('slms-split-on', showLibrary);
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
