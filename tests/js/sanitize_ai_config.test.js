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
 * Headless tests for the plain-text path of sanitizeAiConfig() / sanitizeUntrustedHtml(), run via
 * `node --test`. A string the HTML parser would read no tag, comment or declaration in is returned
 * before DOMParser is touched, so this path needs no browser; markup is covered by the Behat
 * scenarios that drive a real one.
 *
 * Regression test: every string used to be parsed and serialized again, which writes '&' as '&amp;'
 * and '>' as '&gt;'. A block template then escaped the value a second time, so a button link
 * "?v=abc&t=30s" lost its "t" parameter and "P&D" showed as "P&amp;D".
 *
 * @package    tiny_studiolms
 * @copyright  2026 Jean Lúcio
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

// The module is an ES module and the plugin has no package.json, so load it through a dynamic import.
const load = () => import('../../amd/src/htmlsanitizer.js');

test('plain text with an ampersand is returned unchanged', async() => {
    const {sanitizeUntrustedHtml} = await load();
    for (const text of ['P&D', 'Perguntas & Respostas', 'a &amp; b', 'Tom & Jerry > Popeye', 'café noir']) {
        assert.equal(sanitizeUntrustedHtml(text), text);
    }
});

test('a lone less-than sign is text, not markup', async() => {
    const {sanitizeUntrustedHtml} = await load();
    for (const text of ['x < 5', '1 <2', 'a <\tb', 'if a <= b', '<', '5<']) {
        assert.equal(sanitizeUntrustedHtml(text), text);
    }
});

test('empty and non-string values are passed through', async() => {
    const {sanitizeUntrustedHtml} = await load();
    assert.equal(sanitizeUntrustedHtml(''), '');
    assert.equal(sanitizeUntrustedHtml(undefined), undefined);
    assert.equal(sanitizeUntrustedHtml(null), null);
});

test('a generated config keeps URLs and titles with symbols as the model wrote them', async() => {
    const {sanitizeAiConfig} = await load();
    const config = {
        btnUrl: 'https://www.youtube.com/watch?v=abc&t=30s',
        btnText: 'Perguntas & Respostas',
        title: 'P&D',
        note: 'x < 5',
        resources: [
            {type: 'link', title: 'Q&A', url: 'https://x.test/?id=1&section=2'},
        ],
        columns: 3,
        isOpen: true,
    };
    assert.deepEqual(sanitizeAiConfig(config), config);
});

test('URL and target fields are still validated on top of the plain-text path', async() => {
    const {sanitizeAiConfig} = await load();
    // eslint-disable-next-line no-script-url
    const result = sanitizeAiConfig({btnUrl: 'javascript:alert(1)', mediaUrl: 'https://x.test/?a=1&b=2', target: 'evil'});
    assert.equal(result.btnUrl, '');
    assert.equal(result.mediaUrl, 'https://x.test/?a=1&b=2');
    assert.equal(result.target, '_blank');
});
