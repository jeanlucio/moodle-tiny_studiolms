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
 * PHPUnit tests for tiny_studiolms\external\save_template.
 *
 * @package    tiny_studiolms
 * @copyright  2026 Jean Lúcio
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace tiny_studiolms\external;

use advanced_testcase;
use core_external\external_api;
use tiny_studiolms\external\save_template;

/**
 * Tests for the save_template external function.
 *
 * @covers \tiny_studiolms\external\save_template
 */
final class save_template_test extends advanced_testcase {
    /** @var \stdClass Teacher user fixture. */
    private \stdClass $teacher;

    /** @var \stdClass Manager user fixture. */
    private \stdClass $manager;

    protected function setUp(): void {
        parent::setUp();
        $this->resetAfterTest();

        $this->teacher = $this->getDataGenerator()->create_user();
        $this->manager = $this->getDataGenerator()->create_user();

        $context = \context_system::instance();

        $teacherrole = $this->getDataGenerator()->create_role();
        assign_capability('tiny/studiolms:use', CAP_ALLOW, $teacherrole, $context->id);
        role_assign($teacherrole, $this->teacher->id, $context->id);

        $managerrole = $this->getDataGenerator()->create_role();
        assign_capability('tiny/studiolms:use', CAP_ALLOW, $managerrole, $context->id);
        assign_capability('tiny/studiolms:manageglobaltemplates', CAP_ALLOW, $managerrole, $context->id);
        role_assign($managerrole, $this->manager->id, $context->id);
    }

    /**
     * A teacher with the :use capability can save a personal template.
     */
    public function test_teacher_saves_personal_template(): void {
        global $DB;

        $this->setUser($this->teacher);

        $result = save_template::execute(\context_system::instance()->id, 'My Layout', '<p>Hello</p>', 0);

        $this->assertArrayHasKey('id', $result);
        $this->assertGreaterThan(0, $result['id']);
        $this->assertEquals($result, external_api::clean_returnvalue(save_template::execute_returns(), $result));

        $record = $DB->get_record('tiny_studiolms_templates', ['id' => $result['id']], '*', MUST_EXIST);
        $this->assertEquals('My Layout', $record->name);
        $this->assertEquals('<p>Hello</p>', $record->content);
        $this->assertEquals(0, (int) $record->isglobal);
        $this->assertEquals($this->teacher->id, (int) $record->userid);
    }

    /**
     * A teacher without manageglobaltemplates cannot save a global template.
     */
    public function test_teacher_cannot_save_global_template(): void {
        $this->setUser($this->teacher);

        $this->expectException(\required_capability_exception::class);
        save_template::execute(\context_system::instance()->id, 'Official', '<p>Content</p>', 1);
    }

    /**
     * A manager with manageglobaltemplates can save a global template.
     */
    public function test_manager_saves_global_template(): void {
        global $DB;

        $this->setUser($this->manager);

        $result = save_template::execute(\context_system::instance()->id, 'Official Layout', '<p>Content</p>', 1);

        $record = $DB->get_record('tiny_studiolms_templates', ['id' => $result['id']], '*', MUST_EXIST);
        $this->assertEquals(1, (int) $record->isglobal);
    }

    /**
     * The official flag takes only 0 or 1; any other number is refused and nothing is written.
     *
     * Regression test: the flag was an integer written as it came, so a 2 from a script produced a
     * template that no tab lists (they match 0 and 1) and that neither the deletion nor the
     * anonymisation of the privacy provider reaches.
     */
    public function test_a_flag_that_is_not_zero_or_one_is_refused(): void {
        global $DB;

        $this->setUser($this->manager);

        foreach ([2, -1, 7] as $flag) {
            try {
                save_template::execute(\context_system::instance()->id, 'Odd flag', '<p>x</p>', $flag);
                $this->fail('A flag of ' . $flag . ' was accepted.');
            } catch (\invalid_parameter_exception $e) {
                $this->assertSame(0, $DB->count_records('tiny_studiolms_templates'));
            }
        }
    }

    /**
     * Saving a template fires a template_created event.
     */
    public function test_save_fires_template_created_event(): void {
        $this->setUser($this->teacher);

        $sink = $this->redirectEvents();
        save_template::execute(\context_system::instance()->id, 'Event Test', '<p>x</p>', 0);
        $events = $sink->get_events();
        $sink->close();

        $eventnames = array_map(fn($e) => $e->eventname, $events);
        $this->assertContains('\tiny_studiolms\event\template_created', $eventnames);
    }

    /**
     * A guest user (no :use capability) gets an access-denied exception.
     */
    public function test_guest_cannot_save_template(): void {
        $this->setGuestUser();

        $this->expectException(\required_capability_exception::class);
        save_template::execute(\context_system::instance()->id, 'Guest attempt', '<p>x</p>', 0);
    }

    /**
     * manageglobaltemplates is declared at CONTEXT_SYSTEM: a user who only holds it at a course
     * context (a common delegation pattern for the manager archetype) must not be able to
     * publish into the site-wide Official library via that course's own context.
     */
    public function test_course_scoped_manager_cannot_save_global_template(): void {
        $course = $this->getDataGenerator()->create_course();
        $coursecontext = \context_course::instance($course->id);

        $coursemanager = $this->getDataGenerator()->create_user();
        $role = $this->getDataGenerator()->create_role();
        assign_capability('tiny/studiolms:use', CAP_ALLOW, $role, $coursecontext->id);
        assign_capability('tiny/studiolms:manageglobaltemplates', CAP_ALLOW, $role, $coursecontext->id);
        $this->getDataGenerator()->enrol_user($coursemanager->id, $course->id, $role);

        $this->setUser($coursemanager);

        $this->expectException(\required_capability_exception::class);
        save_template::execute($coursecontext->id, 'Phishing Link', '<p>x</p>', 1);
    }

    /**
     * A name longer than the column is cut to it instead of failing the insert.
     */
    public function test_name_longer_than_the_column_is_truncated(): void {
        global $DB;

        $this->setUser($this->teacher);

        $result = save_template::execute(\context_system::instance()->id, str_repeat('ñ', 300), '<p>x</p>', 0);

        $record = $DB->get_record('tiny_studiolms_templates', ['id' => $result['id']], '*', MUST_EXIST);
        $this->assertSame(save_template::NAME_MAX_LENGTH, \core_text::strlen($record->name));
    }
}
