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
 * Event fired when a StudioLMS template is deleted.
 *
 * @package    tiny_studiolms
 * @copyright  2026 Jean Lúcio
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace tiny_studiolms\event;

/**
 * Fired when a user deletes a layout template.
 */
class template_deleted extends \core\event\base {
    #[\Override]
    protected function init(): void {
        $this->data['crud'] = 'd';
        $this->data['edulevel'] = self::LEVEL_OTHER;
        $this->data['objecttable'] = 'tiny_studiolms_templates';
    }

    /**
     * Returns the human-readable event name.
     *
     * @return string
     */
    #[\Override]
    public static function get_name(): string {
        return get_string('event_template_deleted', 'tiny_studiolms');
    }

    /**
     * Returns a description of this event.
     *
     * @return string
     */
    #[\Override]
    public function get_description(): string {
        $name = $this->other['name'] ?? '';
        return "The user with id '{$this->userid}' deleted the StudioLMS template with id '{$this->objectid}'" .
            ($name !== '' ? " ('{$name}')" : '') . '.';
    }

    /**
     * Declares that the template id is not remapped when course logs are restored.
     *
     * Templates belong to the site, not to a course, so the id a backup carries is not translated.
     *
     * @return array
     */
    #[\Override]
    public static function get_objectid_mapping(): array {
        return ['db' => 'tiny_studiolms_templates', 'restore' => \core\event\base::NOT_MAPPED];
    }

    /**
     * Declares that nothing in the event's other data is remapped when course logs are restored.
     *
     * The only value in other is the template name, which is text, not an id.
     *
     * @return array|false
     */
    #[\Override]
    public static function get_other_mapping(): array|false {
        return false;
    }
}
