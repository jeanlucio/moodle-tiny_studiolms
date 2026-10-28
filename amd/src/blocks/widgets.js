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
 * Widget blocks: the cards of the Widgets tab. Each one only writes the marker of a widget of the StudioLMS widgets
 * filter (filter_studiolms); the filter draws the widget, with the data of the course, when the page is shown.
 *
 * They have the shape of a block so the Studio can add, move and edit them like the others, but they are not in the
 * Blocks registry: they are not components, they are offered in their own tab, and only when the filter is there.
 *
 * @module     tiny_studiolms/blocks/widgets
 * @copyright  2026 Jean Lúcio
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import Templates from 'core/templates';
import {getString} from 'core/str';
import Notification from 'core/notification';
import {
    buildMarker,
    normalizeCurrent,
    normalizeStyle,
    parseCourseMapOptions,
} from './widget_markers';

/**
 * Builds a widget block.
 *
 * @param {string} widget Identifier of the widget in the filter (forumstats, coursemap or quizinfo).
 * @param {string} id Identifier of the block.
 * @param {string} icon Emoji of the card.
 * @param {object} defaultData The options of the widget, with their defaults.
 * @param {Function|null} extractOptions Reads the options back from the marker of a block in the editor.
 * @param {Function|null} openOptions Opens the options popup; null when the widget has none.
 * @returns {object} The block definition.
 */
const makeWidget = (widget, id, icon, defaultData, extractOptions, openOptions) => ({
    id,
    widgetId: widget,
    titleString: `block_widget_${widget}_title`,
    icon,
    defaultData,

    extractDOM: (node, state) => {
        const marker = node.querySelector('.slms-widget-marker');
        if (extractOptions) {
            Object.assign(state, extractOptions(marker ? marker.textContent : ''));
        }
    },

    buildToolbar: async(container, data, onUpdate, PopupManager) => {
        try {
            const {html, js} = await Templates.renderForPromise('tiny_studiolms/toolbar_widget', {
                hasOptions: openOptions !== null,
                note: await getString(`widget_${widget}_note`, 'tiny_studiolms'),
            });
            Templates.replaceNodeContents(container, html, js);

            const btnOptions = container.querySelector('#tb-widget-options');
            if (btnOptions && openOptions) {
                btnOptions.addEventListener('click', () => openOptions(btnOptions, data, onUpdate, PopupManager));
            }
        } catch (error) {
            container.innerHTML = '';
            Notification.exception(error);
        }
    },

    renderHtml: async(data) => Templates.render('tiny_studiolms/block_widget', {
        widget,
        marker: buildMarker(widget, data),
    }),
});

/**
 * Opens the popup with the two options of the course map.
 *
 * @param {HTMLElement} button The button that opened it.
 * @param {object} data The block data, changed in place.
 * @param {Function} onUpdate Redraws the block from the data.
 * @param {object} PopupManager The popup manager of the Studio.
 */
const openCourseMapOptions = (button, data, onUpdate, PopupManager) => {
    const current = normalizeCurrent(data.current);
    const style = normalizeStyle(data.style);
    PopupManager.open(button, 'tiny_studiolms/popup_widget_coursemap', {
        currentDate: current === 'date',
        currentProgress: current === 'progress',
        styleAuto: style === 'auto',
        styleSteps: style === 'steps',
        styleTiles: style === 'tiles',
    }, (popup) => {
        popup.querySelector('#pop_widget_current')?.addEventListener('input', (ev) => {
            data.current = normalizeCurrent(ev.target.value);
            onUpdate(data);
        });
        popup.querySelector('#pop_widget_style')?.addEventListener('input', (ev) => {
            data.style = normalizeStyle(ev.target.value);
            onUpdate(data);
        });
    });
};

export const Widgets = {
    widgetForumStats: makeWidget('forumstats', 'widgetForumStats', '📊', {}, null, null),
    widgetCourseMap: makeWidget(
        'coursemap',
        'widgetCourseMap',
        '🧭',
        {current: 'date', style: 'auto'},
        parseCourseMapOptions,
        openCourseMapOptions
    ),
    widgetQuizInfo: makeWidget('quizinfo', 'widgetQuizInfo', '✅', {}, null, null),
};
