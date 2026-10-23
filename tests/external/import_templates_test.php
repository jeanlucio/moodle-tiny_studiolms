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

namespace tiny_studiolms\external;

use advanced_testcase;
use core_external\external_api;
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

    /** @var int[] Transaction nesting depth at each template_created event, in order. */
    private static array $depths = [];

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

        $result = import_templates::execute(\context_system::instance()->id, [
            ['name' => 'Imported', 'content' => '<p>A</p>', 'isglobal' => 0],
        ]);

        $this->assertCount(1, $result);
        $this->assertEquals('Imported', $result[0]['name']);
        $this->assertGreaterThan(0, $result[0]['id']);
        $this->assertEquals($result, external_api::clean_returnvalue(import_templates::execute_returns(), $result));
        $this->assertTrue($DB->record_exists('tiny_studiolms_templates', ['id' => $result[0]['id']]));
    }

    /**
     * The official flag takes only 0 or 1; a batch with any other number is refused whole.
     *
     * Regression test: the flag was an integer written as it came, so a 2 became a template that no
     * tab lists and that neither the deletion nor the anonymisation of the privacy provider reaches.
     */
    public function test_a_flag_that_is_not_zero_or_one_is_refused(): void {
        global $DB;

        $this->setUser($this->manager);

        try {
            import_templates::execute(\context_system::instance()->id, [
                ['name' => 'Fine', 'content' => '<p>A</p>', 'isglobal' => 1],
                ['name' => 'Odd flag', 'content' => '<p>B</p>', 'isglobal' => 2],
            ]);
            $this->fail('A flag of 2 was accepted.');
        } catch (\invalid_parameter_exception $e) {
            $this->assertSame(0, $DB->count_records('tiny_studiolms_templates'));
        }
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

        $result = import_templates::execute(\context_system::instance()->id, $payload);

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

        $result = import_templates::execute(\context_system::instance()->id, [
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

        $result = import_templates::execute(\context_system::instance()->id, [
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

        $result = import_templates::execute(\context_system::instance()->id, [
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

        $result = import_templates::execute(\context_system::instance()->id, [
            ['name' => 'Real Global', 'content' => '<p>x</p>', 'isglobal' => 1],
        ]);

        $record = $DB->get_record('tiny_studiolms_templates', ['id' => $result[0]['id']], '*', MUST_EXIST);
        $this->assertEquals(1, (int) $record->isglobal);
    }

    /**
     * manageglobaltemplates is declared at CONTEXT_SYSTEM: a user who only holds it at a course
     * context (a common delegation pattern for the manager archetype) must have isglobal=1
     * silently demoted to 0 for that import, exactly like an ordinary teacher.
     */
    public function test_course_scoped_manager_cannot_import_as_global(): void {
        global $DB;

        $course = $this->getDataGenerator()->create_course();
        $coursecontext = \context_course::instance($course->id);

        $coursemanager = $this->getDataGenerator()->create_user();
        $role = $this->getDataGenerator()->create_role();
        assign_capability('tiny/studiolms:use', CAP_ALLOW, $role, $coursecontext->id);
        assign_capability('tiny/studiolms:manageglobaltemplates', CAP_ALLOW, $role, $coursecontext->id);
        $this->getDataGenerator()->enrol_user($coursemanager->id, $course->id, $role);

        $this->setUser($coursemanager);

        $result = import_templates::execute($coursecontext->id, [
            ['name' => 'Fake Global', 'content' => '<p>x</p>', 'isglobal' => 1],
        ]);

        $record = $DB->get_record('tiny_studiolms_templates', ['id' => $result[0]['id']], '*', MUST_EXIST);
        $this->assertEquals(0, (int) $record->isglobal);
    }

    /**
     * Each imported template fires a template_created event.
     */
    public function test_import_fires_template_created_events(): void {
        $this->setUser($this->teacher);

        $sink = $this->redirectEvents();
        import_templates::execute(\context_system::instance()->id, [
            ['name' => 'E1', 'content' => '<p>1</p>', 'isglobal' => 0],
            ['name' => 'E2', 'content' => '<p>2</p>', 'isglobal' => 0],
        ]);
        $events = $sink->get_events();
        $sink->close();

        $created = array_filter($events, fn($e) => $e->eventname === '\tiny_studiolms\event\template_created');
        $this->assertCount(2, $created);
    }

    /**
     * A name that already fills the column still gets its " (2)" suffix and fits.
     *
     * Regression test: the suffix used to be appended to the whole name, so a 255 character name came
     * out at 259 and the insert failed with a database error.
     */
    public function test_collision_suffix_keeps_the_name_within_the_column(): void {
        global $DB;

        $this->setUser($this->teacher);
        $longname = str_repeat('é', 255);
        $contextid = \context_system::instance()->id;
        save_template::execute($contextid, $longname, '<p>one</p>', 0);

        $result = import_templates::execute($contextid, [
            ['name' => $longname, 'content' => '<p>two</p>', 'isglobal' => 0],
            ['name' => $longname, 'content' => '<p>three</p>', 'isglobal' => 0],
        ]);

        $this->assertCount(2, $result);
        $this->assertSame(255, \core_text::strlen($result[0]['name']));
        $this->assertStringEndsWith(' (2)', $result[0]['name']);
        $this->assertSame(255, \core_text::strlen($result[1]['name']));
        $this->assertStringEndsWith(' (3)', $result[1]['name']);
        $this->assertSame(3, $DB->count_records('tiny_studiolms_templates', ['userid' => $this->teacher->id]));
    }

    /**
     * unique_name() leaves a free name alone and numbers a taken one from 2.
     */
    public function test_unique_name(): void {
        $this->assertSame('Plan', import_templates::unique_name('Plan', []));
        $this->assertSame('Plan (2)', import_templates::unique_name('Plan', ['Plan' => true]));
        $this->assertSame(
            'Plan (3)',
            import_templates::unique_name('Plan', ['Plan' => true, 'Plan (2)' => true])
        );
        $long = str_repeat('x', 255);
        $unique = import_templates::unique_name($long, [$long => true]);
        $this->assertSame(255, strlen($unique));
        $this->assertSame(str_repeat('x', 251) . ' (2)', $unique);
    }

    /**
     * The whole batch is written inside one database transaction of its own.
     *
     * Regression test: each template was saved on its own, so a failure halfway left the first ones
     * in the library and importing the file again duplicated them. Inside a transaction a failure
     * rolls the batch back as a whole. The PHPUnit runner already keeps a transaction open around
     * every test, so "a transaction is open" proves nothing: what is compared is the nesting depth,
     * read while each template is saved (an observer of the event it fires, which the core calls
     * straight away even inside a transaction).
     */
    public function test_the_batch_is_written_in_a_single_transaction(): void {
        $this->setUser($this->teacher);
        $depthbefore = self::transaction_depth();
        self::$depths = [];
        \core\event\manager::phpunit_replace_observers([[
            'eventname' => '\\tiny_studiolms\\event\\template_created',
            'callback' => self::class . '::record_transaction_depth',
        ]]);

        import_templates::execute(\context_system::instance()->id, [
            ['name' => 'First', 'content' => '<p>1</p>', 'isglobal' => 0],
            ['name' => 'Second', 'content' => '<p>2</p>', 'isglobal' => 0],
            ['name' => 'Third', 'content' => '<p>3</p>', 'isglobal' => 0],
        ]);

        $this->assertSame(
            [$depthbefore + 1, $depthbefore + 1, $depthbefore + 1],
            self::$depths,
            'Every template must be saved inside the one transaction the batch opens.'
        );
        $this->assertSame($depthbefore, self::transaction_depth(), 'The batch left its transaction open.');
    }

    /**
     * Returns how many transactions are nested open on the database connection.
     *
     * @return int
     */
    private static function transaction_depth(): int {
        global $DB;

        $property = new \ReflectionProperty(\moodle_database::class, 'transactions');
        return count($property->getValue($DB));
    }

    /**
     * Observer of template_created that records how deep the database transactions are nested.
     */
    public static function record_transaction_depth(): void {
        self::$depths[] = self::transaction_depth();
    }
}
