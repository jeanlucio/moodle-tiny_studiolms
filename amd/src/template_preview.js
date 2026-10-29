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
 * The document drawn in the thumbnail of a template card.
 *
 * Plain ES module with no core/* import, so Node can load it for the headless tests.
 *
 * @module     tiny_studiolms/template_preview
 * @copyright  2026 Jean Lúcio
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

/**
 * Escape a value for use inside a double-quoted HTML attribute.
 *
 * @param {string} value
 * @returns {string}
 */
const escapeAttribute = (value) => value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

/**
 * Keep the addresses of the stylesheets a thumbnail may load.
 *
 * The thumbnail is a sandboxed frame, which is a document of its own and sees none of the styles of the page. The
 * classes that give a block its look (the pill of a profile link, the bars of an infographic) live in the theme
 * sheet, so the frame loads the same sheets as the page. Only web addresses are kept: a thumbnail has no business
 * with a data: or javascript: URL.
 *
 * @param {string[]} hrefs The addresses of the stylesheets linked from the page.
 * @returns {string[]}
 */
export const previewStylesheets = (hrefs) => hrefs.filter((href) => /^https?:\/\//i.test(href || ''));

/**
 * Build the document a thumbnail shows.
 *
 * @param {string} content The HTML of the template.
 * @param {string[]} stylesheets The addresses of the stylesheets to load, from previewStylesheets().
 * @returns {string}
 */
export const buildPreviewDocument = (content, stylesheets = []) => {
    const links = stylesheets
        .map((href) => `<link rel="stylesheet" href="${escapeAttribute(href)}">`)
        .join('');
    // The rule after the links wins over the page rules for body at the same specificity; the frame is a thumbnail,
    // so it carries no margin, no page background and no scrollbar of its own.
    const frameStyle = '<style>html, body { margin: 0; padding: 0; background: transparent; overflow: hidden; }</style>';
    return `<!DOCTYPE html><html><head><meta charset="utf-8">${links}${frameStyle}</head><body>${content}</body></html>`;
};
