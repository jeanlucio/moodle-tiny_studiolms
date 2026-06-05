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
 * AI Chat tab for StudioLMS Canvas Composer.
 *
 * @module     tiny_studiolms/aichat
 * @copyright  2026 Jean Lúcio <jeanlucio@gmail.com>
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import Ajax from 'core/ajax';
import Templates from 'core/templates';
import {getString} from 'core/str';

const MAX_HISTORY = 30;

/**
 * Initialises the AI chat tab inside the given container element.
 *
 * Renders the tab_ai_chat template, wires up event listeners, and manages
 * conversation history. Two callbacks connect the chat to the canvas:
 *   - onApplyPreset(presetName)      — load an existing preset onto the canvas
 *   - onGenerateTemplate(presetObj)  — receive a generated {name, blocks} object
 *
 * @param {HTMLElement} container  The element to render the chat UI into.
 * @param {boolean}     hasAi      Whether an AI key is configured.
 * @param {Array}       presets    Array of preset objects (each with a .name string).
 * @param {object}      callbacks  {onApplyPreset, onGenerateTemplate}
 * @returns {Promise<void>}
 */
export const init = async(container, hasAi, presets = [], callbacks = {}) => {
    const {html, js} = await Templates.renderForPromise('tiny_studiolms/tab_ai_chat', {
        hasai: hasAi,
    });
    Templates.replaceNodeContents(container, html, js);

    if (!hasAi) {
        return;
    }

    const presetscontext = JSON.stringify(presets.map((p) => p.name));

    let history = [];
    let pendingAction = null;

    const messagesEl = container.querySelector('#slms-chat-messages');
    const inputEl = container.querySelector('#slms-chat-input');
    const sendBtn = container.querySelector('#slms-chat-send');
    const sendSpinner = container.querySelector('#slms-chat-send-spinner');
    const clearBtn = container.querySelector('#slms-chat-clear');
    const descEl = container.querySelector('#slms-chat-desc');
    const actionCard = container.querySelector('#slms-chat-action-card');
    const actionLabel = container.querySelector('#slms-chat-action-label');
    const confirmBtn = container.querySelector('#slms-chat-confirm');
    const cancelBtn = container.querySelector('#slms-chat-cancel');
    const actionSpinner = container.querySelector('#slms-chat-action-spinner');
    const errorEl = container.querySelector('#slms-chat-error');

    const appendMessage = (role, text, provider = null) => {
        const wrapper = document.createElement('div');
        wrapper.className = `slms-chat-message slms-chat-message-${role}`;

        const bubble = document.createElement('div');
        bubble.className = 'slms-chat-bubble';

        const escaped = text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/\n/g, '<br>');
        bubble.innerHTML = escaped;

        wrapper.appendChild(bubble);

        if (role === 'assistant' && provider) {
            const label = document.createElement('span');
            label.className = 'slms-chat-provider';
            label.textContent = provider;
            wrapper.appendChild(label);
        }

        messagesEl.appendChild(wrapper);
        messagesEl.scrollTop = messagesEl.scrollHeight;
    };

    const showError = (msg) => {
        errorEl.textContent = msg;
        errorEl.classList.remove('d-none');
    };

    const hideError = () => {
        errorEl.textContent = '';
        errorEl.classList.add('d-none');
    };

    const hideActionCard = () => {
        pendingAction = null;
        actionCard.classList.add('d-none');
        actionLabel.textContent = '';
    };

    const showActionCard = async(action) => {
        pendingAction = action;
        let labelStr = '';
        if (action.type === 'apply_preset') {
            labelStr = await getString(
                'ai_chat_action_label_apply_preset',
                'tiny_studiolms',
                action.preset_name || ''
            );
        } else if (action.type === 'generate_template') {
            labelStr = await getString('ai_chat_action_label_generate', 'tiny_studiolms');
        }
        actionLabel.textContent = labelStr;
        actionCard.classList.remove('d-none');
    };

    const sendMessage = async() => {
        const text = inputEl.value.trim();
        if (!text) {
            return;
        }

        hideError();
        hideActionCard();
        if (descEl) {
            descEl.classList.add('d-none');
        }
        inputEl.value = '';
        inputEl.disabled = true;
        sendBtn.disabled = true;
        sendBtn.querySelector('i')?.classList.add('d-none');
        sendSpinner.classList.remove('d-none');

        history.push({role: 'user', content: text});
        appendMessage('user', text);

        try {
            const limited = history.slice(-MAX_HISTORY);
            const result = await Ajax.call([{
                methodname: 'tiny_studiolms_chat_message',
                args: {
                    history: limited,
                    presetscontext: presetscontext,
                },
            }])[0];

            history.push({role: 'assistant', content: result.reply});
            appendMessage('assistant', result.reply, result.provider);

            if (result.action) {
                try {
                    const action = JSON.parse(result.action);
                    if (action && action.type) {
                        await showActionCard(action);
                    }
                } catch (parseErr) {
                    window.console.warn('StudioLMS chat: invalid action JSON', parseErr);
                }
            }
        } catch (e) {
            history.pop();
            showError(await getString('ai_chat_error', 'tiny_studiolms'));
        } finally {
            inputEl.disabled = false;
            sendBtn.disabled = false;
            sendBtn.querySelector('i')?.classList.remove('d-none');
            sendSpinner.classList.add('d-none');
            inputEl.focus();
        }
    };

    const executeAction = async() => {
        if (!pendingAction) {
            return;
        }

        const action = pendingAction;
        confirmBtn.disabled = true;
        cancelBtn.disabled = true;
        actionSpinner.classList.remove('d-none');
        hideActionCard();

        try {
            if (action.type === 'apply_preset' && callbacks.onApplyPreset) {
                await callbacks.onApplyPreset(action.preset_name || '');
            } else if (action.type === 'generate_template' && callbacks.onGenerateTemplate) {
                const result = await Ajax.call([{
                    methodname: 'tiny_studiolms_generate_preset',
                    args: {
                        name: action.name || '',
                        contexttext: action.contexttext || '',
                        blocks: action.blocks || '',
                        palette: action.palette || 'blue',
                    },
                }])[0];
                const preset = {
                    name: result.name,
                    blocks: JSON.parse(result.blocks),
                };
                await callbacks.onGenerateTemplate(preset);
            }
        } catch (e) {
            showError(await getString('ai_chat_error', 'tiny_studiolms'));
        } finally {
            confirmBtn.disabled = false;
            cancelBtn.disabled = false;
            actionSpinner.classList.add('d-none');
        }
    };

    sendBtn.addEventListener('click', sendMessage);

    inputEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    clearBtn.addEventListener('click', () => {
        history = [];
        messagesEl.innerHTML = '';
        hideActionCard();
        hideError();
        if (descEl) {
            descEl.classList.remove('d-none');
        }
    });

    confirmBtn.addEventListener('click', executeAction);
    cancelBtn.addEventListener('click', hideActionCard);
};
