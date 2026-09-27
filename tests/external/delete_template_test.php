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
 * PHPUnit tests for tiny_studiolms\external\delete_template.
 *
 * @package    tiny_studiolms
 * @copyright  2026 Jean Lúcio
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace tiny_studiolms\external;

use advanced_testcase;
use tiny_studiolms\external\delete_template;

/**
 * Tests for the delete_template external function.
 *
 * @covers \tiny_studiolms\external\delete_template
 */
final class delete_template_test extends advanced_testcase {
    /** @var \stdClass Template owner. */
    private \stdClass $owner;

    /** @var \stdClass Another user without ownership. */
    private \stdClass $other;

    /** @var \stdClass Manager with manageglobaltemplates. */
    private \stdClass $manager;

    /** @var int ID of the template owned by $owner. */
    private int $templateid;

    protected function setUp(): void {
        parent::setUp();
        global $DB;

        $this->resetAfterTest();

        $context = \context_system::instance();

        $this->owner   = $this->getDataGenerator()->create_user();
        $this->other   = $this->getDataGenerator()->create_user();
        $this->manager = $this->getDataGenerator()->create_user();

        $teacherrole = $this->getDataGenerator()->create_role();
        assign_capability('tiny/studiolms:use', CAP_ALLOW, $teacherrole, $context->id);
        role_assign($teacherrole, $this->owner->id, $context->id);
        role_assign($teacherrole, $this->other->id, $context->id);

        $managerrole = $this->getDataGenerator()->create_role();
        assign_capability('tiny/studiolms:use', CAP_ALLOW, $managerrole, $context->id);
        assign_capability('tiny/studiolms:manageglobaltemplates', CAP_ALLOW, $managerrole, $context->id);
        role_assign($managerrole, $this->manager->id, $context->id);

        $now = time();
        $this->templateid = $DB->insert_record('tiny_studiolms_templates', (object) [
            'name'         => 'Owner Template',
            'content'      => '<p>Hi</p>',
            'userid'       => $this->owner->id,
            'usermodified' => $this->owner->id,
            'isglobal'     => 0,
            'timecreated'  => $now,
            'timemodified' => $now,
        ]);
    }

    /**
     * The owner can delete their own template.
     */
    public function test_owner_can_delete_own_template(): void {
        global $DB;

        $this->setUser($this->owner);

        $result = delete_template::execute(\context_system::instance()->id, $this->templateid);

        $this->assertTrue($result['success']);
        $this->assertFalse($DB->record_exists('tiny_studiolms_templates', ['id' => $this->templateid]));
    }

    /**
     * Another teacher (not the owner) cannot delete the template.
     */
    public function test_other_user_cannot_delete_template(): void {
        $this->setUser($this->other);

        $this->expectException(\moodle_exception::class);
        delete_template::execute(\context_system::instance()->id, $this->templateid);
    }

    /**
     * A manager with manageglobaltemplates can delete a global template regardless of ownership.
     */
    public function test_manager_can_delete_global_template(): void {
        global $DB;

        $now = time();
        $globalid = $DB->insert_record('tiny_studiolms_templates', (object) [
            'name'         => 'Global Template',
            'content'      => '<p>Official</p>',
            'userid'       => $this->owner->id,
            'usermodified' => $this->owner->id,
            'isglobal'     => 1,
            'timecreated'  => $now,
            'timemodified' => $now,
        ]);

        $this->setUser($this->manager);

        $result = delete_template::execute(\context_system::instance()->id, $globalid);

        $this->assertTrue($result['success']);
        $this->assertFalse($DB->record_exists('tiny_studiolms_templates', ['id' => $globalid]));
    }

    /**
     * manageglobaltemplates grants deleting a GLOBAL template, never someone else's PRIVATE one —
     * that capability has nothing to do with owning the row being deleted.
     */
    public function test_manager_cannot_delete_other_users_private_template(): void {
        $this->setUser($this->manager);

        $this->expectException(\moodle_exception::class);
        delete_template::execute(\context_system::instance()->id, $this->templateid);
    }

    /**
     * manageglobaltemplates is declared at CONTEXT_SYSTEM: a user who only holds it at a course
     * context (a common delegation pattern for the manager archetype) must not be treated as
     * having it site-wide. Regression test for the capability-context confusion that let a
     * course-scoped manager delete any user's private template via require_capability() checked
     * against the editor's own $context instead of \context_system::instance().
     */
    public function test_course_scoped_manager_cannot_delete_other_users_private_template(): void {
        $course = $this->getDataGenerator()->create_course();
        $coursecontext = \context_course::instance($course->id);

        $coursemanager = $this->getDataGenerator()->create_user();
        $role = $this->getDataGenerator()->create_role();
        assign_capability('tiny/studiolms:use', CAP_ALLOW, $role, $coursecontext->id);
        assign_capability('tiny/studiolms:manageglobaltemplates', CAP_ALLOW, $role, $coursecontext->id);
        $this->getDataGenerator()->enrol_user($coursemanager->id, $course->id, $role);

        $this->setUser($coursemanager);

        $this->expectException(\moodle_exception::class);
        delete_template::execute($coursecontext->id, $this->templateid);
    }

    /**
     * Deleting a template also removes all associated favourite records.
     */
    public function test_delete_cascades_favourites(): void {
        global $DB;

        // Add a favourite pointing to the template.
        $DB->insert_record('tiny_studiolms_favourites', (object) [
            'userid'      => $this->other->id,
            'templateid'  => $this->templateid,
            'timecreated' => time(),
        ]);

        $this->setUser($this->owner);
        delete_template::execute(\context_system::instance()->id, $this->templateid);

        $this->assertFalse(
            $DB->record_exists('tiny_studiolms_favourites', ['templateid' => $this->templateid])
        );
    }

    /**
     * Deleting a template fires a template_deleted event.
     */
    public function test_delete_fires_template_deleted_event(): void {
        $this->setUser($this->owner);

        $sink = $this->redirectEvents();
        delete_template::execute(\context_system::instance()->id, $this->templateid);
        $events = $sink->get_events();
        $sink->close();

        $eventnames = array_map(fn($e) => $e->eventname, $events);
        $this->assertContains('\tiny_studiolms\event\template_deleted', $eventnames);
    }

    /**
     * Deleting a non-existent template throws a dml_missing_record_exception.
     */
    public function test_delete_nonexistent_template_throws(): void {
        $this->setUser($this->owner);

        $this->expectException(\dml_missing_record_exception::class);
        delete_template::execute(\context_system::instance()->id, 99999);
    }
}
