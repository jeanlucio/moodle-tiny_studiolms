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
 * AI Logs panel for StudioLMS.
 *
 * Renders the AI activity log modal content and populates it via AJAX.
 *
 * @module     tiny_studiolms/ailogs
 * @copyright  2026 Jean Lúcio <jeanlucio@gmail.com>
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import {call as ajaxCall} from 'core/ajax';
import Templates from 'core/templates';
import Notification from 'core/notification';

/**
 * Initialise the AI Logs panel inside the given container.
 *
 * @param {HTMLElement} container Target DOM element (modal body).
 */
export const init = async(container) => {
    container.innerHTML = '';

    try {
        const {html, js} = await Templates.renderForPromise('tiny_studiolms/tab_ai_logs', {});
        Templates.replaceNodeContents(container, html, js);
    } catch (renderError) {
        Notification.exception(renderError);
        return;
    }

    const spinner = container.querySelector('#slms-logs-spinner');
    const emptyMsg = container.querySelector('#slms-logs-empty');
    const tableWrap = container.querySelector('#slms-logs-table-wrap');
    const tbody = container.querySelector('#slms-logs-tbody');

    try {
        const [logsPromise] = ajaxCall([{methodname: 'tiny_studiolms_get_ai_logs', args: {}}]);
        const logs = await logsPromise;

        if (spinner) {
            spinner.classList.add('d-none');
        }

        if (!logs || logs.length === 0) {
            if (emptyMsg) {
                emptyMsg.classList.remove('d-none');
            }
            return;
        }

        if (tableWrap) {
            tableWrap.classList.remove('d-none');
        }

        if (tbody) {
            logs.forEach((entry) => {
                const row = document.createElement('tr');

                const tdDate = document.createElement('td');
                tdDate.textContent = entry.timecreated;

                const tdBlock = document.createElement('td');
                tdBlock.textContent = entry.blocktype;

                const tdProvider = document.createElement('td');
                tdProvider.textContent = entry.ai_provider;

                row.appendChild(tdDate);
                row.appendChild(tdBlock);
                row.appendChild(tdProvider);
                tbody.appendChild(row);
            });
        }
    } catch (loadError) {
        if (spinner) {
            spinner.classList.add('d-none');
        }
        Notification.exception(loadError);
    }
};
