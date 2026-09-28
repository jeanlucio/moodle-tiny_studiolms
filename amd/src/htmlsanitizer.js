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
 * The primary barrier for AI output is server-side: the dedicated per-block-type generators
 * (generate_callout, generate_card, ...) clean_param() each known field, and generate_block/
 * generate_preset run every markup-bearing string of the model's config through core's HTMLPurifier
 * (generator::clean_config()). This module is the second barrier for that config, and the only one
 * for stored templates, which keep their data-slms-* attributes and so cannot go through
 * HTMLPurifier (see app.js's loadTemplateToCanvas).
 *
 * Kept as its own module (no other imports) for the same reason as context.js: every caller —
 * aigenerator.js, aichat.js, and any block definition under blocks/ — can read it without
 * creating a circular import back through app.js/blocks/registry.js.
 *
 * @module     tiny_studiolms/htmlsanitizer
 * @copyright  2026 Jean Lúcio <jeanlucio@gmail.com>
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

/** @var {string[]} Attributes whose value the browser resolves as a URL. */
const URL_ATTRIBUTES = ['href', 'xlink:href', 'src', 'action', 'formaction', 'poster', 'background'];

/** @var {string[]} URL schemes a block may link to; anything else with a scheme is dropped. */
const ALLOWED_SCHEMES = ['http', 'https', 'mailto', 'tel'];

/**
 * Tells whether a URL attribute value is safe to keep.
 *
 * An allow-list, not a javascript: blocklist: attr.value arrives entity-decoded, and the browser's
 * URL parser drops ASCII tab/newline and leading control characters before reading the scheme, so
 * 'java&#x09;script:' or '&#x01;javascript:' would slip past any pattern tested on the raw value.
 * The value is normalized the same way first; a relative URL (no scheme) is always kept.
 *
 * @param {string} value
 * @returns {boolean}
 */
const isSafeUrl = (value) => {
    // eslint-disable-next-line no-control-regex
    const normalized = value.replace(/[\u0000-\u0020\u007f]/g, '').toLowerCase();
    const scheme = normalized.match(/^([a-z][a-z0-9+.-]*):/);
    return !scheme || ALLOWED_SCHEMES.includes(scheme[1]);
};

/**
 * Elements removed outright: script-capable ones, SVG animations (which can rewrite an attribute
 * such as href after sanitization), and the raw-text/template elements a browser parses
 * differently depending on whether scripting is enabled.
 */
const BLOCKED_ELEMENTS = [
    'script', 'iframe', 'object', 'embed', 'link', 'style', 'meta', 'base',
    'set', 'animate', 'animateTransform', 'animateMotion',
    'noscript', 'noembed', 'noframes', 'xmp', 'plaintext', 'template',
].join(', ');

/** @var {number} Re-sanitization passes allowed before an unstable result is dropped. */
const MAX_PASSES = 3;

/**
 * One sanitization pass over an HTML string.
 *
 * @param {string} html
 * @returns {string}
 */
const sanitizeOnce = (html) => {
    const doc = new DOMParser().parseFromString(html, 'text/html');

    doc.querySelectorAll(BLOCKED_ELEMENTS).forEach((el) => {
        el.remove();
    });

    // Comments go too: they are serialized verbatim, so one can carry markup that a later parse in a
    // different context (e.g. inside an element read as raw text there) turns into live elements.
    const comments = [];
    const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_COMMENT);
    while (walker.nextNode()) {
        comments.push(walker.currentNode);
    }
    comments.forEach((node) => node.remove());

    doc.body.querySelectorAll('*').forEach((el) => {
        Array.from(el.attributes).forEach((attr) => {
            const name = attr.name.toLowerCase();
            if (name.startsWith('on')) {
                el.removeAttribute(attr.name);
            } else if (URL_ATTRIBUTES.includes(name) && !isSafeUrl(attr.value)) {
                el.removeAttribute(attr.name);
            }
        });
    });

    return doc.body.innerHTML;
};

/**
 * Strips constructs that could execute script from an untrusted HTML string: every on* event
 * handler attribute, every comment, script-capable, SVG animation and raw-text elements, and any
 * URL attribute whose scheme is not http/https/mailto/tel.
 *
 * DOMParser parses with scripting disabled while the live page parses with it enabled, so markup
 * that is inert here can come back to life there (mutation XSS; <noscript> is the classic case,
 * handled by removing it). As a further guard the output is sanitized again until it stops
 * changing: a result that still mutates after MAX_PASSES is dropped rather than trusted.
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

    let output = sanitizeOnce(html);
    for (let pass = 0; pass < MAX_PASSES; pass++) {
        const next = sanitizeOnce(output);
        if (next === output) {
            return output;
        }
        output = next;
    }
    return '';
};

/** @var {RegExp} Block config keys whose value is rendered as a URL (btnUrl, mediaUrl, link0url, url...). */
const URL_FIELD = /url$/i;

/** @var {string[]} Link targets a block may use; matches the options the button popup offers. */
const ALLOWED_TARGETS = ['_blank', '_self'];

/**
 * Validates the URL and link-target fields of a block config, at any depth.
 *
 * A URL field is plain text, not markup, so sanitizeUntrustedHtml() has no attribute to inspect in
 * it: 'javascript:alert(1)' passes through unchanged and only becomes a live href once a block
 * template renders href="{{btnUrl}}". Fields are recognised by key name, the one convention every
 * block definition already follows. An unsafe URL becomes '' (a block with an empty URL hides its
 * media or link), and an unknown target falls back to '_blank', the button's own default.
 *
 * @param {*} value A config object, an array of them, or any other JSON value.
 * @returns {*} The same shape, with URL and target fields validated.
 */
export const sanitizeUrlFields = (value) => {
    if (Array.isArray(value)) {
        return value.map((item) => sanitizeUrlFields(item));
    }
    if (value && typeof value === 'object') {
        const result = {};
        Object.keys(value).forEach((key) => {
            const item = value[key];
            if (typeof item === 'string' && URL_FIELD.test(key)) {
                result[key] = isSafeUrl(item) ? item : '';
            } else if (typeof item === 'string' && key === 'target') {
                result[key] = ALLOWED_TARGETS.includes(item) ? item : '_blank';
            } else {
                result[key] = sanitizeUrlFields(item);
            }
        });
        return result;
    }
    return value;
};

/**
 * Recursively sanitizes every string value in a config, as HTML.
 *
 * @param {*} value A config object, an array of them, a string, or any other JSON value.
 * @returns {*} The same shape, with every string sanitized.
 */
const sanitizeHtmlStrings = (value) => {
    if (typeof value === 'string') {
        return sanitizeUntrustedHtml(value);
    }
    if (Array.isArray(value)) {
        return value.map((item) => sanitizeHtmlStrings(item));
    }
    if (value && typeof value === 'object') {
        const result = {};
        Object.keys(value).forEach((key) => {
            result[key] = sanitizeHtmlStrings(value[key]);
        });
        return result;
    }
    return value;
};

/**
 * Sanitizes an AI-generated block config (or array of resource-like objects, e.g. a resources
 * block's resources list): every string as HTML, then every URL and target field.
 *
 * @param {*} value A config object, an array of them, a string, or any other JSON value.
 * @returns {*} The same shape, safe to render.
 */
export const sanitizeAiConfig = (value) => sanitizeUrlFields(sanitizeHtmlStrings(value));
