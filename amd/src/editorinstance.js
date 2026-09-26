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
 * Holds a reference to the live TinyMCE editor instance for the current StudioLMS session, and
 * sanitizes AI-generated block configuration through it.
 *
 * The dedicated per-block-type AI generators (generate_callout, generate_card, ...) already
 * apply clean_param() to each known field server-side. generate_block/generate_preset instead
 * accept a whole config object shaped by the LLM's own JSON response, with no per-field
 * validation — a prompt-injected instruction could ask the model to return a field such as
 * contentHtml containing a script-executing payload. That config is rendered client-side via the
 * same triple-mustache block templates every other block config uses, so it needs the same kind
 * of treatment as a template's own rich-text fields (see app.js's loadTemplateToCanvas): re-
 * serialized through the editor's own schema, which strips anything TinyMCE itself would never
 * allow through while leaving ordinary formatting and this plugin's own attributes intact.
 *
 * Kept as its own module (no other imports) for the same reason as context.js: every caller —
 * aigenerator.js, aichat.js, and any block definition under blocks/ — can read it without
 * creating a circular import back through app.js/blocks/registry.js.
 *
 * @module     tiny_studiolms/editorinstance
 * @copyright  2026 Jean Lúcio <jeanlucio@gmail.com>
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

let currentEditor = null;

/**
 * Set the live TinyMCE editor instance for the current StudioLMS session.
 *
 * @param {object} editor
 */
export const setEditorInstance = (editor) => {
    currentEditor = editor;
};

/**
 * Sanitize a single HTML string through the editor's own schema.
 *
 * Safe to call on a plain, non-HTML value too (a colour, an enum, a URL): DOMParser will not
 * introduce any markup that was not already there, so the value round-trips unchanged.
 *
 * @param {string} html
 * @returns {string}
 */
const sanitizeHtmlString = (html) => {
    if (!currentEditor || !html) {
        return html;
    }
    const parsed = new DOMParser().parseFromString(html, 'text/html');
    // TinyMCE's forced_root_block option is disabled below: it is the editor's default typing
    // behaviour of wrapping any bare root-level content in a <p>, which is exactly wrong for a
    // short plain field (an icon, a colour, an enum) — it would come back as the literal string
    // "<p>value</p>" instead of value. A field with genuine paragraph-level content already
    // carries its own <p> tags.
    /* eslint-disable-next-line camelcase */
    return currentEditor.serializer.serialize(parsed.body, {format: 'html', forced_root_block: false});
};

/**
 * Recursively sanitizes every string value in an AI-generated block config (or array of
 * resource-like objects, e.g. a webteca block's resources list) through the editor's schema.
 *
 * @param {*} value A config object, an array of them, a string, or any other JSON value.
 * @returns {*} The same shape, with every string sanitized.
 */
export const sanitizeAiConfig = (value) => {
    if (typeof value === 'string') {
        return sanitizeHtmlString(value);
    }
    if (Array.isArray(value)) {
        return value.map((item) => sanitizeAiConfig(item));
    }
    if (value && typeof value === 'object') {
        const result = {};
        Object.keys(value).forEach((key) => {
            result[key] = sanitizeAiConfig(value[key]);
        });
        return result;
    }
    return value;
};
