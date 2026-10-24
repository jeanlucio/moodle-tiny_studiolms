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
 * Guard test for the AI usage policy gate of the composer, run via `node --test`.
 *
 * Regression test: what a teacher typed into the AI tabs went to an external provider without the policy the
 * core shows before every other AI feature. app.js needs the editor and the Moodle AMD loader, so it cannot
 * run headless; the test checks the rules that keep the gate in place: every AI tab goes through it before
 * anything is drawn, and the core AI modules are loaded on demand so a problem with them can only affect the
 * AI tabs and never the editor toolbar.
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

test('every AI tab asks for the policy before anything is drawn', () => {
    const source = read('amd/src/app.js');

    assert.match(source, /const AI_TABS = \['ai-block', 'ai-model', 'ai-chat'\];/);
    assert.match(
        source,
        /const switchTab = async\(tabName\) => \{\n {4}if \(AI_TABS\.includes\(tabName\) && !\(await ensureAiPolicy\(\)\)\) \{/
    );
});

test('a declined policy keeps the tab the user came from', () => {
    const source = read('amd/src/app.js');
    const gate = source.match(/const switchTab = async\(tabName\) => \{[\s\S]*?\n {4}currentTab = tabName;/);

    assert.ok(gate, 'switchTab remembers the current tab');
    assert.ok(gate[0].includes('markActiveTab(currentTab);'));
});

test('nothing is asked when no AI is available', () => {
    const source = read('amd/src/app.js');
    const gate = source.match(/const ensureAiPolicy = async\(\) => \{\n {4}if \(!aiState\.available\) \{\n {8}return true;/);

    assert.ok(gate, 'the policy is skipped when there is no AI to send text to');
});

test('the core AI modules are loaded on demand, never at the top of a file', () => {
    for (const file of ['amd/src/app.js', 'amd/src/plugin.js']) {
        const source = read(file);

        assert.ok(!/^import .* from 'core_ai\//m.test(source), `${file} imports core_ai statically`);
    }
    const app = read('amd/src/app.js');
    assert.ok(app.includes("import('core_ai/policy')"));
    assert.ok(app.includes("import('core_ai/policymodal')"));
});

test('the editor hands the policy status to the composer', () => {
    const plugin = read('amd/src/plugin.js');

    assert.ok(plugin.includes("getPluginOptionName(pluginName, 'policyagreed')"));
    assert.match(plugin, /initStudioApp\(\s*editor, modal, editData, canManageGlobal, presets, hasAi, contextId, aiHubKeysUrl,/);
    assert.match(plugin, /aiHubKeysUrl, policyAgreed,/);
});
