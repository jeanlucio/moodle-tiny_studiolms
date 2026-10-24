<?php
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
 * PHPUnit tests for the privacy notice of the AI tabs.
 *
 * @package    tiny_studiolms
 * @copyright  2026 Jean Lúcio
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace tiny_studiolms;

use advanced_testcase;

/**
 * Tests that every AI tab tells the teacher where the text goes.
 *
 * @coversNothing
 */
final class ai_notice_test extends advanced_testcase {
    /**
     * Each of the three AI tabs carries the notice that the text goes to the site's AI provider.
     *
     * Regression test: the tabs offered a text box with nothing saying that what was typed, which can hold
     * names of students pasted from a course, leaves Moodle for an external provider.
     */
    public function test_every_ai_tab_carries_the_privacy_notice(): void {
        global $PAGE;

        $this->resetAfterTest();
        $PAGE->set_url('/');
        $renderer = $PAGE->get_renderer('core');
        $notice = s(get_string('ai_privacy_notice', 'tiny_studiolms'));

        foreach (['tab_ai_block' => [], 'tab_ai_model' => [], 'tab_ai_chat' => ['hasai' => true]] as $name => $context) {
            $html = $renderer->render_from_template('tiny_studiolms/' . $name, $context);
            $this->assertSame(1, substr_count($html, $notice), $name);
        }
    }
}
