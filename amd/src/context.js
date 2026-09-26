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
 * Holds the context id of the page the current StudioLMS editor session is running in.
 *
 * TinyMCE resolves this plugin's is_enabled()/get_plugin_configuration_for_context() against the
 * real page context (course, activity, etc.) — that is what decides whether the toolbar button
 * and its features are even shown. A web service call is stateless and carries no context of its
 * own, so every tiny_studiolms_* call must explicitly send this same context id, instead of the
 * server assuming context_system: require_capability() must check the capability against the
 * exact context the button's own visibility was already gated on, or an ordinary course-enrolled
 * teacher (whose role is never assigned at system context) would be rejected.
 *
 * Kept as its own module (no other imports) so every caller — app.js and its siblings, and every
 * block definition under blocks/ — can read it without creating a circular import back through
 * app.js/blocks/registry.js.
 *
 * @module     tiny_studiolms/context
 * @copyright  2026 Jean Lúcio <jeanlucio@gmail.com>
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

let currentContextId = 0;

/**
 * Set the context id for the current StudioLMS editor session.
 *
 * @param {number} contextId
 */
export const setContextId = (contextId) => {
    currentContextId = contextId;
};

/**
 * Get the context id for the current StudioLMS editor session.
 *
 * @returns {number}
 */
export const getContextId = () => currentContextId;
