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
 * PHPUnit guard for text written into the Mustache templates of tiny_studiolms.
 *
 * @package    tiny_studiolms
 * @copyright  2026 Jean Lúcio
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace tiny_studiolms;

use advanced_testcase;

/**
 * Tests that every text a template shows, or hands to assistive technology, is a language string.
 *
 * @coversNothing
 */
final class templates_text_test extends advanced_testcase {
    /**
     * No title, aria-label, alt or placeholder attribute holds a literal word.
     *
     * Such an attribute is the name a screen reader announces, so a literal reaches every site in one
     * language and no language pack can translate it. An address used as an example ("https://...")
     * is not text and is allowed.
     */
    public function test_no_template_attribute_holds_literal_text(): void {
        global $CFG;

        $files = glob($CFG->dirroot . '/lib/editor/tiny/plugins/studiolms/templates/*.mustache');
        $this->assertNotEmpty($files);

        $found = [];
        foreach ($files as $file) {
            // Mustache comments hold the example context, which is not output.
            $source = preg_replace('/\{\{!.*?\}\}/s', '', file_get_contents($file));
            preg_match_all('/\s(title|aria-label|alt|placeholder)="([A-Za-z][^"{]*)"/', $source, $matches, PREG_SET_ORDER);
            foreach ($matches as $match) {
                if (!preg_match('~^https?://~', $match[2])) {
                    $found[] = basename($file) . ': ' . $match[1] . '="' . $match[2] . '"';
                }
            }
        }

        $this->assertSame([], $found, 'Use {{#str}} for these attributes.');
    }

    /**
     * The checkboxes of the comparison popup are named from a string with the option and the row.
     *
     * Regression test: they were named "A 1", "B 1" and so on, written into the template.
     */
    public function test_comparison_checkboxes_are_named_from_a_string(): void {
        global $PAGE;

        $this->resetAfterTest();
        $PAGE->set_url('/');

        $html = $PAGE->get_renderer('core')->render_from_template('tiny_studiolms/popup_infographic_comparison_edit', []);

        foreach (['A', 'B'] as $option) {
            foreach (range(1, 6) as $row) {
                $label = get_string(
                    'infographic_comparison_check_label',
                    'tiny_studiolms',
                    (object) ['option' => $option, 'row' => $row]
                );
                $this->assertStringContainsString('aria-label="' . $label . '"', $html, $label);
            }
        }
    }
}
