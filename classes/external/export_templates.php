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
 * External function: export templates as a portable JSON payload.
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
 * Returns a JSON-serialisable array of templates owned by the current user
 * (and optionally global ones, when the caller has manageglobaltemplates).
 * The client downloads the result as a .json file; nothing is stored server-side.
 */
class export_templates extends external_api {
    /**
     * Declares the parameters accepted by execute().
     *
     * @return external_function_parameters
     */
    public static function execute_parameters(): external_function_parameters {
        return new external_function_parameters([
            'ids' => new external_multiple_structure(
                new external_value(PARAM_INT, 'Template ID'),
                'IDs of the templates to export. Empty array = export all owned templates.',
                VALUE_DEFAULT,
                []
            ),
        ]);
    }

    /**
     * Export templates owned by the current user.
     * Global templates can only be exported by users who also have manageglobaltemplates.
     *
     * @param int[] $ids
     * @return array
     */
    public static function execute(array $ids = []): array {
        global $DB, $USER;

        $params = self::validate_parameters(self::execute_parameters(), ['ids' => $ids]);

        $context = context_system::instance();
        self::validate_context($context);
        require_capability('tiny/studiolms:use', $context);

        $canmanageglobal = has_capability('tiny/studiolms:manageglobaltemplates', $context);
        $userid = $USER->id;

        if (!empty($params['ids'])) {
            [$insql, $inparams] = $DB->get_in_or_equal($params['ids'], SQL_PARAMS_NAMED, 'tid');
            $inparams['userid'] = $userid;

            $sql = "SELECT id, name, content, isglobal
                      FROM {tiny_studiolms_templates}
                     WHERE id {$insql}
                       AND (userid = :userid OR (isglobal = 1 AND :canmanage = 1))";
            $inparams['canmanage'] = $canmanageglobal ? 1 : 0;
            $rows = $DB->get_records_sql($sql, $inparams);
        } else {
            $where = $canmanageglobal
                ? 'userid = :userid OR isglobal = 1'
                : 'userid = :userid';
            $rows = $DB->get_records_select(
                'tiny_studiolms_templates',
                $where,
                ['userid' => $userid],
                'name ASC',
                'id, name, content, isglobal'
            );
        }

        $result = [];
        foreach ($rows as $row) {
            $result[] = [
                'id'       => (int) $row->id,
                'name'     => $row->name,
                'content'  => $row->content,
                'isglobal' => (int) $row->isglobal,
            ];
        }

        return $result;
    }

    /**
     * Declares the structure returned by execute().
     *
     * @return external_multiple_structure
     */
    public static function execute_returns(): external_multiple_structure {
        return new external_multiple_structure(
            new external_single_structure([
                'id'       => new external_value(PARAM_INT, 'Template ID'),
                'name'     => new external_value(PARAM_TEXT, 'Template name'),
                'content'  => new external_value(PARAM_RAW, 'Full HTML content'),
                'isglobal' => new external_value(PARAM_INT, 'Whether the template is global'),
            ])
        );
    }
}
