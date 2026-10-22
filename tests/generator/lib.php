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
 * Test data generator for tiny_studiolms.
 *
 * @package    tiny_studiolms
 * @category   test
 * @copyright  2026 Jean Lúcio
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

/**
 * Test data generator for tiny_studiolms.
 *
 * @package    tiny_studiolms
 * @category   test
 * @copyright  2026 Jean Lúcio
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class tiny_studiolms_generator extends component_generator_base {
    /**
     * Creates a saved layout template.
     *
     * Without content the template holds one callout block, enough for the library to render a card
     * and for loading it onto the canvas.
     *
     * @param array|stdClass $record Fields: name (required), userid (defaults to the admin),
     *                               content, isglobal.
     * @return stdClass The stored row.
     */
    public function create_template(array|stdClass $record): stdClass {
        global $DB;

        $record = (array) $record;
        $userid = (int) ($record['userid'] ?? get_admin()->id);
        $now = time();

        $row = (object) [
            'name' => $record['name'],
            'content' => $record['content'] ?? $this->default_content(),
            'userid' => $userid,
            'usermodified' => $userid,
            'isglobal' => (int) ($record['isglobal'] ?? 0),
            'timecreated' => $now,
            'timemodified' => $now,
        ];
        $row->id = $DB->insert_record('tiny_studiolms_templates', $row);

        return $row;
    }

    /**
     * Returns the markup of a single callout block, as the plugin itself inserts it.
     *
     * @return string
     */
    private function default_content(): string {
        return '<div class="studiolms-callout-wrap mceNonEditable" data-slms-hover="none" '
            . 'data-slms-block-type="callout" data-slms-state="">'
            . '<div class="slms-callout-icon" aria-hidden="true">💡</div>'
            . '<div class="slms-callout-content mceEditable"><p>Template callout</p></div></div>';
    }
}
