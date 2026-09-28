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
 * Shared HTML-escaping helper for the chart, gauge, infographic and mind map blocks.
 *
 * These blocks build their SVG/HTML markup by string concatenation rather than through a
 * Mustache template — moving that markup into .mustache files, where escaping is automatic,
 * was judged not worth the risk of regressing already-published blocks. Every value they
 * interpolate — label, value, description, title — must go through this function first; it
 * used to be five separate, independently copy-pasted definitions (chart.js, chart_bar.js,
 * gauge.js, mindmap.js as `svgEsc`, and infographic_shared.js). Nothing catches a future
 * block, or a copy edited in one place, that forgets to call it — so there is only one copy now.
 *
 * Plain, dependency-free ES module (no `core/*` import) on purpose, so it doubles as the subject
 * of the headless tests in tests/js/text_escape.test.js, run via `node --test` with no browser,
 * no RequireJS and no Moodle runtime — see that file for why.
 *
 * @module     tiny_studiolms/blocks/text_escape
 * @copyright  2026 Jean Lúcio <jeanlucio@gmail.com>
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

/**
 * Escapes the five characters that matter for a value placed inside an HTML/SVG text node or a
 * double-quoted attribute: & < > " (single quotes are never used to delimit an attribute in this
 * plugin's own templates, so they are left alone, as all five prior copies already did).
 *
 * @param {*} value Value to escape; coerced to a string first (null/undefined become '').
 * @returns {string}
 */
export const escapeHtml = (value) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
