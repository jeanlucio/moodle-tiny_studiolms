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
 * AI Keys panel for StudioLMS.
 *
 * Renders the AI Keys tab, loads current key status via AJAX, and handles saving.
 *
 * @module     tiny_studiolms/aikeys
 * @copyright  2026 Jean Lúcio <jeanlucio@gmail.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import {call as ajaxCall} from 'core/ajax';
import Templates from 'core/templates';
import {getString} from 'core/str';
import Notification from 'core/notification';

const STATUS_CLASS_SET = 'bg-success';
const STATUS_CLASS_UNSET = 'bg-secondary';

/**
 * Updates a status badge element to reflect whether the key is configured.
 *
 * @param {HTMLElement} badge      The badge element.
 * @param {boolean}     isSet      Whether the key is configured.
 * @param {string}      strSet     Localised "Configured" string.
 * @param {string}      strNotSet  Localised "Not configured" string.
 */
const setStatusBadge = (badge, isSet, strSet, strNotSet) => {
    if (!badge) {
        return;
    }
    badge.textContent = isSet ? strSet : strNotSet;
    badge.classList.remove(STATUS_CLASS_SET, STATUS_CLASS_UNSET);
    badge.classList.add(isSet ? STATUS_CLASS_SET : STATUS_CLASS_UNSET);
};

/**
 * Updates the status badge and clears the input after a successful save.
 *
 * @param {HTMLInputElement|null} input     The key input element.
 * @param {HTMLElement|null}      badge     The status badge element.
 * @param {string}                strSet    Localised "Configured" string.
 * @param {string}                strNotSet Localised "Not configured" string.
 */
const updateKeyBadge = (input, badge, strSet, strNotSet) => {
    if (!input) {
        return;
    }
    const isSet = input.value !== '';
    setStatusBadge(badge, isSet, strSet, strNotSet);
    if (isSet) {
        input.value = '';
    }
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
    const badgeGemini = container.querySelector('#slms-key-status-gemini');
    const badgeGroq = container.querySelector('#slms-key-status-groq');
    const badgeCustom = container.querySelector('#slms-key-status-custom');
    const btnSave = container.querySelector('#slms-ai-keys-save');
    const spinner = container.querySelector('#slms-ai-keys-spinner');
    const feedback = container.querySelector('#slms-ai-keys-feedback');
    const errorArea = container.querySelector('#slms-ai-keys-error');

    const [strSet, strNotSet] = await Promise.all([
        getString('ai_keys_set', 'tiny_studiolms'),
        getString('ai_keys_not_set', 'tiny_studiolms'),
    ]);

    try {
        const [loadPromise] = ajaxCall([{methodname: 'tiny_studiolms_get_ai_keys', args: {}}]);
        const status = await loadPromise;
        setStatusBadge(badgeGemini, status.has_gemini, strSet, strNotSet);
        setStatusBadge(badgeGroq, status.has_groq, strSet, strNotSet);
        setStatusBadge(badgeCustom, status.has_custom_key, strSet, strNotSet);
        if (inputCustomUrl && status.custom_url) {
            inputCustomUrl.value = status.custom_url;
        }
        if (inputCustomModel && status.custom_model) {
            inputCustomModel.value = status.custom_model;
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

            updateKeyBadge(inputGemini, badgeGemini, strSet, strNotSet);
            updateKeyBadge(inputGroq, badgeGroq, strSet, strNotSet);
            updateKeyBadge(inputCustomKey, badgeCustom, strSet, strNotSet);

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
