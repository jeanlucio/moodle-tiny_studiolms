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
 * AI Block Generator panel for StudioLMS.
 *
 * Renders the AI tab content and handles prompt submission.
 * The onBlockReady callback receives (blockDef, mergedConfig) so the caller
 * can open the block in the configuration panel for final review before inserting.
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
 * @param {Function}    onBlockReady   Called with (blockDef, mergedConfig) when generation succeeds.
 */
export const init = async(container, hasAi, onBlockReady) => {
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
        if (spinner) {
            spinner.classList.remove('d-none');
        }
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
            if (errorArea) {
                let msg = '';
                try {
                    msg = await getString('ai_generator_error', 'tiny_studiolms');
                } catch (strErr) {
                    msg = 'Error generating block. Please try again.';
                }
                if (err && err.debuginfo) {
                    msg += ' [' + err.debuginfo + ']';
                } else if (err && err.message && err.message !== msg) {
                    msg += ' [' + err.message + ']';
                }
                errorArea.textContent = msg;
            } else {
                Notification.exception(err);
            }
        } finally {
            btnGenerate.disabled = false;
            if (spinner) {
                spinner.classList.add('d-none');
            }
        }
    });
};
