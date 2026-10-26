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
 * PHPUnit tests for tiny_studiolms\external\export_templates.
 *
 * @package    tiny_studiolms
 * @copyright  2026 Jean Lúcio
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace tiny_studiolms\external;

use advanced_testcase;
use core_external\external_api;
use tiny_studiolms\external\export_templates;

/**
 * Tests for the export_templates external function.
 *
 * @covers \tiny_studiolms\external\export_templates
 */
final class export_templates_test extends advanced_testcase {
    /** @var \stdClass Teacher fixture. */
    private \stdClass $teacher;

    /** @var \stdClass Second teacher (ownership isolation). */
    private \stdClass $other;

    /** @var \stdClass Manager fixture. */
    private \stdClass $manager;

    /** @var int ID of the personal template owned by $teacher. */
    private int $personalid;

    /** @var int ID of the global template. */
    private int $globalid;

    protected function setUp(): void {
        parent::setUp();
        global $DB;

        $this->resetAfterTest();

        $context = \context_system::instance();

        $this->teacher = $this->getDataGenerator()->create_user();
        $this->other   = $this->getDataGenerator()->create_user();
        $this->manager = $this->getDataGenerator()->create_user();

        $teacherrole = $this->getDataGenerator()->create_role();
        assign_capability('tiny/studiolms:use', CAP_ALLOW, $teacherrole, $context->id);
        role_assign($teacherrole, $this->teacher->id, $context->id);
        role_assign($teacherrole, $this->other->id, $context->id);

        $managerrole = $this->getDataGenerator()->create_role();
        assign_capability('tiny/studiolms:use', CAP_ALLOW, $managerrole, $context->id);
        assign_capability('tiny/studiolms:manageglobaltemplates', CAP_ALLOW, $managerrole, $context->id);
        role_assign($managerrole, $this->manager->id, $context->id);

        $now = time();

        $this->personalid = $DB->insert_record('tiny_studiolms_templates', (object) [
            'name'         => 'My Layout',
            'content'      => '<p>mine</p>',
            'userid'       => $this->teacher->id,
            'usermodified' => $this->teacher->id,
            'isglobal'     => 0,
            'timecreated'  => $now,
            'timemodified' => $now,
        ]);

        $this->globalid = $DB->insert_record('tiny_studiolms_templates', (object) [
            'name'         => 'Global Layout',
            'content'      => '<p>global</p>',
            'userid'       => $this->manager->id,
            'usermodified' => $this->manager->id,
            'isglobal'     => 1,
            'timecreated'  => $now,
            'timemodified' => $now,
        ]);

        // Another user's private template — must never appear in teacher's export.
        $DB->insert_record('tiny_studiolms_templates', (object) [
            'name'         => 'Other Layout',
            'content'      => '<p>other</p>',
            'userid'       => $this->other->id,
            'usermodified' => $this->other->id,
            'isglobal'     => 0,
            'timecreated'  => $now,
            'timemodified' => $now,
        ]);
    }

    /**
     * A teacher exporting all templates gets only their own personal templates (no global).
     */
    public function test_teacher_exports_own_templates_only(): void {
        $this->setUser($this->teacher);

        $rows = export_templates::execute(\context_system::instance()->id, []);

        $this->assertCount(1, $rows);
        $this->assertEquals('My Layout', $rows[0]['name']);
        $this->assertEquals($rows, external_api::clean_returnvalue(export_templates::execute_returns(), $rows));
    }

    /**
     * A manager exporting all templates gets their own and all global templates.
     */
    public function test_manager_exports_own_and_global_templates(): void {
        $this->setUser($this->manager);

        $rows = export_templates::execute(\context_system::instance()->id, []);
        $names = array_column($rows, 'name');

        $this->assertContains('Global Layout', $names);
    }

    /**
     * A teacher exporting by specific IDs gets only the requested templates they own.
     */
    public function test_export_by_ids_returns_only_owned(): void {
        $this->setUser($this->teacher);

        $rows = export_templates::execute(\context_system::instance()->id, [$this->personalid]);

        $this->assertCount(1, $rows);
        $this->assertEquals($this->personalid, $rows[0]['id']);
    }

