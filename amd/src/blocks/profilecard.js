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
 * Profile Card block definition.
 *
 * @module     tiny_studiolms/blocks/profilecard
 * @copyright  2026 Jean Lúcio <jeanlucio@gmail.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import Templates from 'core/templates';
import {getString} from 'core/str';

export default {
    id: 'profileCard',
    titleString: 'block_profilecard_title',
    icon: '👤',
    defaultData: {
        photoUrl:   '',
        name:       '',
        role:       '',
        bio:        '',
        link0label: '',
        link0url:   '',
        link1label: '',
        link1url:   '',
        link2label: '',
        link2url:   '',
        bgColor:    '#ffffff',
        accentColor: '#0f6cbf',
    },

    buildToolbar: async(container, data, onUpdate, PopupManager) => {
        try {
            const {html, js} = await Templates.renderForPromise('tiny_studiolms/toolbar_profilecard', {});
            Templates.replaceNodeContents(container, html, js);

            const btnContent = container.querySelector('#tb-profilecard-content');

            if (btnContent) {
                btnContent.addEventListener('click', () => {
                    PopupManager.open(btnContent, 'tiny_studiolms/popup_profilecard_content',
                        Object.assign({}, data), (popup) => {
                        const textFields = {
                            '#pop_pc_photo':      'photoUrl',
                            '#pop_pc_name':       'name',
                            '#pop_pc_role':       'role',
                            '#pop_pc_bio':        'bio',
                            '#pop_pc_link0label': 'link0label',
                            '#pop_pc_link0url':   'link0url',
                            '#pop_pc_link1label': 'link1label',
                            '#pop_pc_link1url':   'link1url',
                            '#pop_pc_link2label': 'link2label',
                            '#pop_pc_link2url':   'link2url',
                        };

                        Object.keys(textFields).forEach(selector => {
                            const el = popup.querySelector(selector);
                            if (el) {
                                el.addEventListener('input', ev => {
                                    data[textFields[selector]] = ev.target.value;
                                    onUpdate(data);
                                });
                            }
                        });

                        ['#pop_pc_bg', '#pop_pc_accent'].forEach(selector => {
                            const el = popup.querySelector(selector);
                            if (el) {
                                el.addEventListener('input', ev => {
                                    const prop = selector === '#pop_pc_bg' ? 'bgColor' : 'accentColor';
                                    data[prop] = ev.target.value;
                                    onUpdate(data);
                                });
                            }
                        });
                    });
                });
            }
        } catch (error) {
            container.innerHTML = '';
            const errorNode = document.createElement('div');
            errorNode.className = 'text-danger small';
            try {
                errorNode.textContent = await getString('error_loading_form', 'tiny_studiolms');
            } catch (innerError) {
                errorNode.textContent = 'Error';
            }
            container.appendChild(errorNode);
        }
    },

    renderHtml: async(data) => {
        const nameDefault = await getString('default_profilecard_name', 'tiny_studiolms');

        const links = [0, 1, 2]
            .filter(i => (data['link' + i + 'url'] || '').trim()
                      && (data['link' + i + 'label'] || '').trim())
            .map(i => ({
                label: data['link' + i + 'label'],
                url:   data['link' + i + 'url'],
            }));

        const tData = {
            photoUrl:   (data.photoUrl || '').trim(),
            hasPhoto:   (data.photoUrl || '').trim() !== '',
            name:       (data.name || '').trim() || nameDefault,
            role:       (data.role || '').trim(),
            bio:        (data.bio || '').trim(),
            hasLinks:   links.length > 0,
            links,
            bgColor:    data.bgColor || '#ffffff',
            accentColor: data.accentColor || '#0f6cbf',
        };

        return Templates.render('tiny_studiolms/block_profilecard', tData);
    },
};
