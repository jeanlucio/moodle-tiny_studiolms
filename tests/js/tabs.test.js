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
 * Tests of the tabs block, run via `node --test`, and guard tests of the block and of the script that turns it into tabs.
 *
 * The block is stored as the panels one after the other, each under its title, so that nothing is hidden where the script
 * of the plugin does not run (the editor, the Studio, a page where it is not loaded). The script builds the row of tabs
 * from the titles and sets the roles and names, which the cleaner of Moodle removes from stored content.
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

let logic;

test.before(async() => {
    // The module imports nothing, so Node can load it as it stands.
    logic = await import(require.resolve('../../amd/src/blocks/tabs_logic.js'));
});

test('the number of tabs is a whole number from 2 to 5, and anything else is the fallback', () => {
    assert.deepEqual([2, 3, 4, 5].map((n) => logic.normalizeTabCount(n)), [2, 3, 4, 5]);
    assert.equal(logic.normalizeTabCount('4'), 4);
    assert.equal(logic.normalizeTabCount(1), 2);
    assert.equal(logic.normalizeTabCount(0), 2);
    assert.equal(logic.normalizeTabCount(9), 5);
    ['', 'x', null, undefined, NaN].forEach((value) => assert.equal(logic.normalizeTabCount(value), 3, String(value)));
    assert.equal(logic.normalizeTabCount('x', 4), 4);
});

test('the colour of the tabs is hexadecimal, since it is written into markup', () => {
    assert.equal(logic.normalizeAccent('#0b5d63'), '#0b5d63');
    assert.equal(logic.normalizeAccent('#FFF'), '#FFF');
    ['', 'red', 'rgb(1,2,3)', '#12', '#ff00zz', '#fff"><script>', null, undefined].forEach((value) => {
        assert.equal(logic.normalizeAccent(value), logic.DEFAULT_ACCENT, String(value));
    });
});

test('the arrows, Home and End move between the tabs as the WAI-ARIA tabs pattern says, and wrap around', () => {
    assert.equal(logic.nextTabIndex('ArrowRight', 0, 3), 1);
    assert.equal(logic.nextTabIndex('ArrowRight', 2, 3), 0);
    assert.equal(logic.nextTabIndex('ArrowLeft', 0, 3), 2);
    assert.equal(logic.nextTabIndex('ArrowLeft', 2, 3), 1);
    assert.equal(logic.nextTabIndex('ArrowDown', 1, 3), 2);
    assert.equal(logic.nextTabIndex('ArrowUp', 1, 3), 0);
    assert.equal(logic.nextTabIndex('Home', 2, 4), 0);
    assert.equal(logic.nextTabIndex('End', 0, 4), 3);
});

test('in a right-to-left page the two arrows swap', () => {
    assert.equal(logic.nextTabIndex('ArrowLeft', 0, 3, true), 1);
    assert.equal(logic.nextTabIndex('ArrowRight', 0, 3, true), 2);
});

test('a key that is not for the tabs is left alone, so Tab and the letters still work', () => {
    ['Tab', 'Enter', ' ', 'a', 'Escape', 'PageDown'].forEach((key) => assert.equal(logic.nextTabIndex(key, 1, 3), null, key));
});

test('the block is registered, typed on the canvas and read back from its own markup', () => {
    const block = read('amd/src/blocks/tabs.js');
    const registry = read('amd/src/blocks/registry.js');

    assert.match(block, /id: 'tabs',/);
    assert.match(block, /excludeFromState: \['tabs'\],/);
    assert.match(block, /querySelectorAll\('\.studiolms-tab-panel'\)\]\.slice\(0, MAX_TABS\)/);
    assert.match(block, /accent: normalizeAccent\(data\.accent\),/);
    assert.match(registry, /import tabs from '\.\/tabs';/);
    assert.match(registry, /\n {4}accordion,\n {4}tabs,\n {4}resources,/);
});

test('the panels are stored one after the other, each under its own title, and nothing is hidden by the markup', () => {
    const template = read('templates/block_tabs.mustache').replace(/\{\{!.*?\}\}/gs, '');

    assert.match(
        template,
        /<div class="studiolms-tabs-wrap w-100\{\{#hoverEffect\}\} slms-hov-\{\{hoverEffect\}\}\{\{\/hoverEffect\}\}">/
    );
    assert.match(template, /class="slms-tab-title slms-single-line" style="color: \{\{accent\}\};" contenteditable="true"/);
    assert.match(template, /class="slms-tab-content studiolms-editable-area" contenteditable="true"/);
    assert.ok(!/hidden|display:\s*none/.test(template), 'nothing is hidden in the markup');
});

test('the page script builds the row of tabs, the roles and the keys, and hides the panels only afterwards', () => {
    const script = read('amd/src/frontend.js');

    assert.match(script, /import \{nextTabIndex\} from '\.\/blocks\/tabs_logic';/);
    assert.match(script, /'\.studiolms-tabs-wrap',/);
    assert.match(script, /const initTabs = \(root\) => \{/);
    assert.match(script, /initToggles\(root\);\s+initTabs\(root\);/);
    assert.match(script, /list\.setAttribute\('role', 'tablist'\);/);
    assert.match(script, /button\.setAttribute\('role', 'tab'\);/);
    assert.match(script, /panel\.setAttribute\('role', 'tabpanel'\);/);
    assert.match(script, /panel\.setAttribute\('aria-labelledby', button\.id\);/);
    assert.match(script, /button\.tabIndex = active \? 0 : -1;/);
    // The class that puts the other panels away is added last, once the row exists.
    assert.ok(script.indexOf("tabs.prepend(list);") < script.indexOf("tabs.classList.add('slms-tabs-js');"));
    // A block already wired is not wired twice.
    assert.match(script, /if \(tabs\.dataset\.slmsBound === '1'\) \{/);
});

['styles.css', 'editor_styles.css'].forEach((file) => {
    test(`${file}: only a block the script has wired puts its other panels away`, () => {
        const css = read(file);

        assert.match(css, /\.slms-tabs-js \.studiolms-tab-panel \{\s+display: none;/);
        assert.match(css, /\.slms-tabs-js \.studiolms-tab-panel\.slms-tab-active \{\s+display: block;/);
        assert.match(css, /\.slms-tabs-js \.slms-tab-title \{\s+display: none;/);
        // No rule hides a panel without the class the script adds.
        assert.ok(!/(^|\n)\.studiolms-tab-panel[^{]*\{[^}]*display:\s*none/.test(css));
    });
});

['en', 'pt_br'].forEach((lang) => {
    test(`${lang}: the strings of the block are there, in order`, () => {
        const source = read(`lang/${lang}/tiny_studiolms.php`);

        ['block_tabs_title', 'default_tab_text', 'default_tab_title', 'tabs_count', 'tabs_count_hint'].forEach((key) => {
            assert.ok(source.includes(`$string['${key}'] = `), key);
        });
        const keys = source.split('\n').map((line) => line.match(/^\$string\['([^']+)'\]/)?.[1]).filter(Boolean);
        assert.deepEqual(keys, [...keys].sort());
    });
});

test('the titles of a new block are numbered from a string, and the five are asked for', () => {
    assert.match(read('amd/src/blocks/default_texts.js'), /\['default_tab_title', \[1, 2, 3, 4, 5\]\],/);
    assert.match(
        read('amd/src/blocks/localize_defaults.js'),
        /numbered\(blocks\.tabs\.defaultData\.tabs, 'title', 'default_tab_title'\);/
    );
});
