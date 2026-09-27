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
 * External function: retrieve templates by type.
 *
 * @package    tiny_studiolms
 * @copyright  2026 Jean Lúcio
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace tiny_studiolms\external;

use context;
use core_external\external_api;
use core_external\external_function_parameters;
use core_external\external_multiple_structure;
use core_external\external_single_structure;
use core_external\external_value;

/**
 * Returns a list of templates filtered by type (global / mine / favourites).
 * A single LEFT JOIN avoids N+1 queries for the isfavourite flag.
 */
class get_templates extends external_api {
    /**
     * Declares the parameters accepted by execute().
     *
     * @return external_function_parameters
     */
    public static function execute_parameters(): external_function_parameters {
        return new external_function_parameters([
            'contextid' => new external_value(PARAM_INT, 'Context ID of the editor session', VALUE_REQUIRED),
            'type' => new external_value(
                PARAM_ALPHA,
                'Filter type: global, mine, or favourites',
                VALUE_DEFAULT,
                'mine'
            ),
        ]);
    }

    /**
     * Returns templates with isfavourite flag resolved via LEFT JOIN.
     *
     * @param int $contextid Context ID of the editor session.
     * @param string $type
     * @return array
     */
    public static function execute(int $contextid, string $type = 'mine'): array {
        global $DB, $USER;

        $params = self::validate_parameters(self::execute_parameters(), [
            'contextid' => $contextid,
            'type' => $type,
        ]);

        $context = context::instance_by_id($params['contextid']);
        self::validate_context($context);
        require_capability('tiny/studiolms:use', $context);

        $userid = $USER->id;
        // The manageglobaltemplates capability is a site-wide power (CONTEXT_SYSTEM in db/access.php); checking
        // it against the editor's own $context would mark a course/category-delegated manager as
        // "ismine" for every global template on the site, well beyond what they administer.
        $canmanageglobal = has_capability('tiny/studiolms:manageglobaltemplates', \context_system::instance());

        $sql = "SELECT t.id,
                       t.name,
                       t.content,
                       t.isglobal,
                       t.userid,
                       CASE WHEN f.id IS NOT NULL THEN 1 ELSE 0 END AS isfavourite
                  FROM {tiny_studiolms_templates} t
             LEFT JOIN {tiny_studiolms_favourites} f
                    ON f.templateid = t.id AND f.userid = :fuserid";

        $sqlparams = ['fuserid' => $userid];

        if ($params['type'] === 'global') {
            $sql .= " WHERE t.isglobal = 1";
        } else if ($params['type'] === 'favourites') {
            // A favourite row alone does not prove visibility: toggle_favourite() only started
            // enforcing it going forward, so an older or forged row could still point at another
            // user's private template. Re-check visibility here too, not just at write time.
            $sql .= " WHERE f.userid = :wuserid AND (t.isglobal = 1 OR t.userid = :vuserid)";
            $sqlparams['wuserid'] = $userid;
            $sqlparams['vuserid'] = $userid;
        } else {
            $sql .= " WHERE t.userid = :wuserid AND t.isglobal = 0";
            $sqlparams['wuserid'] = $userid;
        }

        $sql .= " ORDER BY t.name ASC";

        $rows = $DB->get_records_sql($sql, $sqlparams);

        $result = [];
        foreach ($rows as $row) {
            $result[] = [
                'id'          => (int) $row->id,
                'name'        => $row->name,
                'content'     => $row->content,
                'isglobal'    => (int) $row->isglobal,
                'ismine'      => ((int) $row->userid === (int) $userid)
                                  || ($canmanageglobal && (int) $row->isglobal === 1),
                'isfavourite' => (bool) $row->isfavourite,
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
                'id'          => new external_value(PARAM_INT, 'Template ID'),
                'name'        => new external_value(PARAM_TEXT, 'Template name'),
                'content'     => new external_value(PARAM_RAW, 'Full HTML content'),
                'isglobal'    => new external_value(PARAM_INT, '1 if official template'),
                'ismine'      => new external_value(PARAM_BOOL, 'True if the current user owns this template'),
                'isfavourite' => new external_value(PARAM_BOOL, 'True if the current user has favourited this template'),
            ])
        );
    }
}
