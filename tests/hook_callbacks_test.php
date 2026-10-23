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

        $this->assertStringContainsString('tiny_studiolms/frontend', $PAGE->requires->get_end_code());
    }

    /**
     * The module is requested at every context level a block can be shown in.
     *
     * Regression test: it was requested only for course and module pages, so a closed accordion saved in a
     * category description, a dashboard text block or a profile stayed hidden with nothing to open it.
     */
    public function test_amd_module_requested_on_every_context_level(): void {
        global $PAGE;

        $category = $this->getDataGenerator()->create_category();
        $user = $this->getDataGenerator()->create_user();
        $contexts = [
            'system' => \context_system::instance(),
            'category' => \context_coursecat::instance($category->id),
            'user' => \context_user::instance($user->id),
        ];

        foreach ($contexts as $name => $context) {
            $PAGE = new \moodle_page();
            $PAGE->set_context($context);

            hook_callbacks::before_footer_html_generation(
                new before_footer_html_generation($PAGE->get_renderer('core'))
            );

            $this->assertStringContainsString('tiny_studiolms/frontend', $PAGE->requires->get_end_code(), $name);
        }
    }
}
