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
 * PHPUnit tests for the licence header of the Mustache templates.
 *
 * @package    tiny_studiolms
 * @copyright  2026 Jean Lúcio
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace tiny_studiolms;

use advanced_testcase;

/**
 * Tests that every template of the plugin carries the Moodle licence header.
 *
 * @coversNothing
 */
final class templates_header_test extends advanced_testcase {
    /**
     * Every template opens with the licence comment, then the comment that declares it.
     *
     * Regression test: 27 templates, the ones of the chart, gauge, infographic and mind map blocks and
     * their popups and toolbars, started straight at the template comment with no licence text.
     */
    public function test_every_template_has_the_licence_header(): void {
        global $CFG;

        $files = glob($CFG->dirroot . '/lib/editor/tiny/plugins/studiolms/templates/*.mustache');
        $this->assertNotEmpty($files);

        $missing = [];
        foreach ($files as $file) {
            $source = file_get_contents($file);
            $licence = str_contains($source, 'This file is part of Moodle');
            $name = preg_quote(basename($file, '.mustache'), '/');
            $declared = preg_match('/\}\}\s*\{\{!\s*@template tiny_studiolms\/' . $name . '\s/', $source);
            if (!$licence || !$declared) {
                $missing[] = basename($file);
            }
        }

        $this->assertSame([], $missing);
    }
}
