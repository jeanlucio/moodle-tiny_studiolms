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
 * AI generator panel for StudioLMS (single block + multi-block layout).
 *
 * After generation, both modes show an inline preview area where the user can
 * choose to insert into the editor, configure the block (single-block only),
 * save as a template, or discard the result.
 *
 * @module     tiny_studiolms/aigenerator
 * @copyright  2026 Jean Lúcio <jeanlucio@gmail.com>
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import {call as ajaxCall} from 'core/ajax';
import Templates from 'core/templates';
import {getString} from 'core/str';
import Notification from 'core/notification';
import {Blocks} from './blocks/registry';

/**
 * Renders a bare preview HTML for a single block (no state attributes).
 *
 * @param {object} blockDef     Block definition from the Blocks registry.
 * @param {object} mergedConfig Config object for the block.
 * @returns {Promise<string>}
 */
const renderBlockPreview = async(blockDef, mergedConfig) => {
    return blockDef.renderHtml(mergedConfig);
};

/**
 * Renders a bare preview HTML for a multi-block preset (no state attributes).
 *
 * @param {object} preset Preset object with a blocks array.
 * @returns {Promise<string>}
 */
const renderPresetPreview = async(preset) => {
    const parts = [];
    for (const block of preset.blocks) {
        const blockDef = Blocks[block.type];
        if (!blockDef) {
            continue;
        }
        const config = Object.assign({}, blockDef.defaultData, block.config ?? {});
        try {
            const html = await blockDef.renderHtml(config);
            parts.push(html);
        } catch (e) {
            window.console.error('StudioLMS: preview render error for', block.type, e);
        }
    }
    return parts.join('<p><br></p>');
};

/**
 * Shows the inline preview section with the generated content and action buttons.
 *
 * @param {HTMLElement} container   The AI tab container element.
 * @param {string}      htmlContent Rendered preview HTML (no state attributes).
 * @param {string}      type        'block' or 'preset'.
 * @param {object}      data        The raw generated data passed to callbacks.
 * @param {object}      callbacks   Action callbacks: { onConfigure, onInsert, onSave }.
 */
const showPreview = (container, htmlContent, type, data, callbacks) => {
    const previewSection = container.querySelector('#slms-ai-preview-section');
    const previewContent = container.querySelector('#slms-ai-preview-content');
    const btnConfigure = container.querySelector('#slms-ai-preview-configure');
    const btnDiscard = container.querySelector('#slms-ai-preview-discard');
    const btnInsert = container.querySelector('#slms-ai-preview-insert');
    const btnSave = container.querySelector('#slms-ai-preview-save');
    const saveFormArea = container.querySelector('#slms-ai-preview-save-form');

    if (!previewSection || !previewContent) {
        return;
    }

    previewContent.innerHTML = htmlContent;

    if (btnConfigure) {
        if (type === 'block') {
            btnConfigure.classList.remove('d-none');
        } else {
            btnConfigure.classList.add('d-none');
        }
    }

    previewSection.classList.remove('d-none');
    previewSection.scrollIntoView({behavior: 'smooth', block: 'nearest'});

    const resetSaveForm = () => {
        if (saveFormArea) {
            saveFormArea.innerHTML = '';
            saveFormArea.classList.add('d-none');
        }
    };

    if (btnDiscard) {
        btnDiscard.onclick = () => {
            previewSection.classList.add('d-none');
            resetSaveForm();
        };
    }

    if (btnInsert) {
        btnInsert.onclick = async() => {
            if (callbacks.onInsert) {
                await callbacks.onInsert(type, data);
            }
        };
    }

    if (btnConfigure && type === 'block') {
        btnConfigure.onclick = () => {
            if (callbacks.onConfigure) {
                callbacks.onConfigure(data.blockDef, data.config);
            }
        };
    }

    if (btnSave && saveFormArea) {
        btnSave.onclick = async() => {
            if (!saveFormArea.classList.contains('d-none')) {
                resetSaveForm();
                return;
            }
            try {
                const [strOk, strCancel, strPlaceholder] = await Promise.all([
                    getString('ok', 'core'),
                    getString('cancel', 'core'),
                    getString('placeholder_tpl_name', 'tiny_studiolms'),
                ]);

                const defaultName = (type === 'preset' && data.name) ? data.name : '';
                const form = document.createElement('div');
                form.className = 'd-flex align-items-center flex-wrap gap-2';

                const input = document.createElement('input');
                input.type = 'text';
                input.className = 'form-control form-control-sm';
                input.placeholder = strPlaceholder;
                input.value = defaultName;
                input.maxLength = 255;
                input.setAttribute('aria-label', strPlaceholder);
                input.style.maxWidth = '260px';

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
                saveFormArea.appendChild(form);
                saveFormArea.classList.remove('d-none');
                input.focus();

                if (defaultName) {
                    input.select();
                }

                btnCancelEl.onclick = resetSaveForm;

                btnOk.onclick = async() => {
                    const name = input.value.trim();
                    if (!name) {
                        return;
                    }
                    resetSaveForm();
                    if (callbacks.onSave) {
                        await callbacks.onSave(name, type, data);
                    }
                };

                input.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        btnOk.click();
                    } else if (e.key === 'Escape') {
                        resetSaveForm();
                    }
                });
            } catch (formErr) {
                Notification.exception(formErr);
            }
        };
    }
};

