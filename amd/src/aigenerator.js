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
 * AI generator panel for StudioLMS (single block + multi-block layout).
 *
 * Renders the AI tab content and handles prompt submission for both modes.
 * - onBlockReady(blockDef, mergedConfig): opens the config panel for the generated block.
 * - onPresetReady(preset): inserts the generated multi-block layout into the editor.
 *
 * @module     tiny_studiolms/aigenerator
 * @copyright  2026 Jean Lúcio <jeanlucio@gmail.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import {call as ajaxCall} from 'core/ajax';
import Templates from 'core/templates';
import {getString} from 'core/str';
import Notification from 'core/notification';
import {Blocks} from './blocks/registry';

/**
 * Initialise the AI generator panel inside the given container.
 *
 * @param {HTMLElement} container      Target DOM element (the library grid).
 * @param {boolean}     hasAi          Whether an AI provider is configured site-wide.
 * @param {Function}    onBlockReady   Called with (blockDef, mergedConfig) when single-block generation succeeds.
 * @param {Function}    onPresetReady  Called with ({name, blocks}) when layout generation succeeds.
 */
export const init = async(container, hasAi, onBlockReady, onPresetReady) => {
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
        return;
    }

    try {
        const {html, js} = await Templates.renderForPromise('tiny_studiolms/tab_ai', {});
        Templates.replaceNodeContents(container, html, js);
    } catch (renderError) {
        Notification.exception(renderError);
        return;
    }

    setupBlockGenerator(container, onBlockReady);
    setupPresetGenerator(container, onPresetReady);
};

/**
 * Wires up the single-block generation form.
 *
 * @param {HTMLElement} container
 * @param {Function}    onBlockReady
 */
const setupBlockGenerator = (container, onBlockReady) => {
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

            if (onBlockReady) {
                onBlockReady(blockDef, mergedConfig);
            }
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
 * @param {Function}    onPresetReady
 */
const setupPresetGenerator = (container, onPresetReady) => {
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

            if (onPresetReady && parsedBlocks.length > 0) {
                onPresetReady({name: result.name, blocks: parsedBlocks});
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
