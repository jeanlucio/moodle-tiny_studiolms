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
 * External function: save a layout template.
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
use tiny_studiolms\event\template_created;

/**
 * Saves a new layout template for the current user.
 */
class save_template extends external_api {
    /**
     * Declares the parameters accepted by execute().
     *
     * @return external_function_parameters
     */
    public static function execute_parameters(): external_function_parameters {
        return new external_function_parameters([
            'name'     => new external_value(PARAM_TEXT, 'Template name', VALUE_REQUIRED),
            'content'  => new external_value(PARAM_CLEANHTML, 'Full HTML content from TinyMCE', VALUE_REQUIRED),
            'isglobal' => new external_value(
                PARAM_INT,
                'Whether this is an official template (1) or user-owned (0)',
                VALUE_DEFAULT,
                0
            ),
        ]);
    }

    /**
     * Saves a template and fires a creation event.
     *
     * @param string $name
     * @param string $content
     * @param int $isglobal
     * @return array
     */
    public static function execute(string $name, string $content, int $isglobal = 0): array {
        global $DB, $USER;

        $params = self::validate_parameters(self::execute_parameters(), [
            'name'     => $name,
            'content'  => $content,
            'isglobal' => $isglobal,
        ]);

        $context = context_system::instance();
        self::validate_context($context);
        require_capability('tiny/studiolms:use', $context);

        if ($params['isglobal']) {
            require_capability('tiny/studiolms:manageglobaltemplates', $context);
        }

        $now = time();
        $record = (object) [
            'name'         => $params['name'],
            'content'      => $params['content'],
            'userid'       => $USER->id,
            'usermodified' => $USER->id,
            'isglobal'     => (int) $params['isglobal'],
            'timecreated'  => $now,
            'timemodified' => $now,
        ];

        $id = $DB->insert_record('tiny_studiolms_templates', $record);

        $event = template_created::create([
            'objectid' => $id,
            'context'  => $context,
        ]);
        $event->trigger();

        return ['id' => $id];
    }

    /**
     * Declares the structure returned by execute().
     *
     * @return external_single_structure
     */
    public static function execute_returns(): external_single_structure {
        return new external_single_structure([
            'id' => new external_value(PARAM_INT, 'ID of the saved template'),
        ]);
    }
}