    /**
     * Insert a personal template for a user.
     *
     * @param \stdClass $user The owner.
     * @param string $name Template name.
     * @return int The template id.
     */
    private function create_personal_template(\stdClass $user, string $name): int {
        global $DB;

        $now = time();
        return $DB->insert_record('tiny_studiolms_templates', (object) [
            'name'         => $name,
            'content'      => '<p>' . $name . '</p>',
            'userid'       => $user->id,
            'usermodified' => $user->id,
            'isglobal'     => 0,
            'timecreated'  => $now,
            'timemodified' => $now,
        ]);
    }

    /**
     * Ticking templates exports only those; ticking none exports all of the user's own.
     *
     * Regression test for the export button: the checkboxes of My Templates choose what is exported, and with none
     * ticked the export takes everything. With a single template the two looked the same, so a user could not tell
     * that ticking did anything. The button now says which of the two it will do, and this is what each does.
     */
    public function test_ticked_templates_are_exported_and_none_ticked_exports_all(): void {
        $this->setUser($this->teacher);
        $second = $this->create_personal_template($this->teacher, 'Second Layout');
        $contextid = \context_system::instance()->id;

        $ticked = export_templates::execute($contextid, [$second]);
        $this->assertSame(['Second Layout'], array_column($ticked, 'name'));

        $all = export_templates::execute($contextid, []);
        $this->assertEqualsCanonicalizing(['My Layout', 'Second Layout'], array_column($all, 'name'));
    }

    /**
     * A site manager who ticks templates gets only those; the site templates come only with none ticked.
     *
     * The line under the button warns a manager that "nothing ticked" includes the site templates, so ticking must
     * be the way to leave them out.
     */
    public function test_a_manager_who_ticks_templates_does_not_get_the_site_templates(): void {
        $this->setUser($this->manager);
        $own = $this->create_personal_template($this->manager, 'Manager Layout');
        $contextid = \context_system::instance()->id;

        $ticked = export_templates::execute($contextid, [$own]);
        $this->assertSame(['Manager Layout'], array_column($ticked, 'name'));

        $all = export_templates::execute($contextid, []);
        $this->assertEqualsCanonicalizing(['Manager Layout', 'Global Layout'], array_column($all, 'name'));
    }

    /**
     * A teacher requesting a specific ID they do not own gets an empty result.
     */
    public function test_export_by_id_excludes_unowned(): void {
        $this->setUser($this->teacher);

        $rows = export_templates::execute(\context_system::instance()->id, [$this->globalid]);

        // Teacher does not have manageglobaltemplates, so global template is excluded.
        $this->assertCount(0, $rows);
    }

    /**
     * A manager requesting the global ID by specific ID gets the template.
     */
    public function test_manager_can_export_global_by_id(): void {
        $this->setUser($this->manager);

        $rows = export_templates::execute(\context_system::instance()->id, [$this->globalid]);

        $this->assertCount(1, $rows);
        $this->assertEquals($this->globalid, $rows[0]['id']);
    }

    /**
     * The export payload never exposes another user's private template even when requested by ID.
     */
    public function test_export_never_exposes_other_users_private_templates(): void {
        global $DB;

        $this->setUser($this->teacher);

        $otherid = $DB->get_field('tiny_studiolms_templates', 'id', ['name' => 'Other Layout']);
        $rows = export_templates::execute(\context_system::instance()->id, [$otherid]);

        $this->assertCount(0, $rows);
    }

    /**
     * manageglobaltemplates is declared at CONTEXT_SYSTEM: a user who only holds it at a course
     * context (a common delegation pattern for the manager archetype) must not be able to export
     * global templates via that course's own context.
     */
    public function test_course_scoped_manager_cannot_export_global_templates(): void {
        $course = $this->getDataGenerator()->create_course();
        $coursecontext = \context_course::instance($course->id);

        $coursemanager = $this->getDataGenerator()->create_user();
        $role = $this->getDataGenerator()->create_role();
        assign_capability('tiny/studiolms:use', CAP_ALLOW, $role, $coursecontext->id);
        assign_capability('tiny/studiolms:manageglobaltemplates', CAP_ALLOW, $role, $coursecontext->id);
        $this->getDataGenerator()->enrol_user($coursemanager->id, $course->id, $role);

        $this->setUser($coursemanager);

        $rows = export_templates::execute($coursecontext->id, []);

        $this->assertCount(0, $rows);
    }

    /**
     * A guest without the :use capability cannot export templates.
     */
    public function test_guest_cannot_export(): void {
        $this->setGuestUser();

        $this->expectException(\required_capability_exception::class);
        export_templates::execute(\context_system::instance()->id, []);
    }
}
