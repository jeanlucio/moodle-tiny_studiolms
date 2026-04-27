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
 * Student-facing frontend engine for StudioLMS blocks.
 *
 * Loaded on course/module pages. Handles runtime block behaviours
 * (accordion initial state) that need JavaScript on the student view.
 *
 * @module     tiny_studiolms/frontend
 * @copyright  2026 Jean Lúcio <jeanlucio@gmail.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

const SELECTORS = {
    ACCORDION: 'details.studiolms-accordion',
    WEBTECA: 'details.studiolms-webteca',
    ANY_BLOCK: '.studiolms-accordion, .studiolms-webteca, .studiolms-card, .studiolms-callout-wrap',
};

/**
 * Remove the `open` attribute from details elements whose initial state is "closed".
 * The mustache templates render all details as open so the HTML is valid and
 * predictable; this function applies the author-configured state on page load.
 */
const applyInitialStates = () => {
    const selector =
        `${SELECTORS.ACCORDION}[data-initial-state="closed"],` +
        `${SELECTORS.WEBTECA}[data-initial-state="closed"]`;

    document.querySelectorAll(selector).forEach(details => {
        details.removeAttribute('open');
    });
};

/**
 * Remove contenteditable from any button <a> elements saved before the
 * block_button.mustache was updated to use contenteditable="false" on the anchor.
 * Without this, legacy buttons remain non-clickable for students.
 */
const fixLegacyButtons = () => {
    document.querySelectorAll('a.studiolms-btn[contenteditable]').forEach(btn => {
        btn.removeAttribute('contenteditable');
    });
};

/**
 * Initialise the StudioLMS frontend engine.
 * Exits immediately if no StudioLMS blocks are present on the page.
 */
export const init = () => {
    if (!document.querySelector(SELECTORS.ANY_BLOCK)) {
        return;
    }
    applyInitialStates();
    fixLegacyButtons();
};
