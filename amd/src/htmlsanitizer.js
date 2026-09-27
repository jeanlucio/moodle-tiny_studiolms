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
 * Sanitizes AI-generated block configuration before it reaches a triple-mustache render sink.
 *
 * The dedicated per-block-type AI generators (generate_callout, generate_card, ...) already
 * apply clean_param() to each known field server-side. generate_block/generate_preset instead
 * accept a whole config object shaped by the LLM's own JSON response, with no per-field
 * validation — a prompt-injected instruction could ask the model to return a field such as
 * contentHtml containing a script-executing payload. That config is rendered client-side via the
 * same triple-mustache block templates every other block config uses, so it needs the same kind
 * of sanitization as a template's own rich-text fields (see app.js's loadTemplateToCanvas).
 *
 * Kept as its own module (no other imports) for the same reason as context.js: every caller —
 * aigenerator.js, aichat.js, and any block definition under blocks/ — can read it without
 * creating a circular import back through app.js/blocks/registry.js.
 *
 * @module     tiny_studiolms/htmlsanitizer
 * @copyright  2026 Jean Lúcio <jeanlucio@gmail.com>
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

/**
 * Strips constructs that could execute script from an untrusted HTML string: every on* event
 * handler attribute, <script>/<iframe>/<object>/<embed>/<link>/<style>/<meta>/<base> elements,
 * and javascript: URLs in href/src/action/formaction.
 *
 * This is a real sanitizer, deliberately not built on TinyMCE's own serializer.serialize(): Moodle
 * initializes the editor with xss_sanitization:false and an extended_valid_elements schema of
 * 'script[*],p[*],i[*]' (lib/editor/tiny/classes/editor.php), and TinyMCE's schema engine turns
 * the '[*]' wildcard into an "allow any attribute" pattern for p/i elements — so the serializer
 * keeps onmouseover/onanimationstart etc. on those two tags rather than stripping them. DOMParser
 * builds an inert document (no image loads, no event firing), so walking it here never executes
 * anything itself.
 *
 * Safe to call on a plain, non-HTML value too (a colour, an enum, a URL): a string with no markup
 * and no dangerous attributes round-trips unchanged.
 *
 * @param {string} html
 * @returns {string}
 */
export const sanitizeUntrustedHtml = (html) => {
    if (!html) {
        return html;
    }

    const doc = new DOMParser().parseFromString(html, 'text/html');

    doc.querySelectorAll('script, iframe, object, embed, link, style, meta, base').forEach((el) => {
        el.remove();
    });

    const urlAttributes = ['href', 'src', 'action', 'formaction'];
    doc.body.querySelectorAll('*').forEach((el) => {
        Array.from(el.attributes).forEach((attr) => {
            const name = attr.name.toLowerCase();
            if (name.startsWith('on')) {
                el.removeAttribute(attr.name);
            } else if (urlAttributes.includes(name) && (/^\s*javascript:/i).test(attr.value)) {
                el.removeAttribute(attr.name);
            }
        });
    });

    return doc.body.innerHTML;
};

/**
 * Recursively sanitizes every string value in an AI-generated block config (or array of
 * resource-like objects, e.g. a webteca block's resources list).
 *
 * @param {*} value A config object, an array of them, a string, or any other JSON value.
 * @returns {*} The same shape, with every string sanitized.
 */
export const sanitizeAiConfig = (value) => {
    if (typeof value === 'string') {
        return sanitizeUntrustedHtml(value);
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
