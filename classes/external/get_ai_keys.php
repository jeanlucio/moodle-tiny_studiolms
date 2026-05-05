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
 * External function: get current user's AI key status.
 *
 * @package    tiny_studiolms
 * @copyright  2026 Jean Lúcio
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace tiny_studiolms\external;

use core_external\external_api;
use core_external\external_function_parameters;
use core_external\external_single_structure;
use core_external\external_value;
use context_system;

/**
 * Returns the current user's personal AI key status (never the actual key values).
 *
 * Non-secret values (custom URL and model) are returned as-is for pre-filling the form.
 * Secret keys (Gemini, Groq, custom key) are returned only as boolean presence flags.
 *
 * @package    tiny_studiolms
 * @copyright  2026 Jean Lúcio
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class get_ai_keys extends external_api {
    /**
     * Declares the parameters accepted by execute().
     *
     * @return external_function_parameters
     */
    public static function execute_parameters(): external_function_parameters {
        return new external_function_parameters([]);
    }

    /**
     * Returns personal AI key status for the current user.
     *
     * @return array
     */
    public static function execute(): array {
        $context = context_system::instance();
        self::validate_context($context);
        require_capability('tiny/studiolms:use', $context);

        $geminikey  = (string)get_user_preferences('tiny_studiolms_gemini_key', '');
        $groqkey    = (string)get_user_preferences('tiny_studiolms_groq_key', '');
        $customkey  = (string)get_user_preferences('tiny_studiolms_custom_key', '');

        return [
            'has_gemini'    => $geminikey !== '',
            'has_groq'      => $groqkey !== '',
            'has_custom_key' => $customkey !== '',
            'gemini_key'    => $geminikey,
            'groq_key'      => $groqkey,
            'custom_key'    => $customkey,
            'custom_url'    => (string)get_user_preferences('tiny_studiolms_custom_url', ''),
            'custom_model'  => (string)get_user_preferences('tiny_studiolms_custom_model', ''),
        ];
    }

    /**
     * Describes the return value of execute().
     *
     * @return external_single_structure
     */
    public static function execute_returns(): external_single_structure {
        return new external_single_structure([
            'has_gemini'     => new external_value(PARAM_BOOL, 'Whether a personal Gemini key is saved'),
            'has_groq'       => new external_value(PARAM_BOOL, 'Whether a personal Groq key is saved'),
            'has_custom_key' => new external_value(PARAM_BOOL, 'Whether a personal custom provider key is saved'),
            'gemini_key'     => new external_value(PARAM_RAW, 'Personal Gemini API key', VALUE_OPTIONAL, ''),
            'groq_key'       => new external_value(PARAM_RAW, 'Personal Groq API key', VALUE_OPTIONAL, ''),
            'custom_key'     => new external_value(PARAM_RAW, 'Personal custom provider API key', VALUE_OPTIONAL, ''),
            'custom_url'     => new external_value(PARAM_URL, 'Saved custom provider URL', VALUE_OPTIONAL, ''),
            'custom_model'   => new external_value(PARAM_TEXT, 'Saved custom provider model', VALUE_OPTIONAL, ''),
        ]);
    }
}
