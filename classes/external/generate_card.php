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
 * External function: generate advanced card content via AI.
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

/**
 * Generates HTML content and button label for an advanced card block using an LLM.
 *
 * @package    tiny_studiolms
 * @copyright  2026 Jean Lúcio
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class generate_card extends external_api {
    /**
     * Declares the parameters accepted by execute().
     *
     * @return external_function_parameters
     */
    public static function execute_parameters(): external_function_parameters {
        return new external_function_parameters([
            'topic' => new external_value(PARAM_TEXT, 'Content description for the advanced card'),
        ]);
    }

    /**
     * Generates HTML content and button label for an advanced card block.
     *
     * @param string $topic Teacher's content description.
     * @return array With keys 'content' and 'btntext'.
     */
    public static function execute(string $topic): array {
        $params = self::validate_parameters(self::execute_parameters(), ['topic' => $topic]);

        $context = context_system::instance();
        self::validate_context($context);
        if (!isloggedin() || isguestuser()) {
            throw new \required_capability_exception($context, 'tiny/studiolms:use', 'nopermissions', '');
        }

        try {
            $result = generator::generate_card($params['topic']);
        } catch (\moodle_exception $e) {
            throw $e;
        } catch (\Throwable $t) {
            $detail = 'SLMS ' . get_class($t) . ': ' . $t->getMessage()
                . ' at ' . basename($t->getFile()) . ':' . $t->getLine();
            throw new \moodle_exception('generalexceptionmessage', 'error', '', $detail);
        }

        return ['content' => $result['content'], 'btntext' => $result['btntext']];
    }

    /**
     * Describes the return value of execute().
     *
     * @return external_single_structure
     */
    public static function execute_returns(): external_single_structure {
        return new external_single_structure([
            'content' => new external_value(PARAM_RAW, 'HTML body content for the card'),
            'btntext' => new external_value(PARAM_TEXT, 'Optional button label (empty string = no button)'),
        ]);
    }
}
