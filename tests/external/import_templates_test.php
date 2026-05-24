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
 * PHPUnit tests for tiny_studiolms\external\import_templates.
 *
 * @package    tiny_studiolms
 * @copyright  2026 Jean Lúcio
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace tiny_studiolms\tests\external;

use advanced_testcase;
use tiny_studiolms\external\import_templates;

/**
 * Tests for the import_templates external function.
 *
 * @covers \tiny_studiolms\external\import_templates
 */
final class import_templates_test extends advanced_testcase {
    /** @var \stdClass Teacher fixture. */
    private \stdClass $teacher;

    /** @var \stdClass Manager fixture. */
    private \stdClass $manager;

    protected function setUp(): void {
        parent::setUp();
        $this->resetAfterTest();

        $context = \context_system::instance();

        $this->teacher = $this->getDataGenerator()->create_user();
        $this->manager = $this->getDataGenerator()->create_user();

        $teacherrole = $this->getDataGenerator()->create_role();
        assign_capability('tiny/studiolms:use', CAP_ALLOW, $teacherrole, $context->id);
        role_assign($teacherrole, $this->teacher->id, $context->id);

        $managerrole = $this->getDataGenerator()->create_role();
        assign_capability('tiny/studiolms:use', CAP_ALLOW, $managerrole, $context->id);
        assign_capability('tiny/studiolms:manageglobaltemplates', CAP_ALLOW, $managerrole, $context->id);
        role_assign($managerrole, $this->manager->id, $context->id);
    }

    /**
     * A single template is correctly persisted and returned with the new ID.
     */
    public function test_import_single_template(): void {
        global $DB;

        $this->setUser($this->teacher);

        $result = import_templates::execute([
            ['name' => 'Imported', 'content' => '<p>A</p>', 'isglobal' => 0],
        ]);

        $this->assertCount(1, $result);
        $this->assertEquals('Imported', $result[0]['name']);
        $this->assertGreaterThan(0, $result[0]['id']);
        $this->assertTrue($DB->record_exists('tiny_studiolms_templates', ['id' => $result[0]['id']]));
    }

    /**
     * Importing a batch of templates returns all IDs.
     */
    public function test_import_multiple_templates(): void {
        $this->setUser($this->teacher);

        $payload = [
            ['name' => 'Alpha', 'content' => '<p>A</p>', 'isglobal' => 0],
            ['name' => 'Beta', 'content' => '<p>B</p>', 'isglobal' => 0],
            ['name' => 'Gamma', 'content' => '<p>G</p>', 'isglobal' => 0],
        ];

        $result = import_templates::execute($payload);

        $this->assertCount(3, $result);
    }

    /**
     * Duplicate names within the same import get a numeric suffix.
     */
    public function test_duplicate_name_gets_numeric_suffix(): void {
        global $DB;

        $this->setUser($this->teacher);
        $now = time();

        // Pre-existing template with the same name.
        $DB->insert_record('tiny_studiolms_templates', (object) [
            'name'         => 'My Layout',
            'content'      => '<p>old</p>',
            'userid'       => $this->teacher->id,
            'usermodified' => $this->teacher->id,
            'isglobal'     => 0,
            'timecreated'  => $now,
            'timemodified' => $now,
        ]);

        $result = import_templates::execute([
            ['name' => 'My Layout', 'content' => '<p>new</p>', 'isglobal' => 0],
        ]);

        $this->assertEquals('My Layout (2)', $result[0]['name']);
    }

    /**
     * Counter increments correctly when multiple collisions exist.
     */
    public function test_sequential_collision_resolution(): void {
        global $DB;

        $this->setUser($this->teacher);
        $now = time();

        foreach (['My Layout', 'My Layout (2)'] as $name) {
            $DB->insert_record('tiny_studiolms_templates', (object) [
                'name'         => $name,
                'content'      => '<p>x</p>',
                'userid'       => $this->teacher->id,
                'usermodified' => $this->teacher->id,
                'isglobal'     => 0,
                'timecreated'  => $now,
                'timemodified' => $now,
            ]);
        }

        $result = import_templates::execute([
            ['name' => 'My Layout', 'content' => '<p>new</p>', 'isglobal' => 0],
        ]);

        $this->assertEquals('My Layout (3)', $result[0]['name']);
    }

    /**
     * A teacher importing with isglobal=1 has the flag silently demoted to 0.
     */
    public function test_teacher_cannot_import_as_global(): void {
        global $DB;

        $this->setUser($this->teacher);

        $result = import_templates::execute([
            ['name' => 'Fake Global', 'content' => '<p>x</p>', 'isglobal' => 1],
        ]);

        $record = $DB->get_record('tiny_studiolms_templates', ['id' => $result[0]['id']], '*', MUST_EXIST);
        $this->assertEquals(0, (int) $record->isglobal);
    }

    /**
     * A manager can import with isglobal=1 and the flag is preserved.
     */
    public function test_manager_can_import_as_global(): void {
        global $DB;

        $this->setUser($this->manager);

        $result = import_templates::execute([
            ['name' => 'Real Global', 'content' => '<p>x</p>', 'isglobal' => 1],
        ]);

        $record = $DB->get_record('tiny_studiolms_templates', ['id' => $result[0]['id']], '*', MUST_EXIST);
        $this->assertEquals(1, (int) $record->isglobal);
    }

    /**
     * Each imported template fires a template_created event.
     */
    public function test_import_fires_template_created_events(): void {
        $this->setUser($this->teacher);

        $sink = $this->redirectEvents();
        import_templates::execute([
            ['name' => 'E1', 'content' => '<p>1</p>', 'isglobal' => 0],
            ['name' => 'E2', 'content' => '<p>2</p>', 'isglobal' => 0],
        ]);
        $events = $sink->get_events();
        $sink->close();

        $created = array_filter($events, fn($e) => $e->eventname === '\tiny_studiolms\event\template_created');
        $this->assertCount(2, $created);
    }
}
