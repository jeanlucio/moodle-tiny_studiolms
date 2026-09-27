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
 * PHPUnit tests for tiny_studiolms\plugininfo.
 *
 * @package    tiny_studiolms
 * @copyright  2026 Jean Lúcio
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace tiny_studiolms;

use advanced_testcase;

/**
 * Tests for the Tiny editor plugin info class.
 *
 * @covers \tiny_studiolms\plugininfo
 */
final class plugininfo_test extends advanced_testcase {
    #[\Override]
    protected function setUp(): void {
        parent::setUp();
        $this->resetAfterTest();
    }

    /**
     * is_enabled() reflects whether the current user holds tiny/studiolms:use in the context.
     */
    public function test_is_enabled_reflects_capability(): void {
        $course = $this->getDataGenerator()->create_course();
        $coursecontext = \context_course::instance($course->id);
        $teacher = $this->getDataGenerator()->create_and_enrol($course, 'teacher');
        $this->setUser($teacher);

        $this->assertTrue(plugininfo::is_enabled($coursecontext, [], []));

        $student = $this->getDataGenerator()->create_and_enrol($course, 'student');
        $this->setUser($student);

        $this->assertFalse(plugininfo::is_enabled($coursecontext, [], []));
    }

    /**
     * get_plugin_configuration_for_context() threads back the real context id.
     *
     * This is what lets every web service call re-check the capability in the same
     * context the toolbar button's own visibility was gated on, instead of a hardcoded
     * context_system an ordinary course-enrolled teacher never satisfies.
     */
    public function test_configuration_threads_back_the_real_context_id(): void {
        $course = $this->getDataGenerator()->create_course();
        $coursecontext = \context_course::instance($course->id);
        $teacher = $this->getDataGenerator()->create_and_enrol($course, 'teacher');
        $this->setUser($teacher);

        $config = plugininfo::get_plugin_configuration_for_context($coursecontext, [], []);

        $this->assertSame($coursecontext->id, $config['contextid']);
        $this->assertTrue($config['enabled']);
    }

    /**
     * hasai is true once any provider key resolves, and false when none does.
     */
    public function test_hasai_flag_reflects_configured_keys(): void {
        $course = $this->getDataGenerator()->create_course();
        $coursecontext = \context_course::instance($course->id);
        $teacher = $this->getDataGenerator()->create_and_enrol($course, 'teacher');
        $this->setUser($teacher);

        set_config('apikey_gemini', '', 'tiny_studiolms');
        set_config('apikey_groq', '', 'tiny_studiolms');
        set_config('apikey_custom', '', 'tiny_studiolms');
        unset_user_preference('tiny_studiolms_gemini_key', $teacher);
        unset_user_preference('tiny_studiolms_groq_key', $teacher);
        unset_user_preference('tiny_studiolms_custom_key', $teacher);

        $config = plugininfo::get_plugin_configuration_for_context($coursecontext, [], []);
        $this->assertFalse($config['hasai']);

        set_user_preference('tiny_studiolms_gemini_key', 'a-key', $teacher);

        $config = plugininfo::get_plugin_configuration_for_context($coursecontext, [], []);
        $this->assertTrue($config['hasai']);
    }

    /**
     * get_available_buttons() declares exactly the one toolbar button owned by this plugin.
     */
    public function test_get_available_buttons(): void {
        $buttons = plugininfo::get_available_buttons();

        $this->assertArrayHasKey('tiny_studiolms', $buttons);
    }

    /**
     * get_available_menuitems() places the plugin's item in the Tools menu.
     */
    public function test_get_available_menuitems(): void {
        $menuitems = plugininfo::get_available_menuitems();

        $this->assertArrayHasKey('tools', $menuitems);
        $this->assertContains('tiny_studiolms', $menuitems['tools']);
    }
}
