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
 * Guard test for the text that can be typed on the canvas, run via `node --test`.
 *
 * The text of the callout, the title and the description of a list of resources and the name, the role and the bio
 * of a profile card are typed right on the canvas, as those of the accordion, the card, the heading and the button
 * are, and go back to the block through its extractDOM. Each has no field in the settings any more.
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

test('the callout, the resources list and the profile card have their text fields editable', () => {
    assert.match(read('templates/block_callout.mustache'), /slms-callout-content mceEditable"[^>]*contenteditable="true"/);
    const resources = read('templates/block_resources.mustache');
    assert.match(resources, /class="slms-resources-title" contenteditable="true"/);
    assert.match(resources, /class="slms-resources-desc small"[^>]*contenteditable="true"/);
    const profile = read('templates/block_profilecard.mustache');
    ['name', 'role', 'bio'].forEach((field) => {
        assert.match(profile, new RegExp(`class="slms-pc-${field} slms-single-line" contenteditable="true"`), field);
    });
});

test('each of them goes back to the block through its extractDOM', () => {
    assert.match(read('amd/src/blocks/callout.js'), /extractDOM: \(node, state\)/);
    assert.match(read('amd/src/blocks/resources.js'), /querySelector\('\.slms-resources-title'\)/);
    assert.match(read('amd/src/blocks/resources.js'), /querySelector\('\.slms-resources-desc'\)/);
    const profile = read('amd/src/blocks/profilecard.js');
    assert.match(profile, /\['name', 'role', 'bio'\]\.forEach\(\(field\) => \{/);
    assert.match(profile, /querySelector\(`\.slms-pc-\$\{field\}`\)/);
    assert.match(profile, /excludeFromState: \['name', 'role', 'bio'\]/);
});

test('their fields are gone from the settings, and what they set is kept for the AI generator', () => {
    const resources = read('templates/popup_resources_general.mustache');
    const profile = read('templates/popup_profilecard_content.mustache');

    ['pop_res_title', 'pop_res_desc'].forEach((id) => assert.ok(!resources.includes(id), id));
    ['pop_pc_name', 'pop_pc_role', 'pop_pc_bio'].forEach((id) => assert.ok(!profile.includes(id), id));
    assert.match(read('amd/src/blocks/resources.js'), /if \(result\.title\) \{\s*data\.title = result\.title;/);
    // A block set to refuse a line break: the fields that are one line say so.
    assert.match(read('amd/src/app.js'), /field\.classList\.contains\('slms-single-line'\)/);
});

test('an empty role or bio takes no room on the page and shows a mark where it is typed', () => {
    ['styles.css', 'editor_styles.css'].forEach((file) => {
        const css = read(file);

        assert.match(css, /\.slms-pc-role:empty,\s*\.studiolms-profilecard \.slms-pc-bio:empty \{\s*display: none;/);
        assert.match(css, /body\.mce-content-body \.studiolms-profilecard \.slms-pc-bio:empty \{\s*display: block;/);
        assert.match(css, /:empty::before \{\s*content: '\\2026';/);
    });
});
