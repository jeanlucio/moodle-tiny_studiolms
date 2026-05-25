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
 * External function: delete a user-owned template.
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
use moodle_exception;
use tiny_studiolms\event\template_deleted;

/**
 * Deletes a template owned by the current user (or any template if manager).
 */
class delete_template extends external_api {
    /**
     * Declares the parameters accepted by execute().
     *
     * @return external_function_parameters
     */
    public static function execute_parameters(): external_function_parameters {
        return new external_function_parameters([
            'id' => new external_value(PARAM_INT, 'Template ID to delete', VALUE_REQUIRED),
        ]);
    }

    /**
     * Deletes the template and its favourites, then fires a deletion event.
     *
     * @param int $id
     * @return array
     */
    public static function execute(int $id): array {
        global $DB, $USER;

        $params = self::validate_parameters(self::execute_parameters(), ['id' => $id]);

        $context = context_system::instance();
        self::validate_context($context);
        require_capability('tiny/studiolms:use', $context);

        $template = $DB->get_record('tiny_studiolms_templates', ['id' => $params['id']], '*', MUST_EXIST);

        $canmanageglobal = has_capability('tiny/studiolms:manageglobaltemplates', $context);

        if ((int) $template->userid !== (int) $USER->id && !$canmanageglobal) {
            throw new moodle_exception('nopermissions', 'error', '', 'delete template');
        }

        $DB->delete_records('tiny_studiolms_favourites', ['templateid' => $params['id']]);
        $DB->delete_records('tiny_studiolms_templates', ['id' => $params['id']]);

        $event = template_deleted::create([
            'objectid' => $params['id'],
            'context'  => $context,
            'other'    => ['name' => $template->name],
        ]);
        $event->trigger();

        return ['success' => true];
    }

    /**
     * Declares the structure returned by execute().
     *
     * @return external_single_structure
     */
    public static function execute_returns(): external_single_structure {
        return new external_single_structure([
            'success' => new external_value(PARAM_BOOL, 'True if the template was deleted'),
        ]);
    }
}
