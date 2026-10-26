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
 * Guard test for the front end on text that Moodle cleans, run via `node --test`.
 *
 * Regression test: wherever Moodle runs the text through HTMLPurifier (a forum post, a glossary entry, a question)
 * the data-slms-* attributes are removed. The script found the blocks only by them, so it wired nothing there and a
 * closed accordion or list of resources, hidden by the stylesheet, could never be opened. The roots are now found by
 * their classes too. This test keeps the list in step with the templates: a new block, or a renamed root, that is
 * not in it fails here.
 *
 * @package    tiny_studiolms
 * @copyright  2026 Jean Lúcio
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

// Located through a source file, so the test works from any working directory.
const read = (file) => fs.readFileSync(require.resolve(`../../${file}`), 'utf8');
const templatesDir = require('node:path').dirname(require.resolve('../../templates/block_card.mustache'));

const rootClasses = (template) => {
    const source = read(`templates/${template}`).replace(/\{\{!.*?\}\}/gs, '');
    const root = source.match(/<div class="([^"]*)"/);
    return root ? root[1].replace(/\{\{[^}]*\}\}/g, ' ').split(/\s+/).filter((name) => /^(studiolms-|slms-block$)/.test(name)) : [];
};

test('the block selector names the root class of every block template', () => {
    const front = read('amd/src/frontend.js');
    const selector = front.slice(front.indexOf('ANY_BLOCK: ['), front.indexOf("].join(', ')"));

    const templates = fs.readdirSync(templatesDir).filter((name) => /^block_[a-z_]+\.mustache$/.test(name));
    assert.ok(templates.length >= 17, 'the block templates were found');
    templates.forEach((template) => {
        const roots = rootClasses(template);
        assert.ok(roots.length > 0, `${template} has a root class the page can be found by`);
        assert.ok(roots.some((name) => selector.includes(`.${name}'`)), `${template}: ${roots.join(' ')}`);
    });
});

test('the data attribute is still used, for the content that is not cleaned', () => {
    assert.match(read('amd/src/frontend.js'), /'\[data-slms-block-type\]',/);
});

test('no step of the script finds the blocks by the data attribute alone', () => {
    const front = read('amd/src/frontend.js');
    const uses = front.match(/within\(\w+, '\[data-slms-block-type\]'\)/g) ?? [];

    assert.deepEqual(uses, [], 'every step goes through SELECTORS.ANY_BLOCK');
    assert.match(front, /within\(root, SELECTORS\.ANY_BLOCK\)\.forEach\(\(block\) => \{\s*within\(block, '\[contenteditable\]'\)/);
});
