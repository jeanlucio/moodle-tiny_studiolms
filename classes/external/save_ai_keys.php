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
 * External function: save personal AI keys as user preferences.
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
 * Saves the current user's personal AI provider keys as Moodle user preferences.
 *
 * Empty string clears the preference. Non-empty string updates it.
 * The custom URL is validated (HTTPS, public IP) before saving.
 *
 * @package    tiny_studiolms
 * @copyright  2026 Jean Lúcio
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class save_ai_keys extends external_api {
    /**
     * Declares the parameters accepted by execute().
     *
     * @return external_function_parameters
     */
    public static function execute_parameters(): external_function_parameters {
        return new external_function_parameters([
            'gemini_key'   => new external_value(PARAM_RAW, 'Gemini API key (empty to clear)', VALUE_DEFAULT, ''),
            'groq_key'     => new external_value(PARAM_RAW, 'Groq API key (empty to clear)', VALUE_DEFAULT, ''),
            'custom_key'   => new external_value(PARAM_RAW, 'Custom provider API key (empty to clear)', VALUE_DEFAULT, ''),
            'custom_url'   => new external_value(PARAM_URL, 'Custom provider URL (empty to clear)', VALUE_DEFAULT, ''),
            'custom_model' => new external_value(PARAM_TEXT, 'Custom provider model name (empty to clear)', VALUE_DEFAULT, ''),
        ]);
    }

    /**
     * Saves or clears personal AI provider keys for the current user.
     *
     * @param string $geminikey   Gemini API key.
     * @param string $groqkey     Groq API key.
     * @param string $customkey   Custom provider API key.
     * @param string $customurl   Custom provider endpoint URL.
     * @param string $custommodel Custom provider model name.
     * @return array With key 'success' (bool).
     * @throws \moodle_exception If the custom URL is not safe.
     */
    public static function execute(
        string $geminikey,
        string $groqkey,
        string $customkey,
        string $customurl,
        string $custommodel
    ): array {
        $params = self::validate_parameters(self::execute_parameters(), [
            'gemini_key'   => $geminikey,
            'groq_key'     => $groqkey,
            'custom_key'   => $customkey,
            'custom_url'   => $customurl,
            'custom_model' => $custommodel,
        ]);

        $context = context_system::instance();
        self::validate_context($context);
        require_login(null, false);

        if (!empty($params['custom_url']) && !self::is_safe_url($params['custom_url'])) {
            throw new \moodle_exception('ai_generator_error', 'tiny_studiolms');
        }

        self::save_preference('tiny_studiolms_gemini_key', $params['gemini_key']);
        self::save_preference('tiny_studiolms_groq_key', $params['groq_key']);
        self::save_preference('tiny_studiolms_custom_key', $params['custom_key']);
        self::save_preference('tiny_studiolms_custom_url', $params['custom_url']);
        self::save_preference('tiny_studiolms_custom_model', $params['custom_model']);

        return ['success' => true];
    }

    /**
     * Describes the return value of execute().
     *
     * @return external_single_structure
     */
    public static function execute_returns(): external_single_structure {
        return new external_single_structure([
            'success' => new external_value(PARAM_BOOL, 'Whether the keys were saved successfully'),
        ]);
    }

    /**
     * Sets or unsets a user preference.
     *
     * @param string $name  Preference name.
     * @param string $value Value to set; empty string removes the preference.
     */
    private static function save_preference(string $name, string $value): void {
        if ($value === '') {
            unset_user_preference($name);
        } else {
            set_user_preference($name, $value);
        }
    }

    /**
     * Validates that a URL is safe: HTTPS only, public IP, no private/localhost ranges.
     *
     * @param string $url URL to validate.
     * @return bool
     */
    private static function is_safe_url(string $url): bool {
        $parsed = parse_url($url);
        if (!$parsed || ($parsed['scheme'] ?? '') !== 'https') {
            return false;
        }
        $host = strtolower($parsed['host'] ?? '');
        if (in_array($host, ['localhost', '127.0.0.1', '::1'], true)) {
            return false;
        }
        $ip = gethostbyname($host);
        if ($ip !== false) {
            $ispublic = filter_var(
                $ip,
                FILTER_VALIDATE_IP,
                FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE
            );
            if ($ispublic === false) {
                return false;
            }
        }
        return true;
    }
}
