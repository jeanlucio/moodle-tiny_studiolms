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
 * PHPUnit tests for tiny_studiolms\external\toggle_favourite.
 *
 * @package    tiny_studiolms
 * @copyright  2026 Jean Lúcio
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace tiny_studiolms\external;

use advanced_testcase;
use tiny_studiolms\external\toggle_favourite;

/**
 * Tests for the toggle_favourite external function.
 *
 * @covers \tiny_studiolms\external\toggle_favourite
 */
final class toggle_favourite_test extends advanced_testcase {
    /** @var \stdClass User fixture. */
    private \stdClass $teacher;

    /** @var int ID of the template fixture. */
    private int $templateid;

    protected function setUp(): void {
        parent::setUp();
        global $DB;

        $this->resetAfterTest();

        $context = \context_system::instance();

        $this->teacher = $this->getDataGenerator()->create_user();
        $role = $this->getDataGenerator()->create_role();
        assign_capability('tiny/studiolms:use', CAP_ALLOW, $role, $context->id);
        role_assign($role, $this->teacher->id, $context->id);

        $now = time();
        $this->templateid = $DB->insert_record('tiny_studiolms_templates', (object) [
            'name'         => 'A Template',
            'content'      => '<p>x</p>',
            'userid'       => $this->teacher->id,
            'usermodified' => $this->teacher->id,
            'isglobal'     => 0,
            'timecreated'  => $now,
            'timemodified' => $now,
        ]);
    }

    /**
     * Toggling on a non-favourited template creates a favourite record and returns favourited=true.
     */
    public function test_toggle_on_creates_favourite(): void {
        global $DB;

        $this->setUser($this->teacher);

        $result = toggle_favourite::execute($this->templateid);

        $this->assertTrue($result['favourited']);
        $this->assertTrue(
            $DB->record_exists('tiny_studiolms_favourites', [
                'userid'     => $this->teacher->id,
                'templateid' => $this->templateid,
            ])
        );
    }

    /**
     * Toggling off an already-favourited template removes the record and returns favourited=false.
     */
    public function test_toggle_off_removes_favourite(): void {
        global $DB;

        $this->setUser($this->teacher);

        // First toggle on.
        toggle_favourite::execute($this->templateid);

        // Then toggle off.
        $result = toggle_favourite::execute($this->templateid);

        $this->assertFalse($result['favourited']);
        $this->assertFalse(
            $DB->record_exists('tiny_studiolms_favourites', [
                'userid'     => $this->teacher->id,
                'templateid' => $this->templateid,
            ])
        );
    }

    /**
     * Two consecutive toggles on the same template leave no duplicate records.
     */
    public function test_no_duplicate_favourites(): void {
        global $DB;

        $this->setUser($this->teacher);

        toggle_favourite::execute($this->templateid);
        toggle_favourite::execute($this->templateid);
        toggle_favourite::execute($this->templateid);

        $count = $DB->count_records('tiny_studiolms_favourites', [
            'userid'     => $this->teacher->id,
            'templateid' => $this->templateid,
        ]);

        $this->assertEquals(1, $count);
    }

    /**
     * Toggling on a non-existent template throws a dml_missing_record_exception.
     */
    public function test_toggle_nonexistent_template_throws(): void {
        $this->setUser($this->teacher);

        $this->expectException(\dml_missing_record_exception::class);
        toggle_favourite::execute(99999);
    }

    /**
     * A guest without the :use capability cannot toggle favourites.
     */
    public function test_guest_cannot_toggle_favourite(): void {
        $this->setGuestUser();

        $this->expectException(\required_capability_exception::class);
        toggle_favourite::execute($this->templateid);
    }
}
