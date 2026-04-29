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
 * Admin settings for tiny_studiolms.
 *
 * @package    tiny_studiolms
 * @copyright  2026 Jean Lúcio
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

defined('MOODLE_INTERNAL') || die();

if ($hassiteconfig) {
    $settings->add(new admin_setting_heading(
        'tiny_studiolms/ai_heading',
        get_string('settings_ai_heading', 'tiny_studiolms'),
        ''
    ));

    $settings->add(new admin_setting_configselect(
        'tiny_studiolms/ai_provider',
        get_string('settings_ai_provider', 'tiny_studiolms'),
        get_string('settings_ai_provider_desc', 'tiny_studiolms'),
        '',
        [
            ''          => get_string('settings_ai_provider_none', 'tiny_studiolms'),
            'openai'    => get_string('ai_provider_openai', 'tiny_studiolms'),
            'groq'      => get_string('ai_provider_groq', 'tiny_studiolms'),
            'anthropic' => get_string('ai_provider_anthropic', 'tiny_studiolms'),
        ]
    ));

    $settings->add(new admin_setting_configpasswordunmask(
        'tiny_studiolms/ai_apikey',
        get_string('settings_ai_key', 'tiny_studiolms'),
        get_string('settings_ai_key_desc', 'tiny_studiolms'),
        ''
    ));

    $settings->add(new admin_setting_configtext(
        'tiny_studiolms/ai_model',
        get_string('settings_ai_model', 'tiny_studiolms'),
        get_string('settings_ai_model_desc', 'tiny_studiolms'),
        ''
    ));
}
