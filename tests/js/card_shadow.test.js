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
 * Guards the card shadow: the setting must reach the markup as a class the stylesheet defines.
 *
 * The shadow was once computed and then never printed, so the Shadow select changed nothing. The block needs
 * the Moodle AMD loader, so this reads the sources instead of importing them.
 *
 * @copyright  2026 Jean Lúcio
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(path.dirname(require.resolve('./card_shadow.test.js')), '..', '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('the card template prints the shadow class', () => {
    assert.match(read('templates/block_card.mustache'), /\{\{shadowClass\}\}/);
});

test('every shadow size the block can emit has a rule in both stylesheets', () => {
    ['sm', 'md', 'lg'].forEach((size) => {
        assert.match(read('amd/src/blocks/card.js'), new RegExp(`slms-shadow-${size}`));
        assert.match(read('styles.css'), new RegExp(`\\.studiolms-card\\.slms-shadow-${size}\\s*\\{[^}]*box-shadow`));
        assert.match(read('editor_styles.css'), new RegExp(`\\.studiolms-card\\.slms-shadow-${size}\\s*\\{[^}]*box-shadow`));
    });
});

test('the shadow is not carried by an inline style, which the purifier strips', () => {
    assert.doesNotMatch(read('templates/block_card.mustache'), /style="[^"]*box-shadow/);
});