/**
 * Renders the AI tab content or shows a "not configured" message.
 *
 * @param {HTMLElement} container
 * @param {boolean}     hasAi
 * @param {string}      templateName  Mustache template to render.
 * @returns {Promise<boolean>} True if the template was rendered, false if not configured.
 */
const renderAiTab = async(container, hasAi, templateName) => {
    container.innerHTML = '';

    if (!hasAi) {
        const msg = document.createElement('div');
        msg.className = 'p-4 text-center text-muted';
        try {
            msg.textContent = await getString('ai_generator_no_config', 'tiny_studiolms');
        } catch (e) {
            msg.textContent = 'AI generation is not configured.';
        }
        container.appendChild(msg);
        return false;
    }

    try {
        const {html, js} = await Templates.renderForPromise(templateName, {});
        Templates.replaceNodeContents(container, html, js);
    } catch (renderError) {
        Notification.exception(renderError);
        return false;
    }

    return true;
};

/**
 * Initialise the single-block AI generator tab.
 *
 * @param {HTMLElement} container Target DOM element (the library grid).
 * @param {boolean}     hasAi     Whether an AI provider is configured site-wide.
 * @param {object}      callbacks Action callbacks: { onConfigure, onInsert, onSave }.
 */
export const initBlock = async(container, hasAi, callbacks = {}) => {
    const ready = await renderAiTab(container, hasAi, 'tiny_studiolms/tab_ai_block');
    if (ready) {
        setupBlockGenerator(container, callbacks);
    }
};

/**
 * Initialise the multi-block model (layout) AI generator tab.
 *
 * @param {HTMLElement} container Target DOM element (the library grid).
 * @param {boolean}     hasAi     Whether an AI provider is configured site-wide.
 * @param {object}      callbacks Action callbacks: { onInsert, onSave }.
 */
export const initModel = async(container, hasAi, callbacks = {}) => {
    const ready = await renderAiTab(container, hasAi, 'tiny_studiolms/tab_ai_model');
    if (ready) {
        setupPresetGenerator(container, callbacks);
    }
};

/**
 * Wires up the single-block generation form.
 *
 * @param {HTMLElement} container
 * @param {object}      callbacks
 */
