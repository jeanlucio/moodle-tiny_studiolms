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
 * External function: generate_infographic_timeline.
 *
 * @package    tiny_studiolms
 * @copyright  2026 Jean Lúcio <jeanlucio@gmail.com>
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace tiny_studiolms\external;

use core_external\external_api;
use core_external\external_function_parameters;
use core_external\external_value;
use core_external\external_single_structure;
use tiny_studiolms\ai\generator;

/**
 * Generates a timeline infographic via a configured LLM provider.
 */
class generate_infographic_timeline extends external_api {
    /**
     * Declares the parameters accepted by execute().
     *
     * @return external_function_parameters
     */
    public static function execute_parameters(): external_function_parameters {
        return new external_function_parameters([
            'topic' => new external_value(PARAM_TEXT, 'Topic or context for the timeline.'),
        ]);
    }

    /**
     * Generates a timeline infographic from the given topic.
     *
     * @param string $topic Topic or context for the timeline.
     * @return array{title: string, items: string, provider: string}
     */
    public static function execute(string $topic): array {
        $params = self::validate_parameters(self::execute_parameters(), ['topic' => $topic]);
        self::validate_context(\context_system::instance());
        require_capability('tiny/studiolms:use', \context_system::instance());

        return generator::generate_infographic_timeline($params['topic']);
    }

    /**
     * Describes the return value of execute().
     *
     * @return external_single_structure
     */
    public static function execute_returns(): external_single_structure {
        return new external_single_structure([
            'title'    => new external_value(PARAM_TEXT, 'Optional block title.'),
            'items'    => new external_value(PARAM_RAW, 'JSON-encoded array of timeline items.'),
            'provider' => new external_value(PARAM_TEXT, 'LLM provider used.'),
        ]);
    }
}
