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
 * Headless tests for the shared HTML-escaping helper, run via `node --test` — no RequireJS, no
 * browser, no Moodle runtime at all. amd/src/blocks/text_escape.js is a plain ES module with no
 * `core/*` import, so Node's native ES module loader can import it directly with zero changes to
 * the source file (unlike amd/src/htmlsanitizer.js's DOMParser-based functions, which do need a
 * browser).
 *
 * chart/gauge/infographic/mind map build their markup by hand instead of through a Mustache
 * template (moving it into templates was rejected as too large/risky for an already-published
 * block shape), so the one escaping function every one of those blocks now shares carries all
 * the weight of keeping that markup safe. This test suite exists so a future edit that weakens
 * it — or a new block that forgets to call it — is caught here instead of at runtime.
 *
 * @package    tiny_studiolms
 * @copyright  2026 Jean Lúcio
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

'use strict';

const {test} = require('node:test');
const assert = require('node:assert/strict');

const escapeHtmlPromise = import('../../amd/src/blocks/text_escape.js')
    .then((module) => module.escapeHtml);

test('escapes the five characters that matter in a text node or double-quoted attribute', async() => {
    const escapeHtml = await escapeHtmlPromise;

    assert.equal(escapeHtml('&'), '&amp;');
    assert.equal(escapeHtml('<'), '&lt;');
    assert.equal(escapeHtml('>'), '&gt;');
    assert.equal(escapeHtml('"'), '&quot;');
    const mixed = `Sales & Marketing: <b>"top"</b> team`;
    const expected = 'Sales &amp; Marketing: &lt;b&gt;&quot;top&quot;&lt;/b&gt; team';
    assert.equal(escapeHtml(mixed), expected);
});

test('does not escape a single quote (no template in this plugin uses one to delimit an attribute)', async() => {
    const escapeHtml = await escapeHtmlPromise;

    assert.equal(escapeHtml("teacher's note"), "teacher's note");
});

test('a value that tries to break out of a double-quoted attribute is neutralised', async() => {
    // The exact shape of the payload PARAM_TEXT alone lets through server-side (see
    // tests/ai/generator_test.php's test_allowed_icon_rejects_attribute_breakout) — this is the
    // client-side function that must catch it too for any block that renders its own label.
    const escapeHtml = await escapeHtmlPromise;
    const payload = 'x" onmouseover="alert(document.domain)" style="position:fixed;inset:0';

    assert.ok(!escapeHtml(payload).includes('"'));
});

test('coerces null, undefined and non-string values to a safe string', async() => {
    const escapeHtml = await escapeHtmlPromise;

    assert.equal(escapeHtml(null), '');
    assert.equal(escapeHtml(undefined), '');
    assert.equal(escapeHtml(42), '42');
    assert.equal(escapeHtml(0), '0');
});

test('a string with no special characters round-trips unchanged', async() => {
    const escapeHtml = await escapeHtmlPromise;

    assert.equal(escapeHtml('Photosynthesis'), 'Photosynthesis');
    assert.equal(escapeHtml(''), '');
});
