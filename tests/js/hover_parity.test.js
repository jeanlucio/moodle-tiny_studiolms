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
 * Guard test for the hover effect on every block, run via `node --test`.
 *
 * Only some blocks offered the effect that a visitor sees on the course page when the pointer is over them; the rest
 * had none. It is a class on the root of the block, the same in the Studio, the editor and the course page, and the
 * blocks that have none of their own get a shared Interactivity tab. This test keeps every block in step.
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

// The blocks that have a control of their own for the effect, on the element they chose.
const OWN = ['block_button', 'block_card', 'block_callout', 'block_accordion', 'block_resources'];

test('every block template carries the hover class, the shared ones on the root', () => {
    const templates = fs.readdirSync(templatesDir).filter((name) => /^block_[a-z_]+\.mustache$/.test(name));

    templates.forEach((name) => {
        const source = read(`templates/${name}`).replace(/\{\{!.*?\}\}/gs, '');
        const base = name.replace('.mustache', '');

        assert.match(source, /slms-hov-\{\{(btnHoverEffect|hoverEffect)\}\}/, `${name} has the class`);
        if (!OWN.includes(base)) {
            const root = source.match(/<div class="[^"]*"/)[0];
            assert.ok(root.includes('{{#hoverEffect}} slms-hov-{{hoverEffect}}{{/hoverEffect}}'), `${name}: on its root`);
        }
    });
});

test('a block that draws its own context hands the effect to its template', () => {
    ['chart', 'chart_bar', 'gauge', 'infographic', 'infographic_features', 'infographic_steps', 'infographic_timeline',
        'infographic_comparison', 'profilecard'].forEach((block) => {
        assert.match(read(`amd/src/blocks/${block}.js`), /hoverEffect: data\.hoverEffect,?/, block);
    });
    assert.match(read('amd/src/blocks/mindmap.js'), /\{svgContent, textAlt, hoverEffect: data\.hoverEffect\}/);
});

test('the registry gives a block with none of its own the default and the flag, and the Studio the tab', () => {
    const registry = read('amd/src/blocks/registry.js');
    const app = read('amd/src/app.js');

    assert.match(registry, /if \(!\('hoverEffect' in block\.defaultData\)\) \{/);
    assert.match(registry, /block\.defaultData\.hoverEffect = 'none';\s*block\.sharedHover = true;/);
    assert.match(app, /if \(entry\.blockDef\.sharedHover\) \{\s*await addInteractivityTab\(toolbarContainer, entry\);/);
    assert.match(app, /'tiny_studiolms\/popup_interactivity'/);
    assert.match(app, /entry\.config\.hoverEffect = event\.target\.value;/);
    assert.match(read('templates/popup_interactivity.mustache'), /id="pop_hover"/);
    ['en', 'pt_br'].forEach((lang) => {
        assert.ok(read(`lang/${lang}/tiny_studiolms.php`).includes("$string['toolbar_interactivity'] = "), lang);
    });
});

test('the zoom and the lift do not move the block for whoever asks the system for less movement', () => {
    ['styles.css', 'editor_styles.css'].forEach((file) => {
        const css = read(file);

        assert.match(css, /prefers-reduced-motion: reduce\) \{\s*\.slms-hov-scale,\s*\.slms-hov-lift \{\s*transition: none;/);
        assert.match(css, /\.slms-hov-scale:hover,\s*\.slms-hov-lift:hover \{\s*transform: none;/);
    });
});
