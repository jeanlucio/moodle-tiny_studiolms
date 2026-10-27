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
 * Plugin info class for tiny_studiolms.
 *
 * @package    tiny_studiolms
 * @copyright  2026 Jean Lúcio
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace tiny_studiolms;

use context;
use editor_tiny\editor;
use editor_tiny\plugin;
use editor_tiny\plugin_with_buttons;
use editor_tiny\plugin_with_configuration;
use editor_tiny\plugin_with_menuitems;

/**
 * Plugin info class.
 *
 * @package    tiny_studiolms
 * @copyright  2026 Jean Lúcio
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class plugininfo extends plugin implements plugin_with_buttons, plugin_with_configuration, plugin_with_menuitems {
    /**
     * Enable the plugin only for users who hold tiny/studiolms:use in the given context.
     *
     * By default this grants access to editing teachers, teachers, and managers.
     * Students receive no access and will not see the Studio toolbar button.
     *
     * @param context $context
     * @param array $options
     * @param array $fpoptions
     * @param editor|null $editor
     * @return bool
     */
    #[\Override]
    public static function is_enabled(
        context $context,
        array $options,
        array $fpoptions,
        ?editor $editor = null
    ): bool {
        return has_capability('tiny/studiolms:use', $context);
    }

    /**
     * Returns plugin configuration for the current context.
     *
     * @param context $context
     * @param array $options
     * @param array $fpoptions
     * @param \editor_tiny\editor|null $editor
     * @return array
     */
    public static function get_plugin_configuration_for_context(
        context $context,
        array $options,
        array $fpoptions,
        ?\editor_tiny\editor $editor = null
    ): array {
        return [
            'enabled'                  => has_capability('tiny/studiolms:use', $context),
            // The manageglobaltemplates capability is a site-wide power (CONTEXT_SYSTEM in db/access.php), never
            // scoped by the editor's own $context — checking it here against $context would show
            // the global-template UI affordances to a manager delegated only at a course or
            // category level, even though every web service they would call is now correctly
            // gated on \context_system::instance() for that same capability.
            'canmanageglobaltemplates' => has_capability(
                'tiny/studiolms:manageglobaltemplates',
                \context_system::instance()
            ),
            'presets'                  => self::presets_enabled() ? self::load_presets(current_language()) : [],
            'hasai'                    => ai\provider_chain::has_ai($context),
            'presetnotice'             => self::presets_enabled() && self::preset_notice_due(current_language()),
            'policyagreed'             => self::ai_policy_agreed(),
            'aihubkeysurl'             => self::aihub_keys_url($context),
            // Threaded back to every web service call so require_capability() there checks the
            // same real context this button's own visibility was gated on, instead of a
            // hardcoded context_system that an ordinary course-enrolled teacher never satisfies.
            'contextid'                => $context->id,
        ];
    }

    /**
     * Tells whether the current user has accepted the site's AI usage policy.
     *
     * The text a teacher types into the AI tabs goes to an external provider, and the core asks whoever
     * offers an AI feature to show the policy before the first use and keeps the answer in
     * ai_policy_register. The editor reads this value to know whether to show it, as tiny_aiplacement does.
     *
     * @return bool
     */
    private static function ai_policy_agreed(): bool {
        global $USER;

        if (!class_exists(\core_ai\manager::class) || !method_exists(\core_ai\manager::class, 'get_user_policy_status')) {
            return true;
        }
        return \core_ai\manager::get_user_policy_status((int) $USER->id);
    }

    /**
     * Returns the local_aihub personal-keys page URL when the teacher can actually use it, or ''.
     *
     * Shown in the "AI not available" state so a teacher can plug in their own key without an admin.
     * Mirrors the hub's own access rule for that page through its public surface only: the site
     * toggle plus the usepersonalkey capability. A teacher gets their role from a course enrolment,
     * whose capabilities never reach the system context, so the capability counts when it is held in
     * the editor's own context or in any course (the hub's own page accepts the same).
     *
     * @param \context $context Context the editor is used in.
     * @return string
     */
    private static function aihub_keys_url(\context $context): string {
        global $USER;

        if (!class_exists(\local_aihub\ai::class) || !get_config('local_aihub', 'enablepersonalkeys')) {
            return '';
        }
        $capability = 'local/aihub:usepersonalkey';
        $allowed = has_capability($capability, $context)
            || !empty(get_user_capability_course($capability, (int) $USER->id, false, '', '', 1));
        if (!$allowed) {
            return '';
        }
        return (new \moodle_url('/local/aihub/mykeys.php'))->out(false);
    }

    /**
     * Tells whether the ready-made layouts are to be offered to the teachers.
     *
     * An administrator can switch them off in the plugin settings. A site that never saved the setting has the
     * default, which is on.
     *
     * @return bool
     */
    private static function presets_enabled(): bool {
        $value = get_config('tiny_studiolms', 'showpresets');
        return $value === false || (bool) $value;
    }

    /**
     * Tells whether the ready-made layouts shown in this language are a stand-in for it.
     *
     * @param string $lang Current Moodle language code.
     * @return bool True when there is no folder under presets/ for the language, so the English ones are used.
     */
    private static function presets_are_a_stand_in(string $lang): bool {
        return !is_dir(dirname(__DIR__) . '/presets/' . $lang);
    }

    /**
     * Tells whether the teacher is still to be told that the layouts are not in their language.
     *
     * Asked once: the editor saves the preference as soon as it shows the notice, and a language that has a
     * folder of its own under presets/ never needs it.
     *
     * @param string $lang Current Moodle language code.
     * @return bool
     */
    private static function preset_notice_due(string $lang): bool {
        return self::presets_are_a_stand_in($lang) && !get_user_preferences('tiny_studiolms_presetnotice_seen', false);
    }

    /**
     * Load preset templates for the given language, falling back to English.
     *
     * Design decision (not a defect): the ready-made layouts are JSON files in one folder per language
     * (presets/en, presets/pt_br), not language strings. A layout is HTML with inline styles and block settings,
     * which does not belong in a lang string, and splitting each one into a few hundred translatable fragments
     * would make a layout impossible to read, review or edit as a whole. A language without a folder of its own
     * gets the English layouts, and the teacher is told once (see preset_notice_due()) that they can load one,
     * write the text in their own language and keep it with "Save as template"; the saved template then lives in
     * "My templates" in any language. A new language is added by copying presets/en to presets/<code>. Moving
     * the text to lang strings, so that AMOS could translate it, is a possible future step, to be taken if
     * translators ask for it.
     *
     * @param string $lang Current Moodle language code (e.g. 'pt_br', 'en').
     * @return array Array of preset definitions, each with 'name' and either 'blocks' or 'content'.
     */
    private static function load_presets(string $lang): array {
        $basedir = dirname(__DIR__) . '/presets';
        $langdir = $basedir . '/' . $lang;

        if (!is_dir($langdir)) {
            $langdir = $basedir . '/en';
        }

        if (!is_dir($langdir)) {
            return [];
        }

        $files = glob($langdir . '/*.json');
        if (!$files) {
            return [];
        }

        sort($files);

        $presets = [];
        foreach ($files as $file) {
            $raw = file_get_contents($file);
            if ($raw === false) {
                continue;
            }
            $data = json_decode($raw, true);
            $hasblocks = !empty($data['blocks']);
            $hascontent = !empty($data['content']);
            if (is_array($data) && !empty($data['name']) && ($hasblocks || $hascontent)) {
                $presets[] = $data;
            }
        }

        return $presets;
    }

    /**
     * Get the list of available buttons provided by this plugin.
     *
     * @return array
     */
    public static function get_available_buttons(): array {
        return [
            'tiny_studiolms' => [
                'image' => 'icon', // Looks for pix/icon.svg.
            ],
        ];
    }

    /**
     * Get the list of available menu items provided by this plugin.
     *
     * @return array
     */
    public static function get_available_menuitems(): array {
        return [
            'tools' => [ // Places the item in the Tools menu.
                'tiny_studiolms',
            ],
        ];
    }
}
