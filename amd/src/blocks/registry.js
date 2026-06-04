// This file is part of Moodle - http://moodle.org/
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
// along with Moodle.  If not, see <http://www.gnu.org/licenses/>.

/**
 * Registry loader for StudioLMS blocks.
 *
 * @module     tiny_studiolms/blocks/registry
 * @copyright  2026 Jean Lúcio <jeanlucio@gmail.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import stylizedHeading from './heading';
import actionButton from './button';
import advancedCard from './card';
import accordion from './accordion';
import webteca from './webteca';
import gridcards from './gridcards';
import callout from './callout';
import table from './table';
import profileCard from './profilecard';
import mindmap from './mindmap';
import infographic from './infographic';
import infographicSteps from './infographic_steps';

export const Blocks = {
    stylizedHeading,
    actionButton,
    advancedCard,
    accordion,
    webteca,
    gridcards,
    callout,
    table,
    profileCard,
    mindmap,
    infographic,
    infographicSteps,
};
