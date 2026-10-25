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
 * Registry loader for StudioLMS blocks.
 *
 * @module     tiny_studiolms/blocks/registry
 * @copyright  2026 Jean Lúcio
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import stylizedHeading from './heading';
import actionButton from './button';
import advancedCard from './card';
import accordion from './accordion';
import resources from './resources';
import gridcards from './gridcards';
import callout from './callout';
import table from './table';
import profileCard from './profilecard';
import chart from './chart';
import chartBar from './chart_bar';
import gauge from './gauge';
import mindmap from './mindmap';
import infographic from './infographic';
import infographicFeatures from './infographic_features';
import infographicSteps from './infographic_steps';
import infographicTimeline from './infographic_timeline';
import infographicComparison from './infographic_comparison';
import {applyDefaultTexts} from './localize_defaults';
import {defaultText, loadDefaultTexts} from './default_texts';

export const Blocks = {
    stylizedHeading,
    actionButton,
    advancedCard,
    accordion,
    resources,
    gridcards,
    callout,
    table,
    profileCard,
    chart,
    chartBar,
    gauge,
    mindmap,
    infographic,
    infographicFeatures,
    infographicSteps,
    infographicTimeline,
    infographicComparison,
};

// A block that has no hover effect of its own gets the shared one: a "None" default, and a flag the Studio reads to
// add the Interactivity tab to its toolbar. The effect is a class on the block's root, so the template of every such
// block carries it, and what is drawn on the course page, in the editor and in the Studio is the same.
Object.values(Blocks).forEach((block) => {
    if (!('hoverEffect' in block.defaultData)) {
        block.defaultData.hoverEffect = 'none';
        block.sharedHover = true;
    }
});

/** @var {boolean} Whether applyDefaultTexts() has already run on the blocks. */
let localized = false;

/**
 * Loads the translated example texts and puts them into every block's defaultData.
 *
 * Idempotent: the work is done once, and later calls wait for or return the same result. Call it
 * before anything reads defaultData (the library thumbnails, a block being added).
 *
 * @returns {Promise<void>}
 */
export const localizeBlockDefaults = async() => {
    await loadDefaultTexts();
    if (!localized) {
        applyDefaultTexts(Blocks, defaultText);
        localized = true;
    }
};