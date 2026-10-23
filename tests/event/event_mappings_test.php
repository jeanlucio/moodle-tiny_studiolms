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
 * PHPUnit guard for the restore mappings of every event of tiny_studiolms.
 *
 * @package    tiny_studiolms
 * @copyright  2026 Jean Lúcio
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace tiny_studiolms\event;

use advanced_testcase;

/**
 * Tests that no event of the plugin falls back to the core's "must define get_objectid_mapping()" notice.
 *
 * Restoring a backup with logs asks each event class how to translate the object id it logged. An
 * event that does not answer makes the core print a debugging message per restored record and copy
 * the id as it was, which may now name another row. A new event is covered the day it is added.
 *
 * @coversNothing
 */
final class event_mappings_test extends advanced_testcase {
    /**
     * Every event class of the plugin that logs an object declares its own objectid mapping.
     */
    public function test_every_event_declares_its_objectid_mapping(): void {
        global $CFG;

        $files = glob($CFG->dirroot . '/lib/editor/tiny/plugins/studiolms/classes/event/*.php');
        $this->assertNotEmpty($files);

        foreach ($files as $file) {
            $class = 'tiny_studiolms\\event\\' . basename($file, '.php');
            $method = new \ReflectionMethod($class, 'get_objectid_mapping');
            $this->assertSame(
                $class,
                $method->getDeclaringClass()->getName(),
                "{$class} must define get_objectid_mapping() instead of inheriting the core's placeholder."
            );
            $this->assertNotFalse($class::get_objectid_mapping(), $class);
        }
        $this->assertDebuggingNotCalled();
    }
}
