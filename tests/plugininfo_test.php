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
     * manageglobaltemplates is declared at CONTEXT_SYSTEM: a user who only holds it at a course
     * context (a common delegation pattern for the manager archetype) must not see
     * canmanageglobaltemplates=true for that course, since every web service checks the same
     * capability against \context_system::instance() regardless of what this flag says.
     */
    public function test_canmanageglobaltemplates_ignores_course_scoped_capability(): void {
        $course = $this->getDataGenerator()->create_course();
        $coursecontext = \context_course::instance($course->id);

        $coursemanager = $this->getDataGenerator()->create_user();
        $role = $this->getDataGenerator()->create_role();
        assign_capability('tiny/studiolms:use', CAP_ALLOW, $role, $coursecontext->id);
        assign_capability('tiny/studiolms:manageglobaltemplates', CAP_ALLOW, $role, $coursecontext->id);
        $this->getDataGenerator()->enrol_user($coursemanager->id, $course->id, $role);

        $this->setUser($coursemanager);

        $config = plugininfo::get_plugin_configuration_for_context($coursecontext, [], []);

        $this->assertFalse($config['canmanageglobaltemplates']);
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
     * Forces current_language() to a given value for this test only.
     *
     * force_current_language() itself refuses to set a language that is not a fully
     * installed core language pack (core_string_manager::translation_exists()) — true
     * for 'pt_br' or 'fr' on a real site, but never true in PHPUnit's own isolated
     * dataroot, which never has any pack beyond 'en' installed. load_presets() only
     * cares about the raw language code matching a directory name, not about a core
     * pack being installed, so this bypasses that unrelated gate directly.
     *
     * @param string $lang Language code to force, e.g. 'pt_br'.
     */
    private function force_language_for_test(string $lang): void {
        global $SESSION;
        $SESSION->forcelang = $lang;
    }

    /**
     * Presets are loaded from the language-specific directory when one exists.
     *
     * presets/pt_br/ ships real preset JSON files; this is the only language directory
     * that currently has content (presets/en/ is an empty placeholder), so pt_br is what
     * exercises the real glob-and-decode path.
     */
    public function test_presets_are_loaded_for_a_language_with_real_files(): void {
        $course = $this->getDataGenerator()->create_course();
        $coursecontext = \context_course::instance($course->id);
        $teacher = $this->getDataGenerator()->create_and_enrol($course, 'teacher');
        $this->setUser($teacher);
        $this->force_language_for_test('pt_br');

        $config = plugininfo::get_plugin_configuration_for_context($coursecontext, [], []);

        $this->assertNotEmpty($config['presets']);
        foreach ($config['presets'] as $preset) {
            $this->assertArrayHasKey('name', $preset);
            $this->assertTrue(!empty($preset['blocks']) || !empty($preset['content']));
        }
    }

    /**
     * Presets fall back to an empty list, not an error, for a language with no preset files.
     *
     * presets/en/ exists but only holds a .gitkeep placeholder, so is_dir() short-circuits
     * the fallback-to-'en' branch yet glob() still finds nothing to load.
     */
    public function test_presets_are_empty_for_language_with_no_preset_files(): void {
        $course = $this->getDataGenerator()->create_course();
        $coursecontext = \context_course::instance($course->id);
        $teacher = $this->getDataGenerator()->create_and_enrol($course, 'teacher');
        $this->setUser($teacher);
        $this->force_language_for_test('en');

        $config = plugininfo::get_plugin_configuration_for_context($coursecontext, [], []);

        $this->assertSame([], $config['presets']);
    }

    /**
     * A language with no preset directory of its own falls back to 'en' rather than erroring.
     *
     * This exercises a different branch than the 'en' test above: for 'fr', the plugin's own
     * is_dir($langdir) check fails first (no presets/fr/ at all), triggering the fallback
     * assignment to presets/en/ — whereas requesting 'en' directly matches on the first check
     * and never reaches that fallback line.
     */
    public function test_presets_fall_back_to_english_for_a_language_with_no_directory(): void {
        $course = $this->getDataGenerator()->create_course();
        $coursecontext = \context_course::instance($course->id);
        $teacher = $this->getDataGenerator()->create_and_enrol($course, 'teacher');
        $this->setUser($teacher);
        $this->force_language_for_test('fr');

        $config = plugininfo::get_plugin_configuration_for_context($coursecontext, [], []);

        $this->assertSame([], $config['presets']);
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
