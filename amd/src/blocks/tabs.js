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
 * Tabs block definition: several panels in the same space, one shown at a time.
 *
 * The block is stored as the panels one after the other, each with its title, and that is what the editor, the Studio
 * and any page where the script does not run show. On the course page the script of the plugin turns the titles into a
 * row of tabs, as the accordion gets its toggle; so nothing is hidden where there is no script.
 *
 * @module     tiny_studiolms/blocks/tabs
 * @copyright  2026 Jean Lúcio
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import Templates from 'core/templates';
import {getString} from 'core/str';
import Notification from 'core/notification';
import {defaultText} from './default_texts';
import {MAX_TABS, MIN_TABS, normalizeAccent, normalizeTabCount} from './tabs_logic';

export default {
    id: 'tabs',
    titleString: 'block_tabs_title',
    icon: '🗂️',
    defaultData: {
        accent: '#0d47a1',
        tabs: [
            {title: '', content: ''},
            {title: '', content: ''},
            {title: '', content: ''},
        ],
    },

    // The titles and the text of the panels are typed on the canvas and read back from it.
    excludeFromState: ['tabs'],

    extractDOM: (node, state) => {
        // Defense in depth: never leave a caller-supplied state.tabs (e.g. a value that survived from an
        // attacker-controlled data-slms-state) in place: what is not in the markup is empty.
        state.tabs = [...node.querySelectorAll('.studiolms-tab-panel')].slice(0, MAX_TABS).map((panel) => ({
            title: panel.querySelector('.slms-tab-title')?.textContent.trim() ?? '',
            content: panel.querySelector('.slms-tab-content')?.innerHTML ?? '',
        }));
    },

    buildToolbar: async(container, data, onUpdate, PopupManager) => {
        try {
            const {html, js} = await Templates.renderForPromise('tiny_studiolms/toolbar_tabs', {});
            Templates.replaceNodeContents(container, html, js);

            const btnDesign = container.querySelector('#tb-tabs-design');
            if (!btnDesign) {
                return;
            }

            btnDesign.addEventListener('click', () => {
                const count = normalizeTabCount(data.tabs?.length);
                const tplData = {accent: normalizeAccent(data.accent)};
                for (let i = MIN_TABS; i <= MAX_TABS; i++) {
                    tplData[`count${i}`] = count === i;
                }

                PopupManager.open(btnDesign, 'tiny_studiolms/popup_tabs_design', tplData, (popup) => {
                    popup.querySelector('#pop_tabs_count')?.addEventListener('input', (ev) => {
                        const wanted = normalizeTabCount(ev.target.value, count);
                        const tabs = Array.isArray(data.tabs) ? data.tabs.slice(0, wanted) : [];
                        while (tabs.length < wanted) {
                            tabs.push({title: defaultText('default_tab_title', tabs.length + 1), content: ''});
                        }
                        data.tabs = tabs;
                        onUpdate(data);
                    });
                    popup.querySelector('#pop_tabs_accent')?.addEventListener('input', (ev) => {
                        data.accent = normalizeAccent(ev.target.value);
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
        const stored = Array.isArray(data.tabs) ? data.tabs : [];
        const count = normalizeTabCount(stored.length);
        const placeholder = await getString('default_tab_text', 'tiny_studiolms');
        const tabs = [];
        for (let i = 0; i < count; i++) {
            const tab = stored[i] ?? {};
            tabs.push({
                title: tab.title && tab.title.trim() !== '' ? tab.title : defaultText('default_tab_title', i + 1),
                content: tab.content && tab.content.trim() !== '' ? tab.content : `<p>${placeholder}</p>`,
            });
        }

        return Templates.render('tiny_studiolms/block_tabs', {
            hoverEffect: data.hoverEffect,
            accent: normalizeAccent(data.accent),
            tabs,
        });
    }
};