const setupBlockGenerator = (container, callbacks) => {
    const textarea = container.querySelector('#slms-ai-prompt');
    const btnGenerate = container.querySelector('#slms-ai-generate');
    const spinner = container.querySelector('#slms-ai-spinner');
    const errorArea = container.querySelector('#slms-ai-error');

    if (!btnGenerate || !textarea) {
        return;
    }

    btnGenerate.addEventListener('click', async() => {
        const prompt = textarea.value.trim();
        if (!prompt) {
            return;
        }

        btnGenerate.disabled = true;
        spinner?.classList.remove('d-none');
        if (errorArea) {
            errorArea.textContent = '';
        }

        try {
            const [promise] = ajaxCall([{
                methodname: 'tiny_studiolms_generate_block',
                args: {prompt},
            }]);
            const result = await promise;

            const blockDef = Blocks[result.blocktype];
            if (!blockDef) {
                throw new Error('Unknown block type returned by AI: ' + result.blocktype);
            }

            let parsedConfig = {};
            try {
                parsedConfig = JSON.parse(result.config || '{}');
            } catch (parseError) {
                parsedConfig = {};
            }

            const mergedConfig = Object.assign(
                JSON.parse(JSON.stringify(blockDef.defaultData)),
                parsedConfig
            );

            const htmlContent = await renderBlockPreview(blockDef, mergedConfig);
            showPreview(container, htmlContent, 'block', {blockDef, config: mergedConfig}, callbacks);
        } catch (err) {
            await showError(errorArea, 'ai_generator_error', err);
        } finally {
            btnGenerate.disabled = false;
            spinner?.classList.add('d-none');
        }
    });
};

/**
 * Wires up the multi-block layout generation form.
 *
 * @param {HTMLElement} container
 * @param {object}      callbacks
 */
const setupPresetGenerator = (container, callbacks) => {
    const inputName = container.querySelector('#slms-ai-preset-name');
    const textareaCtx = container.querySelector('#slms-ai-preset-context');
    const inputBlocks = container.querySelector('#slms-ai-preset-blocks');
    const selectPalette = container.querySelector('#slms-ai-preset-palette');
    const btnGenerate = container.querySelector('#slms-ai-preset-generate');
    const spinner = container.querySelector('#slms-ai-preset-spinner');
    const errorArea = container.querySelector('#slms-ai-preset-error');

    if (!btnGenerate || !textareaCtx) {
        return;
    }

    btnGenerate.addEventListener('click', async() => {
        const contexttext = textareaCtx.value.trim();
        if (!contexttext) {
            return;
        }

        btnGenerate.disabled = true;
        spinner?.classList.remove('d-none');
        if (errorArea) {
            errorArea.textContent = '';
        }

        try {
            const [promise] = ajaxCall([{
                methodname: 'tiny_studiolms_generate_preset',
                args: {
                    name:        (inputName?.value.trim()) || '',
                    contexttext,
                    blocks:      (inputBlocks?.value.trim()) || '',
                    palette:     selectPalette?.value || 'blue',
                },
            }]);
            const result = await promise;

            let parsedBlocks = [];
            try {
                parsedBlocks = JSON.parse(result.blocks || '[]');
            } catch (parseError) {
                parsedBlocks = [];
            }

            if (parsedBlocks.length > 0) {
                const preset = {name: result.name, blocks: parsedBlocks};
                const htmlContent = await renderPresetPreview(preset);
                showPreview(container, htmlContent, 'preset', preset, callbacks);
            }
        } catch (err) {
            await showError(errorArea, 'ai_preset_error', err);
        } finally {
            btnGenerate.disabled = false;
            spinner?.classList.add('d-none');
        }
    });
};

/**
 * Displays a localised error message in the given element.
 *
 * @param {HTMLElement|null} errorArea
 * @param {string}           stringKey Lang string key for the error message.
 * @param {Error|object}     err       Caught error object.
 */
const showError = async(errorArea, stringKey, err) => {
    if (!errorArea) {
        Notification.exception(err);
        return;
    }
    let msg = '';
    try {
        msg = await getString(stringKey, 'tiny_studiolms');
    } catch (strErr) {
        msg = 'Error. Please try again.';
    }
    if (err && err.debuginfo) {
        msg += ' [' + err.debuginfo + ']';
    } else if (err && err.message && err.message !== msg) {
        msg += ' [' + err.message + ']';
    }
    errorArea.textContent = msg;
};
