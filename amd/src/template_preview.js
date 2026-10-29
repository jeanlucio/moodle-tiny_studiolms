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
 * Keep the addresses of the theme sheet, the one stylesheet a thumbnail may load.
 *
 * Fallback for a page whose style rules cannot be read (a sheet served from another origin): the frame then links
 * the sheet itself. It is heavy, since every thumbnail parses it, so it is only used when collectBlockCss() finds
 * nothing. Only web addresses are kept: a thumbnail has no business with a data: or javascript: URL.
 *
 * @param {string[]} hrefs The addresses of the stylesheets linked from the page.
 * @returns {string[]}
 */
export const previewStylesheets = (hrefs) => hrefs.filter((href) => /^https?:\/\/[^/]+\/theme\/styles\.php\//i.test(href || ''));

// The selectors that style the dialog itself, which a thumbnail has no use for.
const DIALOG_SELECTOR = /\.tiny_studiolms|#studiolms-app|\.studiolms-modal-dialog|\.slms-sidebar|\.slms-canvas|\.slms-chat/;
// The selectors of the blocks, whose classes all carry one of these.
const BLOCK_SELECTOR = /studiolms|slms-/;

/**
 * Tell whether a style rule is one of the blocks.
 *
 * @param {object} rule A CSSStyleRule.
 * @returns {boolean}
 */
const isBlockRule = (rule) => {
    if (rule.selectorText.trim() === ':root') {
        // The brand colours the blocks read through var().
        return rule.cssText.includes('--slms-');
    }
    return rule.selectorText.split(',').some((selector) => BLOCK_SELECTOR.test(selector) && !DIALOG_SELECTOR.test(selector));
};

/**
 * Collect the rules of the blocks from the stylesheets of the page.
 *
 * The thumbnail is a sandboxed frame, a document of its own that sees none of the styles of the page, and the classes
 * that give a block its look live in the theme sheet. Linking that sheet would make every thumbnail parse more than a
 * megabyte of CSS, so the frame gets only the rules of the blocks, read once from the page.
 *
 * @param {Iterable<object>} sheets The CSSStyleSheet objects of the page.
 * @returns {string} The CSS text, empty when no rule could be read.
 */
export const collectBlockCss = (sheets) => {
    const collect = (rules) => {
        let css = '';
        for (const rule of Array.from(rules)) {
            if (rule.selectorText !== undefined) {
                if (isBlockRule(rule)) {
                    css += `${rule.cssText}\n`;
                }
            } else if (rule.cssRules && (rule.cssText || '').startsWith('@media')) {
                const inner = collect(rule.cssRules);
                if (inner !== '') {
                    css += `@media ${rule.conditionText ?? rule.media?.mediaText ?? ''} {\n${inner}}\n`;
                }
            }
        }
        return css;
    };

    let css = '';
    for (const sheet of Array.from(sheets)) {
        try {
            css += collect(sheet.cssRules);
        } catch (e) {
            // A sheet from another origin cannot be read; the rest still can.
        }
    }
    return css;
};

/**
 * Build the document a thumbnail shows.
 *
 * @param {string} content The HTML of the template.
 * @param {object} [options]
 * @param {string} [options.css] The rules of the blocks, from collectBlockCss().
 * @param {string[]} [options.stylesheets] The addresses of the sheets to link, from previewStylesheets().
 * @returns {string}
 */
export const buildPreviewDocument = (content, {css = '', stylesheets = []} = {}) => {
    const links = stylesheets
        .map((href) => `<link rel="stylesheet" href="${escapeAttribute(href)}">`)
        .join('');
    // The style after the links wins over the page rules for body at the same specificity; the frame is a thumbnail,
    // so it carries no margin, no page background and no scrollbar of its own. The CSS text is kept out of any tag.
    const blockStyle = css === '' ? '' : `<style>${css.replace(/<\/style/gi, '<\\/style')}</style>`;
    const frameStyle = '<style>html, body { margin: 0; padding: 0; background: transparent; overflow: hidden; }</style>';
    return `<!DOCTYPE html><html><head><meta charset="utf-8">${links}${blockStyle}${frameStyle}</head>`
        + `<body>${content}</body></html>`;
};
