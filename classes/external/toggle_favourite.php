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
 * External function: add or remove a template from favourites.
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
 * Toggles the favourite status of a template for the current user.
 */
class toggle_favourite extends external_api {
    /**
     * Declares the parameters accepted by execute().
     *
     * @return external_function_parameters
     */
    public static function execute_parameters(): external_function_parameters {
        return new external_function_parameters([
            'templateid' => new external_value(PARAM_INT, 'Template ID to favourite/unfavourite', VALUE_REQUIRED),
        ]);
    }

    /**
     * Adds or removes the favourite relationship for the current user.
     *
     * @param int $templateid
     * @return array
     */
    public static function execute(int $templateid): array {
        global $DB, $USER;

        $params = self::validate_parameters(self::execute_parameters(), ['templateid' => $templateid]);

        $context = context_system::instance();
        self::validate_context($context);
        if (!isloggedin() || isguestuser()) {
            throw new \required_capability_exception($context, 'tiny/studiolms:use', 'nopermissions', '');
        }

        $DB->get_record('tiny_studiolms_templates', ['id' => $params['templateid']], 'id', MUST_EXIST);

        $existing = $DB->get_record('tiny_studiolms_favourites', [
            'userid'     => $USER->id,
            'templateid' => $params['templateid'],
        ]);

        if ($existing) {
            $DB->delete_records('tiny_studiolms_favourites', ['id' => $existing->id]);
            return ['favourited' => false];
        }

        $DB->insert_record('tiny_studiolms_favourites', (object) [
            'userid'      => $USER->id,
            'templateid'  => $params['templateid'],
            'timecreated' => time(),
        ]);

        return ['favourited' => true];
    }

    /**
     * Declares the structure returned by execute().
     *
     * @return external_single_structure
     */
    public static function execute_returns(): external_single_structure {
        return new external_single_structure([
            'favourited' => new external_value(PARAM_BOOL, 'True if the template is now favourited'),
        ]);
    }
}
