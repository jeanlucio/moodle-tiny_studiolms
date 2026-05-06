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
 * External function: import templates from a portable JSON payload.
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
use tiny_studiolms\event\template_created;

/**
 * Receives an array of template objects and persists them as new records
 * owned by the current user. Duplicate names within the same import batch
 * receive a numeric suffix to avoid silent collisions.
 */
class import_templates extends external_api {
    /**
     * Declares the parameters accepted by execute().
     *
     * @return external_function_parameters
     */
    public static function execute_parameters(): external_function_parameters {
        return new external_function_parameters([
            'templates' => new external_multiple_structure(
                new external_single_structure([
                    'name'     => new external_value(PARAM_TEXT, 'Template name', VALUE_REQUIRED),
                    'content'  => new external_value(PARAM_RAW, 'Full HTML content', VALUE_REQUIRED),
                    'isglobal' => new external_value(
                        PARAM_INT,
                        'Whether to import as global (requires manageglobaltemplates)',
                        VALUE_DEFAULT,
                        0
                    ),
                ]),
                'Templates to import'
            ),
        ]);
    }

    /**
     * Imports a list of templates, returning the new IDs.
     *
     * @param array $templates
     * @return array
     */
    public static function execute(array $templates): array {
        global $DB, $USER;

        $params = self::validate_parameters(self::execute_parameters(), ['templates' => $templates]);

        $context = context_system::instance();
        self::validate_context($context);
        require_capability('tiny/studiolms:use', $context);

        $canmanageglobal = has_capability('tiny/studiolms:manageglobaltemplates', $context);
        $now = time();
        $created = [];

        // Collect existing names for the current user to detect collisions.
        $existingnames = $DB->get_fieldset_select(
            'tiny_studiolms_templates',
            'name',
            'userid = :uid',
            ['uid' => $USER->id]
        );
        $nameset = array_flip($existingnames);

        foreach ($params['templates'] as $item) {
            $isglobal = (int) $item['isglobal'];
            if ($isglobal && !$canmanageglobal) {
                $isglobal = 0;
            }

            // Ensure unique name by appending a counter when a collision exists.
            $name = $item['name'];
            if (isset($nameset[$name])) {
                $counter = 2;
                while (isset($nameset["{$name} ({$counter})"])) {
                    $counter++;
                }
                $name = "{$name} ({$counter})";
            }
            $nameset[$name] = true;

            $record = (object) [
                'name'         => $name,
                'content'      => $item['content'],
                'userid'       => $USER->id,
                'usermodified' => $USER->id,
                'isglobal'     => $isglobal,
                'timecreated'  => $now,
                'timemodified' => $now,
            ];

            $id = $DB->insert_record('tiny_studiolms_templates', $record);

            $event = template_created::create([
                'objectid' => $id,
                'context'  => $context,
            ]);
            $event->trigger();

            $created[] = ['id' => (int) $id, 'name' => $name];
        }

        return $created;
    }

    /**
     * Declares the structure returned by execute().
     *
     * @return external_multiple_structure
     */
    public static function execute_returns(): external_multiple_structure {
        return new external_multiple_structure(
            new external_single_structure([
                'id'   => new external_value(PARAM_INT, 'ID of the imported template'),
                'name' => new external_value(PARAM_TEXT, 'Final name after collision resolution'),
            ])
        );
    }
}
