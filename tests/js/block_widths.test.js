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
 * Guard test for the width of the blocks that hold little, run via `node --test`.
 *
 * Regression test: on a wide theme the profile card, the two bar charts, the steps, the timeline and the comparison
 * stretched over the whole page although what they show fills a fraction of it, and a card with a tall picture grew
 * taller than the screen. Each is now capped and centred, and a card picture is cropped instead of stretching the card.
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

/**
 * Returns the declarations of the rule whose selector is exactly the one given.
 *
 * @param {string} css The stylesheet.
 * @param {string} selector Selector as written before the opening brace.
 * @returns {string} The text between the braces.
 */
const ruleOf = (css, selector) => {
    const escaped = selector.replace(/[.*+?^${}()|[\]\\:>]/g, '\\$&');
    const match = new RegExp(`(?:^|\\n)${escaped} \\{([^}]*)\\}`).exec(css);
    assert.ok(match, `a rule for ${selector}`);
    return match[1];
};

const CAPPED = {
    '.studiolms-profilecard': 440,
    '.slms-chart-block': 720,
    '.slms-chart-bar-block': 720,
    '.slms-infographic-steps--vertical': 720,
    '.slms-infographic-timeline-block': 720,
    '.slms-infographic-comparison-block': 720,
};

['styles.css', 'editor_styles.css'].forEach((file) => {
    test(`${file}: the blocks that hold little are capped and centred`, () => {
        const css = read(file);

        Object.entries(CAPPED).forEach(([selector, width]) => {
            const rule = ruleOf(css, selector);
            assert.match(rule, new RegExp(`max-width: ${width}px;`), selector);
            assert.match(rule, /margin(-inline)?: (1rem )?auto;/, selector);
        });
    });

    test(`${file}: the comparison columns are wide enough for a word like "Tradicional"`, () => {
        const css = read(file);

        assert.match(ruleOf(css, '.slms-comparison__header-col'), /width: 7rem;/);
        assert.match(ruleOf(css, '.slms-comparison__row-cell'), /width: 7rem;/);
    });

    test(`${file}: the picture of a card in a column is cropped, not stretched`, () => {
        const css = read(file);

        assert.match(ruleOf(css, '.studiolms-card:not(.slms-horizontal) .studiolms-card-media img'), /max-height: 260px;/);
        assert.match(css, /\.studiolms-card\.slms-horizontal \.studiolms-card-media img \{\s*max-height: 260px;/);
    });
});
