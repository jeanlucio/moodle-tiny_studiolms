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
 * Show a brief feedback message inside the modal's designated feedback area.
 *
 * @param {string} message
 * @param {string} type - Bootstrap alert variant: 'success' | 'danger' | 'info'
 */
export const showInlineFeedback = (message, type = 'success') => {
    const area = document.getElementById('slms-feedback-area');
    if (!area) {
        return;
    }
    const alert = document.createElement('div');
    alert.className = `alert alert-${type} py-2 px-3 mb-2 small`;
    alert.textContent = message;
    area.innerHTML = '';
    area.appendChild(alert);
    setTimeout(() => {
        if (area.contains(alert)) {
            alert.remove();
        }
    }, 3000);
};

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
 * @param {number} isglobal - 1 to create an official template (requires manageglobaltemplates capability)
 * @returns {Promise<{id: number}>}
 */
export const saveTemplate = (name, content, isglobal = 0) => {
    return Ajax.call([{
        methodname: 'tiny_studiolms_save_template',
        args: {name, content, isglobal}
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
 * Export a set of templates (by ID) and trigger a browser file download.
 * Passing an empty array exports all templates owned by the current user.
 *
 * @param {number[]} ids - Template IDs to export; [] = all owned.
 * @param {string}   filename - Suggested filename for the downloaded file.
 * @returns {Promise<void>}
 */
export const exportTemplates = async(ids = [], filename = 'studiolms-templates.json') => {
    const templates = await Ajax.call([{
        methodname: 'tiny_studiolms_export_templates',
        args: {ids}
    }])[0];

    const payload = JSON.stringify({
        schema: 'tiny_studiolms_export_v1',
        exported: new Date().toISOString(),
        templates
    }, null, 2);

    const blob = new Blob([payload], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.style.display = 'none';
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
};

/**
 * Read a .json file chosen by the user and import the templates via the web service.
 * Resolves with the array of created template records {id, name}.
 *
 * @returns {Promise<Array<{id: number, name: string}>>}
 */
export const importTemplatesFromFile = () => {
    return new Promise((resolve, reject) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'application/json,.json';
        input.style.display = 'none';
        document.body.appendChild(input);

        input.addEventListener('change', async() => {
            document.body.removeChild(input);
            const file = input.files[0];
            if (!file) {
                resolve([]);
                return;
            }

            try {
                const text = await file.text();
                const parsed = JSON.parse(text);

                // Accept both a bare array and our versioned envelope.
                const items = Array.isArray(parsed) ? parsed : (parsed.templates ?? []);

                if (!Array.isArray(items) || items.length === 0) {
                    reject(new Error('invalid_import_file'));
                    return;
                }

                // Sanitise: keep only expected fields.
                const payload = items.map((t) => ({
                    name:     String(t.name ?? '').substring(0, 255) || 'Imported',
                    content:  String(t.content ?? ''),
                    isglobal: Number(t.isglobal ?? 0) === 1 ? 1 : 0,
                }));

                const created = await Ajax.call([{
                    methodname: 'tiny_studiolms_import_templates',
                    args: {templates: payload}
                }])[0];

                resolve(created);
            } catch (err) {
                reject(err);
            }
        });

        input.addEventListener('cancel', () => {
            document.body.removeChild(input);
            resolve([]);
        });

        input.click();
    });
};

/**
 * Render the template grid inside a container element.
 *
 * @param {HTMLElement} container
 * @param {Array} templates
 * @param {object} editor - TinyMCE editor instance
 * @param {object} modal - Moodle modal instance
 * @param {object} options - Optional callbacks e.g. {onLoadToCanvas}
 */
export const renderTemplateGrid = async(container, templates, editor, modal, options = {}) => {
    container.innerHTML = '';

    if (!templates || templates.length === 0) {
        const msg = await getString('no_templates', 'tiny_studiolms');
        const p = document.createElement('p');
        p.className = 'slms-no-templates text-muted text-center py-4';
        p.textContent = msg;
        container.appendChild(p);
        return;
    }

    const htmlParts = await Promise.all(
        templates.map((tpl) => Templates.render('tiny_studiolms/template_card', tpl))
    );

    for (let i = 0; i < templates.length; i++) {
        const tpl = templates[i];
        try {
            const wrapper = document.createElement('div');
            wrapper.innerHTML = htmlParts[i];
            const card = wrapper.firstElementChild;
            const insertTrigger = card.querySelector('.slms-tpl-insert');

            if (insertTrigger) {
                const handleClick = () => {
                    if (options.onLoadToCanvas) {
                        options.onLoadToCanvas(tpl.content || '', tpl.name || '');
                    } else {
                        handleInsertTemplate(tpl, editor, modal);
                    }
                };

                insertTrigger.addEventListener('click', handleClick);

                insertTrigger.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleClick();
                    }
                });
            }

            const btnFav = card.querySelector('.slms-btn-fav');
            if (btnFav) {
                btnFav.addEventListener('click', async(e) => {
                    e.stopPropagation();
                    await handleToggleFavourite(btnFav, tpl, options.onInvalidateCache);
                });
            }

            const btnDel = card.querySelector('.slms-btn-tpl-delete');
            if (btnDel) {
                btnDel.addEventListener('click', async(e) => {
                    e.stopPropagation();
                    await handleDeleteTemplate(card, tpl, options.onInvalidateCache);
                });
            }

            const chkSelect = card.querySelector('.slms-tpl-select');
            if (chkSelect) {
                chkSelect.addEventListener('change', () => {
                    card.classList.toggle('slms-selected', chkSelect.checked);
                });
                // Prevent checkbox click from bubbling to the insert trigger.
                chkSelect.addEventListener('click', (e) => {
                    e.stopPropagation();
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
        const tplName = (tpl.name || '').trim();
        let contentToInsert = tpl.content;

        if (tplName) {
            const temp = document.createElement('div');
            temp.innerHTML = tpl.content;
            temp.querySelectorAll('[data-slms-block-type]').forEach((el) => {
                el.setAttribute('data-slms-tpl-name', tplName);
            });
            contentToInsert = temp.innerHTML;
        }

        editor.insertContent(contentToInsert);
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
 * @param {Function|undefined} onInvalidateCache
 */
const handleToggleFavourite = async(btnFav, tpl, onInvalidateCache) => {
    try {
        const result = await toggleFavourite(tpl.id);
        const isFav = result.favourited;

        btnFav.classList.toggle('active', isFav);
        btnFav.setAttribute('aria-pressed', String(isFav));
        const icon = btnFav.querySelector('span[aria-hidden]');
        if (icon) {
            icon.textContent = isFav ? '★' : '☆';
        }

        if (onInvalidateCache) {
            onInvalidateCache('favourites', 'mine');
        }

        const msgKey = isFav ? 'fav_added' : 'fav_removed';
        showInlineFeedback(await getString(msgKey, 'tiny_studiolms'), 'info');
    } catch (error) {
        Notification.exception(error);
    }
};

/**
 * Confirm and delete a template, removing its card from the DOM.
 *
 * @param {HTMLElement} card
 * @param {object} tpl
 * @param {Function|undefined} onInvalidateCache
 */
const handleDeleteTemplate = async(card, tpl, onInvalidateCache) => {
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
                if (onInvalidateCache) {
                    onInvalidateCache('mine', 'favourites');
                }
                showInlineFeedback(await getString('tpl_deleted', 'tiny_studiolms'), 'info');
            } catch (error) {
                Notification.exception(error);
            }
        });
    } catch (error) {
        Notification.exception(error);
    }
};
