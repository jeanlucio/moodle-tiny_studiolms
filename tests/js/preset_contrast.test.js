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
 * Guard test of the colours of the ready-made layouts, run via `node --test`.
 *
 * Regression test: a layout shipped white text on a yellow button (1.66 to 1), a white header on light blue (3.86)
 * and a green accordion title (3.30), all below the 4.5 to 1 that WCAG 2.1 AA asks of text this size; an
 * accessibility scan of a course built from the layouts found them.
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

const hex = /^#[0-9a-f]{6}$/i;

// Text colour field, background colour field.
const PAIRS = [
    ['textColor', 'bgColor'],
    ['textColor', 'backgroundColor'],
    ['btnTextCol', 'btnBg'],
    ['headerText', 'headerBg'],
];

let contrast;

test.before(async() => {
    contrast = await import(require.resolve('../../amd/src/blocks/contrast.js'));
});

const presetFiles = () => {
    const root = path.dirname(require.resolve('../../presets/en/module_start.json')).replace(/en$/, '');
    return ['en', 'pt_br'].flatMap((lang) => fs.readdirSync(path.join(root, lang))
        .filter((file) => file.endsWith('.json'))
        .map((file) => path.join(root, lang, file)));
};

test('the text of every colour pair a ready-made layout sets reads on its background', () => {
    const failures = [];

    presetFiles().forEach((file) => {
        const preset = JSON.parse(fs.readFileSync(file, 'utf8'));
        (preset.blocks || []).forEach((block) => {
            const config = block.config || {};
            PAIRS.forEach(([text, background]) => {
                if (!hex.test(config[text] || '') || !hex.test(config[background] || '')) {
                    return;
                }
                const ratio = contrast.contrastRatio(config[text], config[background]);
                if (ratio < 4.5) {
                    failures.push(
                        `${path.basename(file)} ${block.type} ${text} ${config[text]} on ${config[background]}: ${ratio.toFixed(2)}`
                    );
                }
            });
            // The title of an accordion is written in its colour, on the body colour of the block.
            if (block.type === 'accordion' && hex.test(config.color || '')) {
                const ratio = contrast.contrastRatio(config.color, hex.test(config.bg || '') ? config.bg : '#ffffff');
                if (ratio < 4.5) {
                    failures.push(`${path.basename(file)} accordion title ${config.color}: ${ratio.toFixed(2)}`);
                }
            }
        });
    });

    assert.deepEqual(failures, []);
});
