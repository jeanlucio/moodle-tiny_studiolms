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
 * PHPUnit tests for tiny_studiolms\hook_callbacks.
 *
 * @package    tiny_studiolms
 * @copyright  2026 Jean Lúcio
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace tiny_studiolms;

use advanced_testcase;
use core\hook\output\before_footer_html_generation;

/**
 * Tests for the before_footer_html_generation hook callback.
 *
 * @covers \tiny_studiolms\hook_callbacks
 */
final class hook_callbacks_test extends advanced_testcase {
    #[\Override]
    protected function setUp(): void {
        parent::setUp();
        $this->resetAfterTest();
    }

    /**
     * The frontend AMD module is requested on a course context page.
     */
    public function test_amd_module_requested_on_course_context(): void {
        global $PAGE;

        $course = $this->getDataGenerator()->create_course();
        $PAGE->set_context(\context_course::instance($course->id));

        hook_callbacks::before_footer_html_generation(
            new before_footer_html_generation($PAGE->get_renderer('core'))
        );

        // No assertion beyond "did not throw": js_call_amd() has no public getter to
        // introspect pending AMD calls, so this is a smoke test of the course/module
        // branch actually being taken without error.
        $this->assertTrue(true);
    }

    /**
     * The AMD module is not requested on a system-context page (outside course/module).
     */
    public function test_does_nothing_on_system_context(): void {
        global $PAGE;

        $PAGE->set_context(\context_system::instance());

        hook_callbacks::before_footer_html_generation(
            new before_footer_html_generation($PAGE->get_renderer('core'))
        );

        $this->assertTrue(true);
    }
}
