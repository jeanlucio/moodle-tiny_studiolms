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

use context;
use core_external\external_api;
use core_external\external_function_parameters;
use core_external\external_single_structure;
use core_external\external_value;
use tiny_studiolms\ai\generator;

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
            'contextid' => new external_value(PARAM_INT, 'Context ID of the editor session', VALUE_REQUIRED),
            'prompt' => new external_value(PARAM_TEXT, 'Plain-text content request for AI generation'),
        ]);
    }

    /**
     * Generates a block configuration from the given prompt.
     *
     * @param int $contextid Context ID of the editor session.
     * @param string $prompt Teacher's content request.
     * @return array With keys 'blocktype' and 'config'.
     */
    public static function execute(int $contextid, string $prompt): array {
        $params = self::validate_parameters(self::execute_parameters(), [
            'contextid' => $contextid,
            'prompt' => $prompt,
        ]);

        $context = context::instance_by_id($params['contextid']);
        self::validate_context($context);
        require_capability('tiny/studiolms:use', $context);

        try {
            $result = generator::generate_block($params['prompt'], $context);
        } catch (\moodle_exception $e) {
            throw $e;
        } catch (\Throwable $t) {
            // Never expose the raw exception message or file path to the caller: log it for a
            // developer instead, and return only a generic, translated error.
            debugging(
                'StudioLMS AI: ' . get_class($t) . ': ' . $t->getMessage()
                    . ' at ' . $t->getFile() . ':' . $t->getLine(),
                DEBUG_DEVELOPER
            );
            throw new \moodle_exception('ai_generator_error', 'tiny_studiolms');
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
