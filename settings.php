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

    $settings->add(new admin_setting_heading(
        'tiny_studiolms/ai_institution_heading',
        get_string('settings_ai_institution_heading', 'tiny_studiolms'),
        get_string('settings_ai_institution_heading_desc', 'tiny_studiolms')
    ));

    $settings->add(new admin_setting_configpasswordunmask(
        'tiny_studiolms/apikey_gemini',
        get_string('settings_ai_gemini_key', 'tiny_studiolms'),
        get_string('settings_ai_gemini_key_desc', 'tiny_studiolms'),
        ''
    ));

    $settings->add(new admin_setting_configpasswordunmask(
        'tiny_studiolms/apikey_groq',
        get_string('settings_ai_groq_key', 'tiny_studiolms'),
        get_string('settings_ai_groq_key_desc', 'tiny_studiolms'),
        ''
    ));

    $settings->add(new admin_setting_heading(
        'tiny_studiolms/ai_custom_heading',
        get_string('settings_ai_custom_heading', 'tiny_studiolms'),
        get_string('settings_ai_custom_heading_desc', 'tiny_studiolms')
    ));

    $settings->add(new admin_setting_configpasswordunmask(
        'tiny_studiolms/apikey_custom',
        get_string('settings_ai_custom_key', 'tiny_studiolms'),
        get_string('settings_ai_custom_key_desc', 'tiny_studiolms'),
        ''
    ));

    $settings->add(new admin_setting_configtext(
        'tiny_studiolms/custom_baseurl',
        get_string('settings_ai_custom_url', 'tiny_studiolms'),
        get_string('settings_ai_custom_url_desc', 'tiny_studiolms'),
        '',
        PARAM_URL
    ));

    $settings->add(new admin_setting_configtext(
        'tiny_studiolms/custom_model',
        get_string('settings_ai_custom_model', 'tiny_studiolms'),
        get_string('settings_ai_custom_model_desc', 'tiny_studiolms'),
        ''
    ));
}
