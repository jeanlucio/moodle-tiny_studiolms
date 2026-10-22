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
 * PHPUnit tests for the declarative definitions in db/services.php and db/hooks.php.
 *
 * @package    tiny_studiolms
 * @copyright  2026 Jean Lúcio
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace tiny_studiolms;

use advanced_testcase;
use core_external\external_api;

/**
 * Tests that what the db/ definition files point to really exists.
 *
 * A typo in a class name, method or capability in these arrays is silent until the first AJAX call or
 * page render that needs it, so the arrays are loaded and every reference is resolved.
 *
 * @coversNothing
 */
final class db_definitions_test extends advanced_testcase {
    /**
     * Loads the web service definitions.
     *
     * @return array[] The $functions array of db/services.php.
     */
    private function load_services(): array {
        global $CFG;

        $functions = [];
        require($CFG->dirroot . '/lib/editor/tiny/plugins/studiolms/db/services.php');
        return $functions;
    }

    /**
     * Every declared web service points to an existing external class, method and capability.
     */
    public function test_services_resolve_to_real_code(): void {
        $this->resetAfterTest();

        $functions = $this->load_services();
        $this->assertNotEmpty($functions);

        foreach ($functions as $name => $definition) {
            $this->assertStringStartsWith('tiny_studiolms_', $name);
            $this->assertTrue(class_exists($definition['classname']), "{$name}: missing class");
            $this->assertTrue(
                method_exists($definition['classname'], $definition['methodname']),
                "{$name}: missing method"
            );
            $this->assertTrue(
                is_subclass_of($definition['classname'], external_api::class),
                "{$name}: not an external_api"
            );
            $this->assertNotNull(get_capability_info($definition['capabilities']), "{$name}: unknown capability");
        }
    }

    /**
     * Every external function class in the plugin is registered as a web service.
     */
    public function test_every_external_class_is_registered(): void {
        global $CFG;

        $registered = array_column($this->load_services(), 'classname');

        $files = glob($CFG->dirroot . '/lib/editor/tiny/plugins/studiolms/classes/external/*.php');
        $this->assertNotEmpty($files);
        foreach ($files as $file) {
            $class = 'tiny_studiolms\\external\\' . basename($file, '.php');
            $this->assertContains($class, $registered, "{$class} is not declared in db/services.php");
        }
    }

    /**
     * Every hook callback names a real hook class and a callable method.
     */
    public function test_hook_callbacks_are_callable(): void {
        global $CFG;

        $callbacks = [];
        require($CFG->dirroot . '/lib/editor/tiny/plugins/studiolms/db/hooks.php');

        $this->assertNotEmpty($callbacks);
        foreach ($callbacks as $callback) {
            $this->assertTrue(class_exists($callback['hook']), "Missing hook class {$callback['hook']}");
            $this->assertTrue(is_callable($callback['callback']), "Callback {$callback['callback']} is not callable");
        }
    }
}
