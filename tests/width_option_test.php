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
 * PHPUnit tests for the width class of the blocks that a stylesheet caps, and of the table.
 *
 * @package    tiny_studiolms
 * @copyright  2026 Jean Lúcio
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace tiny_studiolms;

use advanced_testcase;

/**
 * Tests that the width a teacher picks reaches the page, where Moodle cleans the text.
 *
 * @package    tiny_studiolms
 * @category   test
 * @copyright  2026 Jean Lúcio
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 * @coversNothing
 */
final class width_option_test extends advanced_testcase {
    /**
     * Provide the templates that take a width.
     *
     * @return array The template name.
     */
    public static function templates_provider(): array {
        return array_map(fn($name) => [$name], [
            'block_profilecard', 'block_chart', 'block_chart_bar', 'block_infographic_steps',
            'block_infographic_timeline', 'block_infographic_comparison', 'block_card', 'block_resources',
            'block_table', 'block_heading', 'block_callout', 'block_accordion', 'block_tabs', 'block_gridcards',
            'block_textbox', 'block_infographic_features',
        ]);
    }

    /**
     * The class of the chosen width is on the block and survives the HTML cleaner.
     *
     * Regression test: a stylesheet caps these blocks and the table is free, so the choice has to reach the page as a
     * class, the only thing the cleaner keeps of what a teacher sets.
     *
     * @dataProvider templates_provider
     * @param string $name Template name without the component.
     */
    public function test_the_chosen_width_reaches_the_reader(string $name): void {
        global $PAGE;

        $PAGE->set_url('/');
        $renderer = $PAGE->get_renderer('core');

        foreach (['reduced', 'full'] as $width) {
            $html = $renderer->render_from_template('tiny_studiolms/' . $name, ['width' => $width]);
            $this->assertStringContainsString("slms-width-$width", $html, "$name, $width");
            $this->assertStringContainsString("slms-width-$width", clean_text($html, FORMAT_HTML), "$name, $width, cleaned");
        }
    }

    /**
     * The resources are capped by the stylesheet, not by a style attribute that no option could lift.
     */
    public function test_the_resources_have_no_inline_cap(): void {
        global $PAGE;

        $PAGE->set_url('/');
        $html = $PAGE->get_renderer('core')->render_from_template('tiny_studiolms/block_resources', ['width' => 'full']);

        $this->assertStringNotContainsString('max-width', $html);
    }
}
