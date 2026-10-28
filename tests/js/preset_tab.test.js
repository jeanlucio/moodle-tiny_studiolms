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
 * Guard test for the tab of the ready-made layouts, run via `node --test`.
 *
 * Regression test: the ready-made layouts of the plugin were listed in the Site Templates tab, ahead of the templates
 * a manager shares, so the name of the tab described neither. They have a tab of their own, and Site Templates lists
 * only what was shared.
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

test('the dialog has the tab of the layouts, right before the site templates', () => {
    const modal = read('templates/modal.mustache');
    const tabs = [...modal.matchAll(/data-slms-tab="([a-z-]+)"/g)].map((match) => match[1]);

    // The Widgets tab sits after the components: it is offered only when the widgets filter is there.
    assert.deepEqual(tabs.slice(0, 5), ['components', 'widgets', 'presets', 'global', 'mine']);
    assert.match(modal, /id="slms-tab-presets"/);
    assert.match(modal, /tab_presets, tiny_studiolms/);
});

test('the tab of the layouts lists the layouts, and the site templates only what was shared', () => {
    const app = read('amd/src/app.js');

    assert.match(
        app,
        /if \(tabName === 'presets'\) \{\s+tabDataCache\.set\('presets', await renderPresetsAsTemplates\(presetsData\)\);/
    );
    assert.ok(!/\.\.\.presetTemplates/.test(app), 'the layouts are no longer put ahead of the shared templates');
    assert.match(app, /if \(tabName === 'presets' && presetNoticePending && presetsData\.length > 0\)/);
    assert.match(app, /'presets': 'tab_presets',/);
});

test('with no layouts to offer the tab is taken out of the dialog', () => {
    const app = read('amd/src/app.js');

    assert.match(
        app,
        /if \(presets\.length === 0\) \{\s+document\.getElementById\('slms-tab-presets'\)\?\.closest\('li'\)\?\.remove\(\);/
    );
});

['en', 'pt_br'].forEach((lang) => {
    test(`${lang}: the name of the tab is a string, in order`, () => {
        const keys = read(`lang/${lang}/tiny_studiolms.php`).split('\n')
            .map((line) => line.match(/^\$string\['(tab_[a-z_]+)'\]/)?.[1]).filter(Boolean);

        assert.ok(keys.includes('tab_presets'));
        assert.deepEqual(keys, [...keys].sort());
    });
});
