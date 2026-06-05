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

        $result = save_template::execute('My Layout', '<p>Hello</p>', 0);

        $this->assertArrayHasKey('id', $result);
        $this->assertGreaterThan(0, $result['id']);

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
        save_template::execute('Official', '<p>Content</p>', 1);
    }

    /**
     * A manager with manageglobaltemplates can save a global template.
     */
    public function test_manager_saves_global_template(): void {
        global $DB;

        $this->setUser($this->manager);

        $result = save_template::execute('Official Layout', '<p>Content</p>', 1);

        $record = $DB->get_record('tiny_studiolms_templates', ['id' => $result['id']], '*', MUST_EXIST);
        $this->assertEquals(1, (int) $record->isglobal);
    }

    /**
     * Saving a template fires a template_created event.
     */
    public function test_save_fires_template_created_event(): void {
        $this->setUser($this->teacher);

        $sink = $this->redirectEvents();
        save_template::execute('Event Test', '<p>x</p>', 0);
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
        save_template::execute('Guest attempt', '<p>x</p>', 0);
    }
}
