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
 * External function: generate a StudioLMS block via AI.
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
use tiny_studiolms\ai\generator;
use stdClass;

/**
 * Generates a StudioLMS block configuration from a plain-text teacher prompt using an LLM.
 *
 * @package    tiny_studiolms
 * @copyright  2026 Jean Lúcio
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class generate_block extends external_api {
    /**
     * Declares the parameters accepted by execute().
     *
     * @return external_function_parameters
     */
    public static function execute_parameters(): external_function_parameters {
        return new external_function_parameters([
            'prompt' => new external_value(PARAM_TEXT, 'Plain-text content request for AI generation'),
        ]);
    }

    /**
     * Generates a block configuration from the given prompt.
     *
     * @param string $prompt Teacher's content request.
     * @return array With keys 'blocktype' and 'config'.
     */
    public static function execute(string $prompt): array {
        global $DB, $USER;

        $params = self::validate_parameters(self::execute_parameters(), ['prompt' => $prompt]);

        $context = context_system::instance();
        self::validate_context($context);
        require_login(null, false);

        try {
            $result = generator::generate_block($params['prompt']);
        } catch (\moodle_exception $e) {
            throw $e;
        } catch (\Throwable $t) {
            $detail = 'SLMS ' . get_class($t) . ': ' . $t->getMessage()
                . ' at ' . basename($t->getFile()) . ':' . $t->getLine();
            throw new \moodle_exception('generalexceptionmessage', 'error', '', $detail);
        }

        try {
            $log = new stdClass();
            $log->userid = $USER->id;
            $log->blocktype = $result['blocktype'];
            $log->ai_provider = $result['provider'] ?? 'unknown';
            $log->timecreated = time();
            $DB->insert_record('tiny_studiolms_ai_logs', $log);
        } catch (\dml_exception $e) {
            debugging('StudioLMS AI: log insert failed — ' . $e->getMessage(), DEBUG_DEVELOPER);
        }

        return ['blocktype' => $result['blocktype'], 'config' => $result['config']];
    }

    /**
     * Describes the return value of execute().
     *
     * @return external_single_structure
     */
    public static function execute_returns(): external_single_structure {
        return new external_single_structure([
            'blocktype' => new external_value(PARAM_ALPHANUMEXT, 'Block type identifier'),
            'config'    => new external_value(PARAM_RAW, 'JSON-encoded block configuration object'),
        ]);
    }
}
