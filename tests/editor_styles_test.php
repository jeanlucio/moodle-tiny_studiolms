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
 * PHPUnit tests for the stylesheet the editor frame loads.
 *
 * @package    tiny_studiolms
 * @copyright  2026 Jean Lúcio
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace tiny_studiolms;

use advanced_testcase;

/**
 * Tests for editor_styles.css, the copy of styles.css the editor frame loads.
 *
 * @coversNothing
 */
final class editor_styles_test extends advanced_testcase {
    /**
     * The theme adds the plugin's editor stylesheet to the one it serves to every editor frame.
     */
    public function test_theme_serves_the_plugin_editor_stylesheet(): void {
        global $CFG;

        $this->resetAfterTest();

        $files = \theme_config::load('boost')->editor_css_files();

        $this->assertArrayHasKey('tiny_studiolms', $files);
        $this->assertSame(
            realpath($CFG->dirroot . '/lib/editor/tiny/plugins/studiolms/editor_styles.css'),
            realpath($files['tiny_studiolms'])
        );
    }

    /**
     * The editor copy is the page stylesheet byte for byte, so a block cannot look different while being edited.
     */
    public function test_editor_copy_matches_the_page_stylesheet(): void {
        $dir = \core_component::get_plugin_directory('tiny', 'studiolms');

        $this->assertSame(
            file_get_contents($dir . '/styles.css'),
            file_get_contents($dir . '/editor_styles.css'),
            'editor_styles.css must be an exact copy of styles.css. Run: cp styles.css editor_styles.css'
        );
    }
}
