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
 * Guard test of the width the ready-made layouts ask for, run via `node --test`.
 *
 * A layout that sets a width must set one the blocks know, on a block that has the option, and the layouts that
 * line up with a full-width table or heading must keep doing so: a card or a list of resources capped to a few hundred
 * pixels next to a table across the whole column looked unfinished in the forum rubric. The timeline, the vertical
 * steps and the comparison are left reduced on purpose, since across a wide column they get worse.
 *
 * @package    tiny_studiolms
 * @copyright  2026 Jean Lúcio
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const WITH_OPTION = [
    'profileCard', 'chart', 'chartBar', 'infographicSteps', 'infographicTimeline', 'infographicComparison',
    'advancedCard', 'resources', 'table', 'stylizedHeading', 'callout',
];

// English file, Portuguese file, the block type that is widened.
const WIDENED = [
    ['graded_forum_with_rubric', 'forum_avaliativo_com_rubrica', 'advancedCard'],
    ['course_welcome', 'boas_vindas_ao_curso', 'advancedCard'],
    ['live_sessions', 'encontros_sincronos', 'resources'],
    ['live_sessions_green', 'encontros_sincronos_verde', 'resources'],
    ['support_material', 'material_de_apoio', 'resources'],
    ['class_dashboard', 'painel_da_turma', 'chartBar'],
];

const root = path.dirname(require.resolve('../../presets/en/module_start.json')).replace(/en$/, '');
const load = (lang, name) => JSON.parse(fs.readFileSync(path.join(root, lang, `${name}.json`), 'utf8'));

test('a layout sets only a width the blocks know, and only on a block that has the option', () => {
    const problems = [];

    ['en', 'pt_br'].forEach((lang) => {
        fs.readdirSync(path.join(root, lang)).filter((file) => file.endsWith('.json')).forEach((file) => {
            (load(lang, file.replace(/\.json$/, '')).blocks || []).forEach((block) => {
                const value = (block.config || {}).width;
                if (value === undefined) {
                    return;
                }
                if (!['reduced', 'full'].includes(value) || !WITH_OPTION.includes(block.type)) {
                    problems.push(`${lang}/${file} ${block.type} width ${value}`);
                }
            });
        });
    });

    assert.deepEqual(problems, []);
});

WIDENED.forEach(([english, portuguese, type]) => {
    test(`${english}: the ${type} of the layout takes the whole column, in both languages`, () => {
        [['en', english], ['pt_br', portuguese]].forEach(([lang, name]) => {
            const blocks = load(lang, name).blocks.filter((block) => block.type === type);

            assert.ok(blocks.length > 0, `${lang}/${name} has a ${type}`);
            blocks.forEach((block) => assert.equal(block.config.width, 'full', `${lang}/${name} ${type}`));
        });
    });
});
