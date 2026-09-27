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
 * Headless tests for sanitizeUrlFields(), run via `node --test` — no RequireJS, no browser, no
 * Moodle runtime. htmlsanitizer.js as a whole cannot be imported headless (sanitizeUntrustedHtml
 * needs DOMParser, a real browser API), but sanitizeUrlFields() and the private isSafeUrl() it
 * calls are plain string/object logic with no DOM dependency, so importing the module and
 * exercising them directly works with zero changes to the source file.
 *
 * isSafeUrl() is not exported — exercising it only through the public sanitizeUrlFields() is
 * deliberate (test the contract, not the private implementation), and covers every branch anyway.
 *
 * These payloads mirror the ones the Behat regression in tests/behat/url_scheme_sanitization.feature
 * drives through a real browser; this file is the fast, headless complement for the same fix.
 *
 * @package    tiny_studiolms
 * @copyright  2026 Jean Lúcio
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

'use strict';

/* eslint-disable no-script-url */
// This whole file's job is proving these literal javascript:/data:/vbscript: strings never
// survive sanitizeUrlFields() — the rule that bans them as a real navigation target does not
// apply to a payload that only ever exists as test fixture data, asserted to become ''.

const {test} = require('node:test');
const assert = require('node:assert/strict');

const sanitizeUrlFieldsPromise = import('../../amd/src/htmlsanitizer.js')
    .then((module) => module.sanitizeUrlFields);

test('keeps http, https, mailto, tel and relative URLs unchanged', async() => {
    const sanitizeUrlFields = await sanitizeUrlFieldsPromise;

    const config = {
        btnUrl: 'https://moodle.org/?a=1&b=2',
        mediaUrl: 'http://example.com/video.mp4',
        link0url: 'mailto:a@b.c',
        link1url: 'tel:+15551234567',
        link2url: '/course/view.php?id=2',
        photoUrl: '@@PLUGINFILE@@/photo.png',
    };

    assert.deepEqual(sanitizeUrlFields(config), config);
});

test('drops a javascript: URL obfuscated with a tab, a leading control character, or case', async() => {
    const sanitizeUrlFields = await sanitizeUrlFieldsPromise;

    const bad = [
        'javascript:alert(1)',
        'JaVaScRiPt:alert(1)',
        'java\tscript:alert(1)',
        '\u0001javascript:alert(1)',
        'data:text/html,<script>alert(1)</script>',
        'vbscript:msgbox(1)',
    ];

    for (const value of bad) {
        assert.equal(sanitizeUrlFields({btnUrl: value}).btnUrl, '', value);
    }
});

test('normalises an unknown link target to _blank and keeps _self', async() => {
    const sanitizeUrlFields = await sanitizeUrlFieldsPromise;

    assert.equal(sanitizeUrlFields({target: 'evilframe'}).target, '_blank');
    assert.equal(sanitizeUrlFields({target: '_blank'}).target, '_blank');
    assert.equal(sanitizeUrlFields({target: '_self'}).target, '_self');
});

test('recurses into arrays and nested objects (a webteca block\'s resources list)', async() => {
    const sanitizeUrlFields = await sanitizeUrlFieldsPromise;

    const config = {
        resources: [
            {type: 'link', title: 'ok', url: 'https://moodle.org'},
            {type: 'pdf', title: 'bad', url: 'JAVASCRIPT:alert(1)'},
        ],
    };

    const result = sanitizeUrlFields(config);

    assert.equal(result.resources[0].url, 'https://moodle.org');
    assert.equal(result.resources[1].url, '');
});

test('only fields whose key ends in "url" or "target" are touched', async() => {
    const sanitizeUrlFields = await sanitizeUrlFieldsPromise;

    const config = {btnText: 'javascript:not-a-url-field', title: 'javascript:also-not-touched'};

    assert.deepEqual(sanitizeUrlFields(config), config);
});

test('the "url" suffix match is case-insensitive (no current block key needs it, but the regex claims to be)', async() => {
    const sanitizeUrlFields = await sanitizeUrlFieldsPromise;

    assert.equal(sanitizeUrlFields({mediaURL: 'javascript:alert(1)'}).mediaURL, '');
});
