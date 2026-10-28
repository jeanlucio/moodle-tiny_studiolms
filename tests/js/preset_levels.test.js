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
 * Guard test of the heading levels of the ready-made layouts, run via `node --test`.
 *
 * A layout that is a whole page by itself starts with the title of the page, so that under the name of the activity,
 * which is the first level, no level is skipped; the other layouts start with a section title, which is the neutral
 * choice: it is flagged under an activity name by a one level skip only, and never in a label of the course page.
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

const root = path.dirname(require.resolve('../../presets/en/module_start.json')).replace(/en$/, '');
const load = (lang, name) => JSON.parse(fs.readFileSync(path.join(root, lang, `${name}.json`), 'utf8'));

// English file, Portuguese file: the layouts that open with the title of the page.
const PAGE_LEVEL = [
    ['course_syllabus', 'plano_de_disciplina'],
    ['lesson_tabs', 'aula_em_abas'],
];

PAGE_LEVEL.forEach(([english, portuguese]) => {
    test(`${english}: the first heading is the title of the page and the others are not above a section`, () => {
        [['en', english], ['pt_br', portuguese]].forEach(([lang, name]) => {
            const levels = load(lang, name).blocks
                .filter((block) => block.type === 'stylizedHeading')
                .map((block) => block.config.level);

            assert.equal(levels[0], 'h2', `${lang}/${name} opens with h2`);
            levels.slice(1).forEach((level) => assert.notEqual(level, 'h2', `${lang}/${name} has one title of the page`));
        });
    });
});

test('the forum rubric opens with a title of the page inside its first card, the same size as before', () => {
    [['en', 'graded_forum_with_rubric'], ['pt_br', 'forum_avaliativo_com_rubrica']].forEach(([lang, name]) => {
        const cards = load(lang, name).blocks.filter((block) => block.type === 'advancedCard');

        assert.match(cards[0].config.content, /^<h2 style="[^"]*font-size: 1\.64rem;[^"]*">/, `${lang} first card`);
        assert.match(cards[1].config.content, /^<h3 /, `${lang} second card is a section`);
    });
});
