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
 * External function: get current user's AI usage logs.
 *
 * @package    tiny_studiolms
 * @copyright  2026 Jean Lúcio
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace tiny_studiolms\external;

use core_external\external_api;
use core_external\external_function_parameters;
use core_external\external_multiple_structure;
use core_external\external_single_structure;
use core_external\external_value;
use context_system;

/**
 * Returns the current user's last 50 AI generation log entries.
 *
 * @package    tiny_studiolms
 * @copyright  2026 Jean Lúcio
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class get_ai_logs extends external_api {
    /**
     * Declares the parameters accepted by execute().
     *
     * @return external_function_parameters
     */
    public static function execute_parameters(): external_function_parameters {
        return new external_function_parameters([]);
    }

    /**
     * Returns AI generation logs for the current user.
     *
     * @return array
     */
    public static function execute(): array {
        global $DB, $USER;

        $context = context_system::instance();
        self::validate_context($context);
        require_capability('tiny/studiolms:use', $context);

        $records = $DB->get_records(
            'tiny_studiolms_ai_logs',
            ['userid' => $USER->id],
            'timecreated DESC',
            'id, blocktype, ai_provider, timecreated',
            0,
            50
        );

        $logs = [];
        foreach ($records as $record) {
            $logs[] = [
                'blocktype'   => $record->blocktype,
                'ai_provider' => $record->ai_provider,
                'timecreated' => userdate($record->timecreated, get_string('strftimedatetimeshort', 'langconfig')),
            ];
        }

        return $logs;
    }

    /**
     * Describes the return value of execute().
     *
     * @return external_multiple_structure
     */
    public static function execute_returns(): external_multiple_structure {
        return new external_multiple_structure(
            new external_single_structure([
                'blocktype'   => new external_value(PARAM_TEXT, 'Block type generated'),
                'ai_provider' => new external_value(PARAM_TEXT, 'AI provider used'),
                'timecreated' => new external_value(PARAM_TEXT, 'Formatted date and time'),
            ])
        );
    }
}
