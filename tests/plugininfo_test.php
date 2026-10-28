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
     * The configuration tells the editor whether the user has accepted the site's AI usage policy.
     *
     * Regression test: the plugin sent what teachers type to an external AI provider without ever asking for
     * the policy the core shows for every other AI feature, and nothing told the editor whether it was
     * accepted. The value is per user and follows the core's own record of the acceptance.
     */
    public function test_policyagreed_follows_the_core_ai_policy_acceptance(): void {
        $course = $this->getDataGenerator()->create_course();
        $coursecontext = \context_course::instance($course->id);
        $teacher = $this->getDataGenerator()->create_and_enrol($course, 'teacher');
        $other = $this->getDataGenerator()->create_and_enrol($course, 'teacher');

        $this->setUser($teacher);
        $config = plugininfo::get_plugin_configuration_for_context($coursecontext, [], []);
        $this->assertFalse($config['policyagreed']);

        \core_ai\manager::user_policy_accepted($teacher->id, $coursecontext->id);
        $config = plugininfo::get_plugin_configuration_for_context($coursecontext, [], []);
        $this->assertTrue($config['policyagreed']);

        // Another teacher has not accepted anything.
        $this->setUser($other);
        $config = plugininfo::get_plugin_configuration_for_context($coursecontext, [], []);
        $this->assertFalse($config['policyagreed']);
    }

    /**
     * The widgets of the filter are offered only when the filter is there, as the ones it has turned on, and the
     * Studio is told whether the filter is on in the course.
     */
    public function test_configuration_offers_the_widgets_of_the_filter_when_it_is_there(): void {
        $this->resetAfterTest();
        $course = $this->getDataGenerator()->create_course();
        $coursecontext = \context_course::instance($course->id);
        $teacher = $this->getDataGenerator()->create_and_enrol($course, 'teacher');
        $this->setUser($teacher);

        $config = plugininfo::get_plugin_configuration_for_context($coursecontext, [], []);

        if (!class_exists(\filter_studiolms\widgets::class)) {
            $this->assertSame([], $config['widgets']);
            return;
        }
        $this->assertSame(array_values(\filter_studiolms\widgets::enabled()), $config['widgets']);

        set_config('enable_coursemap', 0, 'filter_studiolms');
        $config = plugininfo::get_plugin_configuration_for_context($coursecontext, [], []);
        $this->assertNotContains('coursemap', $config['widgets']);

        // The filter is available but off in a course until a teacher turns it on there.
        filter_set_global_state('studiolms', TEXTFILTER_OFF);
        $this->assertFalse(plugininfo::get_plugin_configuration_for_context($coursecontext, [], [])['widgetsactive']);
        filter_set_global_state('studiolms', TEXTFILTER_ON);
        $this->assertTrue(plugininfo::get_plugin_configuration_for_context($coursecontext, [], [])['widgetsactive']);
    }

    /**
     * A filter that speaks another version of the marker syntax is not offered: the Studio would write markers it
     * cannot read.
     */
    public function test_widgets_of_another_version_of_the_syntax_are_not_offered(): void {
        $this->resetAfterTest();

        $method = new \ReflectionMethod(plugininfo::class, 'get_widgets');

        $this->assertSame([], $method->invoke(null, 999));
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
     * hasai follows the provider chain: false with no AI source, true once local_aihub has a key.
     */
    public function test_hasai_flag_follows_provider_chain(): void {
        $course = $this->getDataGenerator()->create_course();
        $coursecontext = \context_course::instance($course->id);
        $teacher = $this->getDataGenerator()->create_and_enrol($course, 'teacher');
        $this->setUser($teacher);

        $config = plugininfo::get_plugin_configuration_for_context($coursecontext, [], []);
        $this->assertFalse($config['hasai']);

        if (!class_exists(\local_aihub\ai::class)) {
            $this->markTestSkipped('local_aihub is not installed.');
        }
        set_config('gemini_key', 'a-key', 'local_aihub');

        $config = plugininfo::get_plugin_configuration_for_context($coursecontext, [], []);
        $this->assertTrue($config['hasai']);
    }

    /**
     * The AI Hub personal-keys link follows the site toggle and the usepersonalkey capability.
     *
     * The teacher gets the role from a course enrolment only, which is how teachers hold it on a real
     * site: a capability checked in the system context alone is never true for them. Assigning the
     * role in the system context in a test would hide that, so it is never done here.
     */
    public function test_aihubkeysurl_is_offered_to_a_course_enrolled_teacher(): void {
        if (!class_exists(\local_aihub\ai::class)) {
            $this->markTestSkipped('local_aihub is not installed.');
        }
        $course = $this->getDataGenerator()->create_course();
        $coursecontext = \context_course::instance($course->id);
        $teacher = $this->getDataGenerator()->create_and_enrol($course, 'editingteacher');
        $student = $this->getDataGenerator()->create_and_enrol($course, 'student');

        $this->setUser($teacher);
        set_config('enablepersonalkeys', 0, 'local_aihub');
        $config = plugininfo::get_plugin_configuration_for_context($coursecontext, [], []);
        $this->assertSame('', $config['aihubkeysurl'], 'The link needs the site toggle.');

        set_config('enablepersonalkeys', 1, 'local_aihub');
        $config = plugininfo::get_plugin_configuration_for_context($coursecontext, [], []);
        $this->assertStringEndsWith('/local/aihub/mykeys.php', $config['aihubkeysurl']);

        $this->setUser($student);
        $config = plugininfo::get_plugin_configuration_for_context($coursecontext, [], []);
        $this->assertSame('', $config['aihubkeysurl'], 'A student does not hold the capability.');
    }

    /**
     * A teacher who is denied the capability in the course does not get the link there.
     */
    public function test_aihubkeysurl_is_hidden_when_the_course_denies_the_capability(): void {
        if (!class_exists(\local_aihub\ai::class)) {
            $this->markTestSkipped('local_aihub is not installed.');
        }
        set_config('enablepersonalkeys', 1, 'local_aihub');
        $course = $this->getDataGenerator()->create_course();
        $coursecontext = \context_course::instance($course->id);
        $teacher = $this->getDataGenerator()->create_and_enrol($course, 'editingteacher');
        $roleid = $this->getDataGenerator()->create_role();
        assign_capability('local/aihub:usepersonalkey', CAP_PROHIBIT, $roleid, $coursecontext->id);
        $this->getDataGenerator()->role_assign($roleid, $teacher->id, $coursecontext->id);
        $this->setUser($teacher);

        $config = plugininfo::get_plugin_configuration_for_context($coursecontext, [], []);

        $this->assertSame('', $config['aihubkeysurl']);
    }

    /**
     * Where the editor has no course (a profile page, the site front page) the capability a teacher
     * holds in a course still counts, as it does on the hub's own page.
     */
    public function test_aihubkeysurl_is_offered_outside_a_course_to_a_course_teacher(): void {
        if (!class_exists(\local_aihub\ai::class)) {
            $this->markTestSkipped('local_aihub is not installed.');
        }
        set_config('enablepersonalkeys', 1, 'local_aihub');
        $course = $this->getDataGenerator()->create_course();
        $teacher = $this->getDataGenerator()->create_and_enrol($course, 'editingteacher');
        $this->setUser($teacher);

        $config = plugininfo::get_plugin_configuration_for_context(\context_system::instance(), [], []);

        $this->assertStringEndsWith('/local/aihub/mykeys.php', $config['aihubkeysurl']);
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
     * presets/pt_br/ and presets/en/ ship real preset JSON files; pt_br exercises the real
     * glob-and-decode path for a language that has a directory of its own.
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
     * English sites get the ready-made layouts, in English.
     *
     * Regression test: only presets/pt_br/ had content and presets/en/ held a .gitkeep, so every site or teacher
     * not using Brazilian Portuguese had no ready-made layout in the official library, and the AI assistant
     * had none to apply.
     */
    public function test_english_presets_are_loaded(): void {
        $course = $this->getDataGenerator()->create_course();
        $coursecontext = \context_course::instance($course->id);
        $teacher = $this->getDataGenerator()->create_and_enrol($course, 'teacher');
        $this->setUser($teacher);
        $this->force_language_for_test('en');

        $config = plugininfo::get_plugin_configuration_for_context($coursecontext, [], []);

        $names = array_column($config['presets'], 'name');
        $this->assertCount(26, $names);
        $this->assertContains('Module Start', $names);
        $this->assertNotContains('Início de Módulo', $names);
    }

    /**
     * A language with no preset directory of its own gets the English layouts rather than none.
     *
     * For 'fr' the plugin's own is_dir($langdir) check fails first (there is no presets/fr/), which triggers the
     * fallback assignment to presets/en/, a branch that requesting 'en' directly never reaches.
     */
    public function test_presets_fall_back_to_english_for_a_language_with_no_directory(): void {
        $course = $this->getDataGenerator()->create_course();
        $coursecontext = \context_course::instance($course->id);
        $teacher = $this->getDataGenerator()->create_and_enrol($course, 'teacher');
        $this->setUser($teacher);

        $this->force_language_for_test('en');
        $english = plugininfo::get_plugin_configuration_for_context($coursecontext, [], [])['presets'];

        $this->force_language_for_test('fr');
        $config = plugininfo::get_plugin_configuration_for_context($coursecontext, [], []);

        $this->assertNotEmpty($config['presets']);
        $this->assertSame($english, $config['presets']);
    }

    /**
     * The teacher is told once that the ready-made layouts are not in their language.
     *
     * Only a language with no folder of its own under presets/ is shown the English layouts as a stand-in, so only
     * it needs the notice; once the editor has saved the preference, it is not asked for again.
     */
    public function test_presetnotice_is_due_once_and_only_for_a_stand_in_language(): void {
        $course = $this->getDataGenerator()->create_course();
        $coursecontext = \context_course::instance($course->id);
        $teacher = $this->getDataGenerator()->create_and_enrol($course, 'teacher');
        $other = $this->getDataGenerator()->create_and_enrol($course, 'teacher');
        $this->setUser($teacher);

        foreach (['en' => false, 'pt_br' => false, 'fr' => true, 'pt' => true] as $lang => $due) {
            $this->force_language_for_test($lang);
            $config = plugininfo::get_plugin_configuration_for_context($coursecontext, [], []);
            $this->assertSame($due, $config['presetnotice'], $lang);
        }

        // Saved as seen: not asked again, in any language.
        $this->force_language_for_test('fr');
        set_user_preference('tiny_studiolms_presetnotice_seen', 1);
        $config = plugininfo::get_plugin_configuration_for_context($coursecontext, [], []);
        $this->assertFalse($config['presetnotice']);

        // The preference is the user's own: another teacher is still to be told.
        $this->setUser($other);
        $this->force_language_for_test('fr');
        $config = plugininfo::get_plugin_configuration_for_context($coursecontext, [], []);
        $this->assertTrue($config['presetnotice']);
    }

    /**
     * The administrator can switch the ready-made layouts off, and a site that never saved the setting has them.
     *
     * The editor is sent no layouts and no notice about them, in any language, so its tab for them is not drawn.
     */
    public function test_the_presets_can_be_switched_off_in_the_settings(): void {
        $course = $this->getDataGenerator()->create_course();
        $coursecontext = \context_course::instance($course->id);
        $teacher = $this->getDataGenerator()->create_and_enrol($course, 'teacher');
        $this->setUser($teacher);

        foreach (['en', 'fr'] as $lang) {
            $this->force_language_for_test($lang);

            // Never saved: on.
            $config = plugininfo::get_plugin_configuration_for_context($coursecontext, [], []);
            $this->assertNotEmpty($config['presets'], "$lang, never saved");

            set_config('showpresets', 0, 'tiny_studiolms');
            $config = plugininfo::get_plugin_configuration_for_context($coursecontext, [], []);
            $this->assertSame([], $config['presets'], "$lang, off");
            $this->assertFalse($config['presetnotice'], "$lang, off, notice");

            set_config('showpresets', 1, 'tiny_studiolms');
            $config = plugininfo::get_plugin_configuration_for_context($coursecontext, [], []);
            $this->assertNotEmpty($config['presets'], "$lang, on");

            unset_config('showpresets', 'tiny_studiolms');
        }
    }

    /**
     * The setting is on the admin tree, a checkbox that is on by default.
     *
     * Regression test: a settings.php that the plugin type does not load would leave the administrator with
     * nothing to switch.
     */
    public function test_the_setting_is_offered_to_the_administrator(): void {
        global $CFG;
        require_once($CFG->libdir . '/adminlib.php');
        $this->setAdminUser();

        $page = admin_get_root(true, true)->locate('tiny_studiolms_settings');

        $this->assertInstanceOf(\admin_settingpage::class, $page);
        $this->assertObjectHasProperty('tiny_studiolmsshowpresets', $page->settings);
        $setting = $page->settings->tiny_studiolmsshowpresets;
        $this->assertInstanceOf(\admin_setting_configcheckbox::class, $setting);
        $this->assertSame('tiny_studiolms', $setting->plugin);
        $this->assertSame('showpresets', $setting->name);
        $this->assertSame('1', (string) $setting->get_defaultsetting());
    }

    /**
     * The preference is declared, so the core lets the browser save it, and only for the user it belongs to.
     *
     * Regression test for the declaration: without the lib.php callback the core refuses to save a preference
     * the browser sets, and the notice would be shown on every visit.
     */
    public function test_the_preference_is_declared_for_the_current_user_only(): void {
        $preferences = component_callback('tiny_studiolms', 'user_preferences');

        $this->assertArrayHasKey('tiny_studiolms_presetnotice_seen', $preferences);
        $definition = $preferences['tiny_studiolms_presetnotice_seen'];
        $this->assertSame(PARAM_BOOL, $definition['type']);
        $this->assertSame([\core_user::class, 'is_current_user'], $definition['permissioncallback']);

        $user = $this->getDataGenerator()->create_user();
        $this->setUser($user);
        $this->assertTrue(\core_user::is_current_user($user));
        $this->assertFalse(\core_user::is_current_user($this->getDataGenerator()->create_user()));
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
