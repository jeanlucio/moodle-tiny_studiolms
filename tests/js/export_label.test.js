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
 * Tests of the export button of My Templates, run via `node --test`.
 *
 * The checkboxes choose what is exported, but with none ticked the export takes everything (and, for a site manager,
 * the site templates too). With one template the two looked the same, so nothing told the author that ticking did
 * anything. The button now says "Export all" or "Export selected (n)", and a line under it says what "all" holds.
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

let label;

test.before(async() => {
    label = await import(require.resolve('../../amd/src/export_label.js'));
});

test('with nothing ticked the button says all, and the line says what all holds', () => {
    assert.deepEqual(label.exportTexts(0, false), {
        button: {key: 'btn_export_all', param: null},
        hint: 'export_hint_all',
    });
    assert.deepEqual(label.exportTexts(0, true), {
        button: {key: 'btn_export_all', param: null},
        hint: 'export_hint_all_site',
    });
});

test('with something ticked the button counts them, for anyone, and the line goes away', () => {
    [false, true].forEach((manager) => {
        assert.deepEqual(label.exportTexts(1, manager), {
            button: {key: 'btn_export_selected', param: 1},
            hint: null,
        });
        assert.equal(label.exportTexts(7, manager).button.param, 7);
    });
});

test('the label follows the ticks and the grid being drawn again', () => {
    const app = read('amd/src/app.js');

    assert.match(app, /import \{exportTexts\} from '\.\/export_label';/);
    assert.match(app, /setupImportExportButtons\(canManageGlobal\);/);
    assert.match(app, /exportTexts\(document\.querySelectorAll\('\.slms-tpl-select:checked'\)\.length, canManageGlobal\)/);
    assert.match(app, /grid\.addEventListener\('change', \(event\) => \{/);
    assert.match(app, /event\.target\.closest\?\.\('\.slms-tpl-select'\)/);
    assert.match(app, /new MutationObserver\(refreshExportLabel\)\.observe\(grid, \{childList: true\}\);/);
});

test('the toolbar wraps its buttons, so a long label moves Import down cleanly', () => {
    ['styles.css', 'editor_styles.css'].forEach((file) => {
        const rule = read(file).match(/\.tiny_studiolms \.slms-sidebar-tab-toolbar \{[^}]*\}/)[0];

        assert.match(rule, /display: flex;\s*flex-wrap: wrap;\s*gap: 0\.25rem;/, file);
    });
    assert.doesNotMatch(read('templates/modal.mustache'), /id="slms-btn-import" class="[^"]*\bms-1\b/);
});

test('the template has the label and the line, and the strings exist in both languages in order', () => {
    const modal = read('templates/modal.mustache').replace(/\{\{!.*?\}\}/gs, '');

    assert.match(modal, /id="slms-btn-export-label">\{\{#str\}\} btn_export_all, tiny_studiolms \{\{\/str\}\}/);
    assert.match(modal, /id="slms-export-hint"/);
    ['en', 'pt_br'].forEach((lang) => {
        const strings = read(`lang/${lang}/tiny_studiolms.php`);

        ['btn_export_all', 'btn_export_selected', 'export_hint_all', 'export_hint_all_site'].forEach((key) => {
            assert.ok(strings.includes(`$string['${key}'] = `), `${lang} ${key}`);
        });
        assert.ok(strings.includes("'Export selected ({$a})'") || strings.includes("'Exportar selecionados ({$a})'"), lang);
        assert.doesNotMatch(strings, /\$string\['btn_export'\]/, lang);
    });
});
