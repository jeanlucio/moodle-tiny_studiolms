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
 * Headless tests for the document drawn in the thumbnail of a template card, run via `node --test`.
 *
 * @package    tiny_studiolms
 * @copyright  2026 Jean Lúcio
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const load = () => import('../../amd/src/template_preview.js');

test('only web addresses are kept as stylesheets of a thumbnail', async() => {
    const {previewStylesheets} = await load();

    const scriptScheme = ['java', 'script'].join('') + ':alert(1)';

    assert.deepEqual(
        previewStylesheets(['https://x.test/theme/styles.php/boost/1/all', scriptScheme, 'data:text/css,a{}', '', null]),
        ['https://x.test/theme/styles.php/boost/1/all']
    );
});

test('the document links the stylesheets before the content, so the classes of the blocks apply', async() => {
    const {buildPreviewDocument} = await load();

    const doc = buildPreviewDocument('<div class="studiolms-profilecard">x</div>', ['https://x.test/a.css']);

    assert.ok(doc.includes('<link rel="stylesheet" href="https://x.test/a.css">'));
    assert.ok(doc.indexOf('<link') < doc.indexOf('studiolms-profilecard'));
    assert.ok(doc.includes('<body><div class="studiolms-profilecard">x</div></body>'));
});

test('an address cannot break out of the href attribute', async() => {
    const {buildPreviewDocument} = await load();

    const doc = buildPreviewDocument('', ['https://x.test/a.css?a=1&b="><script>1</script>']);

    assert.ok(!doc.includes('<script>'));
    assert.ok(doc.includes('a=1&amp;b=&quot;&gt;&lt;script&gt;'));
});

test('without stylesheets the content is still shown', async() => {
    const {buildPreviewDocument} = await load();

    assert.ok(buildPreviewDocument('<p>a</p>').includes('<body><p>a</p></body>'));
});
