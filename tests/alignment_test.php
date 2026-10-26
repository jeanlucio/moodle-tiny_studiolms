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
 * PHPUnit tests for the alignment class of the blocks that are narrower than the page.
 *
 * @package    tiny_studiolms
 * @copyright  2026 Jean Lúcio
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace tiny_studiolms;

use advanced_testcase;

/**
 * Tests that the alignment a teacher picks reaches the page, where Moodle cleans the text.
 *
 * @coversNothing
 */
final class alignment_test extends advanced_testcase {
    /**
     * Provide the templates that take an alignment.
     *
     * @return array The template name.
     */
    public static function templates_provider(): array {
        return array_map(fn($name) => [$name], [
            'block_profilecard', 'block_chart', 'block_chart_bar', 'block_infographic_steps',
            'block_infographic_timeline', 'block_infographic_comparison', 'block_card', 'block_resources',
        ]);
    }

    /**
     * The class of the chosen alignment is on the block and survives the HTML cleaner.
     *
     * Regression test: the TinyMCE alignment buttons do nothing to these blocks, so the choice is the align field
     * of the block, and the course page can show it only as a class (the cleaner drops what is not one).
     *
     * @dataProvider templates_provider
     * @param string $name Template name without the component.
     */
    public function test_the_chosen_alignment_reaches_the_reader(string $name): void {
        global $PAGE;

        $PAGE->set_url('/');
        $renderer = $PAGE->get_renderer('core');

        foreach (['left', 'center', 'right'] as $align) {
            $html = $renderer->render_from_template('tiny_studiolms/' . $name, ['align' => $align]);
            $this->assertStringContainsString("slms-align-$align", $html, "$name, $align");
            $this->assertStringContainsString("slms-align-$align", clean_text($html, FORMAT_HTML), "$name, $align, cleaned");
        }
    }
}
