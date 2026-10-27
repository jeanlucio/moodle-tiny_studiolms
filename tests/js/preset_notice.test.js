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
 * Guard test for the one-time notice about the ready-made layouts, run via `node --test`.
 *
 * Regression test for the rules that make it a notice shown once: it is saved as seen the moment it is shown, only
 * the Ready-made Layouts tab shows it, and only when the server says the layouts are a stand-in for the language. app.js
 * needs the editor and the Moodle AMD loader, so it cannot run headless; the test checks those rules in the source.
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

test('the notice is saved as seen the moment it is shown, and cannot be shown twice in a session', () => {
    const app = read('amd/src/app.js');
    const notice = app.match(/const showPresetLanguageNotice = async\(grid\) => \{[\s\S]*?\n\};/);

    assert.ok(notice, 'showPresetLanguageNotice exists');
    assert.match(notice[0], /presetNoticePending = false;/);
    assert.match(notice[0], /setUserPreference\('tiny_studiolms_presetnotice_seen', 1\)/);
    assert.ok(notice[0].indexOf('grid.prepend(notice)') < notice[0].indexOf('setUserPreference'));
});

test('only the Ready-made Layouts tab shows it, and only when the server asked for it', () => {
    const app = read('amd/src/app.js');

    assert.match(app, /if \(tabName === 'presets' && presetNoticePending && presetsData\.length > 0\) \{/);
    assert.match(app, /presetsData\.length > 0\) \{\s*await showPresetLanguageNotice\(grid\);/);
});

test('the editor hands the server decision to the composer, and the preference is the one lib.php declares', () => {
    const plugin = read('amd/src/plugin.js');
    const lib = read('lib.php');

    assert.ok(plugin.includes("getPluginOptionName(pluginName, 'presetnotice')"));
    assert.match(plugin, /aiHubKeysUrl, policyAgreed,\s*presetNotice\s*\)/);
    assert.ok(lib.includes("'tiny_studiolms_presetnotice_seen' => ["));
});

test('the core user module is loaded on demand and a failure to save is not an error', () => {
    const app = read('amd/src/app.js');

    assert.ok(app.includes("import('core_user/repository')"));
    assert.ok(!/^import .* from 'core_user\//m.test(app));
    assert.match(app, /try \{\s*await UserRepository\.setUserPreference\([^)]*\);\s*\} catch \(error\) \{/);
});
