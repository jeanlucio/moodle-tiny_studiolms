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
 * PHPUnit tests for tiny_studiolms\external\get_templates.
 *
 * @package    tiny_studiolms
 * @copyright  2026 Jean Lúcio
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace tiny_studiolms\external;

use advanced_testcase;
use tiny_studiolms\external\get_templates;

/**
 * Tests for the get_templates external function.
 *
 * @covers \tiny_studiolms\external\get_templates
 */
final class get_templates_test extends advanced_testcase {
    /** @var \stdClass First teacher fixture. */
    private \stdClass $teacher1;

    /** @var \stdClass Second teacher fixture (ownership isolation). */
    private \stdClass $teacher2;

    /** @var \stdClass Manager fixture. */
    private \stdClass $manager;

    protected function setUp(): void {
        parent::setUp();
        global $DB;

        $this->resetAfterTest();

        $context = \context_system::instance();

        $this->teacher1 = $this->getDataGenerator()->create_user();
        $this->teacher2 = $this->getDataGenerator()->create_user();
        $this->manager  = $this->getDataGenerator()->create_user();

        $teacherrole = $this->getDataGenerator()->create_role();
        assign_capability('tiny/studiolms:use', CAP_ALLOW, $teacherrole, $context->id);
        role_assign($teacherrole, $this->teacher1->id, $context->id);
        role_assign($teacherrole, $this->teacher2->id, $context->id);

        $managerrole = $this->getDataGenerator()->create_role();
        assign_capability('tiny/studiolms:use', CAP_ALLOW, $managerrole, $context->id);
        assign_capability('tiny/studiolms:manageglobaltemplates', CAP_ALLOW, $managerrole, $context->id);
        role_assign($managerrole, $this->manager->id, $context->id);

        $now = time();

        // Personal template for teacher1.
        $DB->insert_record('tiny_studiolms_templates', (object) [
            'name'         => 'Teacher1 Layout',
            'content'      => '<p>T1</p>',
            'userid'       => $this->teacher1->id,
            'usermodified' => $this->teacher1->id,
            'isglobal'     => 0,
            'timecreated'  => $now,
            'timemodified' => $now,
        ]);

        // Personal template for teacher2 (must never appear in teacher1 results).
        $DB->insert_record('tiny_studiolms_templates', (object) [
            'name'         => 'Teacher2 Layout',
            'content'      => '<p>T2</p>',
            'userid'       => $this->teacher2->id,
            'usermodified' => $this->teacher2->id,
            'isglobal'     => 0,
            'timecreated'  => $now,
            'timemodified' => $now,
        ]);

        // Global template (visible to all).
        $DB->insert_record('tiny_studiolms_templates', (object) [
            'name'         => 'Global Layout',
            'content'      => '<p>Global</p>',
            'userid'       => $this->manager->id,
            'usermodified' => $this->manager->id,
            'isglobal'     => 1,
            'timecreated'  => $now,
            'timemodified' => $now,
        ]);
    }

    /**
     * type=mine returns only the current user's personal templates.
     */
    public function test_mine_returns_only_own_templates(): void {
        $this->setUser($this->teacher1);

        $rows = get_templates::execute('mine');

        $this->assertCount(1, $rows);
        $this->assertEquals('Teacher1 Layout', $rows[0]['name']);
        $this->assertTrue($rows[0]['ismine']);
    }

    /**
     * type=mine never exposes another user's private templates.
     */
    public function test_mine_excludes_other_users(): void {
        $this->setUser($this->teacher1);

        $rows = get_templates::execute('mine');
        $names = array_column($rows, 'name');

        $this->assertNotContains('Teacher2 Layout', $names);
    }

    /**
     * type=global returns only templates flagged as isglobal=1.
     */
    public function test_global_returns_only_global_templates(): void {
        $this->setUser($this->teacher1);

        $rows = get_templates::execute('global');

        $this->assertCount(1, $rows);
        $this->assertEquals('Global Layout', $rows[0]['name']);
        $this->assertEquals(1, $rows[0]['isglobal']);
    }

    /**
     * The isfavourite flag is false when the user has not favourited the template.
     */
    public function test_isfavourite_false_when_not_favourited(): void {
        $this->setUser($this->teacher1);

        $rows = get_templates::execute('global');

        $this->assertFalse($rows[0]['isfavourite']);
    }

    /**
     * The isfavourite flag is true after the user favourites the template.
     */
    public function test_isfavourite_true_after_favouriting(): void {
        global $DB;

        $this->setUser($this->teacher1);

        $globaltemplateid = $DB->get_field('tiny_studiolms_templates', 'id', ['isglobal' => 1]);
        $DB->insert_record('tiny_studiolms_favourites', (object) [
            'userid'      => $this->teacher1->id,
            'templateid'  => $globaltemplateid,
            'timecreated' => time(),
        ]);

        $rows = get_templates::execute('global');

        $this->assertTrue($rows[0]['isfavourite']);
    }

    /**
     * type=favourites returns only templates the current user has favourited.
     */
    public function test_favourites_returns_correct_set(): void {
        global $DB;

        $this->setUser($this->teacher1);

        $globaltemplateid = $DB->get_field('tiny_studiolms_templates', 'id', ['isglobal' => 1]);
        $DB->insert_record('tiny_studiolms_favourites', (object) [
            'userid'      => $this->teacher1->id,
            'templateid'  => $globaltemplateid,
            'timecreated' => time(),
        ]);

        $rows = get_templates::execute('favourites');

        $this->assertCount(1, $rows);
        $this->assertEquals('Global Layout', $rows[0]['name']);
    }

    /**
     * A user without the :use capability gets an access-denied exception.
     */
    public function test_guest_cannot_get_templates(): void {
        $this->setGuestUser();

        $this->expectException(\required_capability_exception::class);
        get_templates::execute('mine');
    }
}
