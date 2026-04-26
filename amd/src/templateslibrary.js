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
 * Template library module: AJAX calls and grid rendering for saved templates.
 *
 * @module     tiny_studiolms/templateslibrary
 * @copyright  2026 Jean Lúcio
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import Ajax from 'core/ajax';
import Templates from 'core/templates';
import Notification from 'core/notification';
import {getString} from 'core/str';

/**
 * Load templates from the server filtered by type.
 *
 * @param {string} type - 'global' | 'mine' | 'favourites'
 * @returns {Promise<Array>}
 */
export const loadTemplates = (type) => {
    return Ajax.call([{
        methodname: 'tiny_studiolms_get_templates',
        args: {type}
    }])[0];
};

/**
 * Save the current editor content as a new template.
 *
 * @param {string} name
 * @param {string} content
 * @returns {Promise<{id: number}>}
 */
export const saveTemplate = (name, content) => {
    return Ajax.call([{
        methodname: 'tiny_studiolms_save_template',
        args: {name, content, isglobal: 0}
    }])[0];
};

/**
 * Delete a template by ID.
 *
 * @param {number} id
 * @returns {Promise<{success: boolean}>}
 */
export const deleteTemplate = (id) => {
    return Ajax.call([{
        methodname: 'tiny_studiolms_delete_template',
        args: {id}
    }])[0];
};

/**
 * Toggle the favourite status of a template.
 *
 * @param {number} templateid
 * @returns {Promise<{favourited: boolean}>}
 */
export const toggleFavourite = (templateid) => {
    return Ajax.call([{
        methodname: 'tiny_studiolms_toggle_favourite',
        args: {templateid}
    }])[0];
};

/**
 * Render the template grid inside a container element.
 *
 * @param {HTMLElement} container
 * @param {Array} templates
 * @param {object} editor - TinyMCE editor instance
 * @param {object} modal - Moodle modal instance
 */
export const renderTemplateGrid = async(container, templates, editor, modal) => {
    container.innerHTML = '';

    if (!templates || templates.length === 0) {
        const msg = await getString('no_templates', 'tiny_studiolms');
        const p = document.createElement('p');
        p.className = 'slms-no-templates text-muted text-center py-4';
        p.textContent = msg;
        container.appendChild(p);
        return;
    }

    for (const tpl of templates) {
        try {
            const html = await Templates.render('tiny_studiolms/template_card', tpl);
            const wrapper = document.createElement('div');
            wrapper.innerHTML = html;
            const card = wrapper.firstElementChild;
            const insertTrigger = card.querySelector('.slms-tpl-insert');

            if (insertTrigger) {
                insertTrigger.addEventListener('click', () => {
                    handleInsertTemplate(tpl, editor, modal);
                });

                insertTrigger.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleInsertTemplate(tpl, editor, modal);
                    }
                });
            }

            const btnFav = card.querySelector('.slms-btn-fav');
            if (btnFav) {
                btnFav.addEventListener('click', async(e) => {
                    e.stopPropagation();
                    await handleToggleFavourite(btnFav, tpl);
                });
            }

            const btnDel = card.querySelector('.slms-btn-tpl-delete');
            if (btnDel) {
                btnDel.addEventListener('click', async(e) => {
                    e.stopPropagation();
                    await handleDeleteTemplate(card, tpl);
                });
            }

            container.appendChild(card);
        } catch (error) {
            window.console.error('StudioLMS: Error rendering template card', error);
        }
    }
};

/**
 * Insert a template's content into the editor and close the modal.
 *
 * @param {object} tpl - Template object with content property
 * @param {object} editor
 * @param {object} modal
 */
const handleInsertTemplate = (tpl, editor, modal) => {
    if (tpl.content) {
        editor.insertContent(tpl.content);
    }
    if (modal) {
        modal.hide();
    }
};

/**
 * Toggle the favourite state of a template and update the button UI.
 *
 * @param {HTMLElement} btnFav
 * @param {object} tpl
 */
const handleToggleFavourite = async(btnFav, tpl) => {
    try {
        const result = await toggleFavourite(tpl.id);
        const isFav = result.favourited;

        btnFav.classList.toggle('active', isFav);
        btnFav.setAttribute('aria-pressed', String(isFav));
        const icon = btnFav.querySelector('span[aria-hidden]');
        if (icon) {
            icon.textContent = isFav ? '★' : '☆';
        }

        const msgKey = isFav ? 'fav_added' : 'fav_removed';
        Notification.addNotification({
            message: await getString(msgKey, 'tiny_studiolms'),
            type: 'info'
        });
    } catch (error) {
        Notification.exception(error);
    }
};

/**
 * Confirm and delete a template, removing its card from the DOM.
 *
 * @param {HTMLElement} card
 * @param {object} tpl
 */
const handleDeleteTemplate = async(card, tpl) => {
    try {
        const [strTitle, strMsg, strYes, strNo] = await Promise.all([
            getString('confirm', 'core'),
            getString('confirm_delete_tpl', 'tiny_studiolms'),
            getString('yes', 'core'),
            getString('no', 'core'),
        ]);

        Notification.confirm(strTitle, strMsg, strYes, strNo, async() => {
            try {
                await deleteTemplate(tpl.id);
                card.remove();
                Notification.addNotification({
                    message: await getString('tpl_deleted', 'tiny_studiolms'),
                    type: 'info'
                });
            } catch (error) {
                Notification.exception(error);
            }
        });
    } catch (error) {
        Notification.exception(error);
    }
};
