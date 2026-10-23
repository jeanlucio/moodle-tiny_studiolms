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
 * Headless tests for parseTemplateImport(), run via `node --test`.
 *
 * Regression test: a file that is not JSON, a file holding "null" and a list with a null entry made
 * the import throw a SyntaxError or a TypeError, which the editor showed as a technical English
 * dialog instead of the translated "invalid file" notice it already has.
 *
 * @package    tiny_studiolms
 * @copyright  2026 Jean Lúcio
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const load = () => import('../../amd/src/template_import.js');

test('a bare list and the versioned envelope are both accepted', async() => {
    const {parseTemplateImport} = await load();
    const item = {name: 'Plan', content: '<p>x</p>', isglobal: 1};

    assert.deepEqual(parseTemplateImport(JSON.stringify([item]), 'Imported'), [item]);
    assert.deepEqual(parseTemplateImport(JSON.stringify({version: 1, templates: [item]}), 'Imported'), [item]);
});

test('anything that is not a usable export throws the one translatable error', async() => {
    const {parseTemplateImport, INVALID_IMPORT_FILE} = await load();
    const unusable = [
        '<!DOCTYPE html><html></html>',
        '',
        'null',
        'true',
        '42',
        '"text"',
        '{}',
        '{"templates": null}',
        '{"templates": "x"}',
        '[]',
        '[null]',
        '[1, "a", null, [1]]',
    ];
    for (const text of unusable) {
        assert.throws(() => parseTemplateImport(text, 'Imported'), {message: INVALID_IMPORT_FILE}, text);
    }
});

test('entries that are not objects are skipped, the rest are kept', async() => {
    const {parseTemplateImport} = await load();

    const result = parseTemplateImport(JSON.stringify([null, {name: 'A', content: 'x'}, 7, [1]]), 'Imported');

    assert.deepEqual(result, [{name: 'A', content: 'x', isglobal: 0}]);
});

test('fields are normalised: name, content and the global flag', async() => {
    const {parseTemplateImport} = await load();

    const result = parseTemplateImport(JSON.stringify([
        {content: '<p>a</p>'},
        {name: 'x'.repeat(300), content: 5, isglobal: '1'},
        {name: 'B', isglobal: 2},
        {name: '', content: 'c', evil: 'dropped'},
    ]), 'Imported');

    assert.equal(result[0].name, 'Imported');
    assert.equal(result[1].name.length, 255);
    assert.equal(result[1].content, '5');
    assert.equal(result[1].isglobal, 1);
    assert.equal(result[2].isglobal, 0);
    assert.equal(result[2].content, '');
    assert.equal(result[3].name, 'Imported');
    assert.deepEqual(Object.keys(result[3]), ['name', 'content', 'isglobal']);
});
