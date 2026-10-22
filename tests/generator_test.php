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
 * PHPUnit tests for the tiny_studiolms test data generator.
 *
 * @package    tiny_studiolms
 * @copyright  2026 Jean Lúcio
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace tiny_studiolms;

use advanced_testcase;
use tiny_studiolms\external\get_templates;

/**
 * Tests that the generator used by the Behat scenarios produces templates the plugin can serve.
 *
 * @coversNothing
 */
final class generator_test extends advanced_testcase {
    /**
     * A personal template belongs to the given user and is listed for that user only.
     */
    public function test_personal_template_is_listed_for_its_owner(): void {
        $this->resetAfterTest();

        $owner = $this->getDataGenerator()->create_user();
        $other = $this->getDataGenerator()->create_user();
        $generator = $this->getDataGenerator()->get_plugin_generator('tiny_studiolms');
        $row = $generator->create_template(['name' => 'Weekly layout', 'userid' => $owner->id]);

        $this->assertSame(0, (int) $row->isglobal);
        $this->assertSame((int) $owner->id, (int) $row->userid);
        $this->assertStringContainsString('data-slms-block-type="callout"', $row->content);

        $role = $this->getDataGenerator()->create_role();
        assign_capability('tiny/studiolms:use', CAP_ALLOW, $role, \context_system::instance()->id);
        role_assign($role, $owner->id, \context_system::instance()->id);
        role_assign($role, $other->id, \context_system::instance()->id);
        $contextid = \context_system::instance()->id;

        $this->setUser($owner);
        $this->assertSame(['Weekly layout'], array_column(get_templates::execute($contextid, 'mine'), 'name'));

        $this->setUser($other);
        $this->assertSame([], get_templates::execute($contextid, 'mine'));
    }

    /**
     * Without a user the template is stored under the admin, and a global flag is kept.
     */
    public function test_global_template_defaults_to_the_admin(): void {
        $this->resetAfterTest();

        $generator = $this->getDataGenerator()->get_plugin_generator('tiny_studiolms');
        $row = $generator->create_template(['name' => 'Official layout', 'isglobal' => 1, 'content' => '<p>x</p>']);

        $this->assertSame(1, (int) $row->isglobal);
        $this->assertSame((int) get_admin()->id, (int) $row->userid);
        $this->assertSame('<p>x</p>', $row->content);
    }
}
