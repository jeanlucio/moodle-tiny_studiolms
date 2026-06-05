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
 * AI Keys panel for StudioLMS.
 *
 * Renders the AI Keys tab, loads current key status via AJAX, and handles saving.
 *
 * @module     tiny_studiolms/aikeys
 * @copyright  2026 Jean Lúcio <jeanlucio@gmail.com>
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import {call as ajaxCall} from 'core/ajax';
import Templates from 'core/templates';
import {getString} from 'core/str';
import Notification from 'core/notification';
import {refreshAiState} from './app';

/**
 * Attaches show/hide handlers to key visibility buttons.
 *
 * @param {HTMLElement} container Parent container with the form.
 */
const initVisibilityToggles = (container) => {
    container.querySelectorAll('.slms-toggle-key').forEach((button) => {
        button.addEventListener('click', () => {
            const targetId = button.getAttribute('data-target');
            if (!targetId) {
                return;
            }

            const input = container.querySelector(`#${targetId}`);
            if (!input) {
                return;
            }

            const isPassword = input.type === 'password';
            input.type = isPassword ? 'text' : 'password';
            button.setAttribute('aria-pressed', isPassword ? 'true' : 'false');
        });
    });
};

/**
 * Initialise the AI Keys panel inside the given container.
 *
 * @param {HTMLElement} container Target DOM element (the library grid).
 */
export const init = async(container) => {
    container.innerHTML = '';

    try {
        const {html, js} = await Templates.renderForPromise('tiny_studiolms/tab_ai_keys', {});
        Templates.replaceNodeContents(container, html, js);
    } catch (renderError) {
        Notification.exception(renderError);
        return;
    }

    const inputGemini = container.querySelector('#slms-key-gemini');
    const inputGroq = container.querySelector('#slms-key-groq');
    const inputCustomKey = container.querySelector('#slms-key-custom');
    const inputCustomUrl = container.querySelector('#slms-key-custom-url');
    const inputCustomModel = container.querySelector('#slms-key-custom-model');
    const btnSave = container.querySelector('#slms-ai-keys-save');
    const spinner = container.querySelector('#slms-ai-keys-spinner');
    const feedback = container.querySelector('#slms-ai-keys-feedback');
    const errorArea = container.querySelector('#slms-ai-keys-error');

    initVisibilityToggles(container);

    try {
        const [loadPromise] = ajaxCall([{methodname: 'tiny_studiolms_get_ai_keys', args: {}}]);
        const status = await loadPromise;

        if (inputGemini) {
            inputGemini.value = status.gemini_key ?? '';
        }
        if (inputGroq) {
            inputGroq.value = status.groq_key ?? '';
        }
        if (inputCustomKey) {
            inputCustomKey.value = status.custom_key ?? '';
        }
        if (inputCustomUrl) {
            inputCustomUrl.value = status.custom_url ?? '';
        }
        if (inputCustomModel) {
            inputCustomModel.value = status.custom_model ?? '';
        }
    } catch (loadError) {
        Notification.exception(loadError);
    }

    if (!btnSave) {
        return;
    }

    btnSave.addEventListener('click', async() => {
        btnSave.disabled = true;
        if (spinner) {
            spinner.classList.remove('d-none');
        }
        if (feedback) {
            feedback.classList.add('d-none');
        }
        if (errorArea) {
            errorArea.textContent = '';
        }

        try {
            /* eslint-disable camelcase */
            const args = {
                gemini_key: inputGemini?.value ?? '',
                groq_key: inputGroq?.value ?? '',
                custom_key: inputCustomKey?.value ?? '',
                custom_url: inputCustomUrl?.value ?? '',
                custom_model: inputCustomModel?.value ?? '',
            };
            /* eslint-enable camelcase */

            const [savePromise] = ajaxCall([{methodname: 'tiny_studiolms_save_ai_keys', args}]);
            await savePromise;

            // Activate AI tabs immediately — no page reload required.
            const hasKeys = !!(
                (inputGemini?.value ?? '').trim() ||
                (inputGroq?.value ?? '').trim() ||
                (inputCustomKey?.value ?? '').trim()
            );
            refreshAiState(hasKeys);

            if (feedback) {
                feedback.classList.remove('d-none');
                setTimeout(() => feedback.classList.add('d-none'), 3000);
            }
        } catch (saveError) {
            if (errorArea) {
                try {
                    errorArea.textContent = await getString('ai_generator_error', 'tiny_studiolms');
                } catch (strErr) {
                    errorArea.textContent = 'Error saving keys. Please try again.';
                }
            } else {
                Notification.exception(saveError);
            }
        } finally {
            btnSave.disabled = false;
            if (spinner) {
                spinner.classList.add('d-none');
            }
        }
    });
};
