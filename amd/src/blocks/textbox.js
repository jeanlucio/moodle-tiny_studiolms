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
 * Text Box block definition: a place for plain text between the other blocks.
 *
 * A template holds only blocks, so a paragraph typed in the editor between two of them was left out of it. This block
 * is that paragraph: no frame and no colour, just the text, typed on the canvas and formatted afterwards with the
 * tools of the editor.
 *
 * @module     tiny_studiolms/blocks/textbox
 * @copyright  2026 Jean Lúcio
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import Templates from 'core/templates';
import {getString} from 'core/str';
import Notification from 'core/notification';
import {normalizeTextAlign} from './block_align';

export default {
    id: 'textBox',
    titleString: 'block_textbox_title',
    icon: '📝',
    defaultData: {
        textAlign: 'left',
        content: ''
    },

    // The text is excluded from the Base64 state chip.
    excludeFromState: ['content'],

    extractDOM: (node, state) => {
        const contentNode = node.querySelector('.slms-textbox-content');
        // Defense in depth: never leave a caller-supplied state.content (e.g. a value that survived from an
        // attacker-controlled data-slms-state) in place just because this specific markup shape has no matching
        // child: fall back to empty, never to whatever was already there.
        state.content = contentNode ? contentNode.innerHTML : '';
    },

    buildToolbar: async(container, data, onUpdate, PopupManager) => {
        try {
            const {html, js} = await Templates.renderForPromise('tiny_studiolms/toolbar_textbox', {});
            Templates.replaceNodeContents(container, html, js);

            const btnDesign = container.querySelector('#tb-textbox-design');
            if (!btnDesign) {
                return;
            }

            btnDesign.addEventListener('click', () => {
                const align = normalizeTextAlign(data.textAlign);
                const tplData = {
                    alignLeft: align === 'left',
                    alignCenter: align === 'center',
                    alignRight: align === 'right',
                    alignJustify: align === 'justify',
                };

                PopupManager.open(btnDesign, 'tiny_studiolms/popup_textbox_design', tplData, (popup) => {
                    popup.querySelector('#pop_textbox_align')?.addEventListener('input', (ev) => {
                        data.textAlign = normalizeTextAlign(ev.target.value);
                        onUpdate(data);
                    });
                });
            });
        } catch (error) {
            // A genuinely unexpected failure (a template/DOM error, not an anticipated business
            // rule), so it goes through Notification.exception() instead of inline text —
            // reserved for real bugs, not routine validation failures.
            container.innerHTML = '';
            Notification.exception(error);
        }
    },

    renderHtml: async(data) => {
        const templateData = Object.assign({}, data);
        templateData.textAlign = normalizeTextAlign(data.textAlign);

        if (!templateData.content || templateData.content.trim() === '') {
            const defaultText = await getString('default_textbox_text', 'tiny_studiolms');
            templateData.content = `<p>${defaultText}</p>`;
        }

        return Templates.render('tiny_studiolms/block_textbox', templateData);
    }
};
