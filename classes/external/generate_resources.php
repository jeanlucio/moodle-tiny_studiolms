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
 * External function: generate resources block resource list via AI.
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
 * Generates a curated resource list for a resources block using an LLM.
 *
 * @package    tiny_studiolms
 * @copyright  2026 Jean Lúcio
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class generate_resources extends external_api {
    /**
     * Declares the parameters accepted by execute().
     *
     * @return external_function_parameters
     */
    public static function execute_parameters(): external_function_parameters {
        return new external_function_parameters([
            'contextid' => new external_value(PARAM_INT, 'Context ID of the editor session', VALUE_REQUIRED),
            'topic' => new external_value(PARAM_TEXT, 'Topic or context for the resource collection'),
        ]);
    }

    /**
     * Generates title, description and resource list for a resources block.
     *
     * @param int $contextid Context ID of the editor session.
     * @param string $topic Teacher's topic or context description.
     * @return array With keys 'title', 'desc' and 'resources' (JSON-encoded array).
     */
    public static function execute(int $contextid, string $topic): array {
        $params = self::validate_parameters(self::execute_parameters(), [
            'contextid' => $contextid,
            'topic' => $topic,
        ]);

        $context = context::instance_by_id($params['contextid']);
        self::validate_context($context);
        require_capability('tiny/studiolms:use', $context);

        try {
            $result = generator::generate_resources($params['topic'], $context);
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
            throw new \moodle_exception('resources_ai_error', 'tiny_studiolms');
        }

        return [
            'title'     => $result['title'],
            'desc'      => $result['desc'],
            'resources' => $result['resources'],
        ];
    }

    /**
     * Describes the return value of execute().
     *
     * @return external_single_structure
     */
    public static function execute_returns(): external_single_structure {
        return new external_single_structure([
            'title'     => new external_value(PARAM_TEXT, 'Panel heading for the resources block'),
            'desc'      => new external_value(PARAM_TEXT, 'Short description text'),
            'resources' => new external_value(PARAM_RAW, 'JSON-encoded resources array [{type, title, url}, ...]'),
        ]);
    }
}
