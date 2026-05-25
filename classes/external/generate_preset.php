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
 * External function: generate a multi-block StudioLMS preset via AI.
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
use tiny_studiolms\ai\generator;
use stdClass;

/**
 * Generates a multi-block StudioLMS layout from a pedagogical context using an LLM.
 *
 * @package    tiny_studiolms
 * @copyright  2026 Jean Lúcio
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class generate_preset extends external_api {
    /**
     * Declares the parameters accepted by execute().
     *
     * @return external_function_parameters
     */
    public static function execute_parameters(): external_function_parameters {
        return new external_function_parameters([
            'name'        => new external_value(PARAM_TEXT, 'Desired name for the generated layout'),
            'contexttext' => new external_value(PARAM_TEXT, 'Pedagogical context and intent description'),
            'blocks'      => new external_value(PARAM_TEXT, 'Optional comma-separated block type hints', VALUE_DEFAULT, ''),
            'palette'     => new external_value(PARAM_ALPHANUMEXT, 'Colour palette identifier', VALUE_DEFAULT, 'blue'),
        ]);
    }

    /**
     * Generates a layout from the given pedagogical context.
     *
     * @param string $name        Desired layout name.
     * @param string $contexttext Pedagogical context description.
     * @param string $blocks      Optional block type hints.
     * @param string $palette     Colour palette identifier.
     * @return array With keys 'name' and 'blocks'.
     */
    public static function execute(string $name, string $contexttext, string $blocks, string $palette): array {
        global $DB, $USER;

        $params = self::validate_parameters(self::execute_parameters(), [
            'name'        => $name,
            'contexttext' => $contexttext,
            'blocks'      => $blocks,
            'palette'     => $palette,
        ]);

        $context = context_system::instance();
        self::validate_context($context);
        if (!isloggedin() || isguestuser()) {
            throw new \required_capability_exception($context, 'tiny/studiolms:use', 'nopermissions', '');
        }

        try {
            $result = generator::generate_preset(
                $params['name'],
                $params['contexttext'],
                $params['blocks'],
                $params['palette']
            );
        } catch (\moodle_exception $e) {
            throw $e;
        } catch (\Throwable $t) {
            $detail = 'SLMS ' . get_class($t) . ': ' . $t->getMessage()
                . ' at ' . basename($t->getFile()) . ':' . $t->getLine();
            throw new \moodle_exception('generalexceptionmessage', 'error', '', $detail);
        }

        try {
            $log = new stdClass();
            $log->userid = $USER->id;
            $log->blocktype = 'preset';
            $log->ai_provider = $result['provider'] ?? 'unknown';
            $log->timecreated = time();
            $DB->insert_record('tiny_studiolms_ai_logs', $log);
        } catch (\dml_exception $e) {
            debugging('StudioLMS AI: log insert failed — ' . $e->getMessage(), DEBUG_DEVELOPER);
        }

        return ['name' => $result['name'], 'blocks' => $result['blocks']];
    }

    /**
     * Describes the return value of execute().
     *
     * @return external_single_structure
     */
    public static function execute_returns(): external_single_structure {
        return new external_single_structure([
            'name'   => new external_value(PARAM_TEXT, 'Generated layout name'),
            'blocks' => new external_value(PARAM_RAW, 'JSON-encoded array of block definitions'),
        ]);
    }
}
