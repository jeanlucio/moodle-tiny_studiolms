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
 * PHPUnit tests for the templates of the chart, bar chart and gauge blocks.
 *
 * @package    tiny_studiolms
 * @copyright  2026 Jean Lúcio
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace tiny_studiolms;

use advanced_testcase;

/**
 * Tests that the three blocks reach the reader where Moodle cleans the text.
 *
 * @coversNothing
 */
final class chart_templates_test extends advanced_testcase {
    /**
     * Render a block template.
     *
     * @param string $name Template name without the component.
     * @param array $context Template context.
     * @return string The HTML.
     */
    private function render(string $name, array $context): string {
        global $PAGE;

        $PAGE->set_url('/');
        return $PAGE->get_renderer('core')->render_from_template('tiny_studiolms/' . $name, $context);
    }

    /**
     * Provide each block with a context and what the reader must still see after the cleaner.
     *
     * @return array The template, its context and the markers that have to survive.
     */
    public static function blocks_provider(): array {
        $slices = [
            ['label' => 'Passed', 'pct' => 75, 'width' => 75, 'color' => 1],
            ['label' => 'Failed', 'pct' => 25, 'width' => 25, 'color' => 2],
        ];
        $items = [
            ['label' => 'Passed', 'pct' => 75, 'size' => 100, 'color' => 1],
            ['label' => 'Failed', 'pct' => 25, 'size' => 33.33, 'color' => 2],
        ];
        return [
            'chart' => ['block_chart', ['title' => 'T', 'slices' => $slices],
                ['slms-chart__segment slms-bar-c1', 'width:75%', 'width:25%', 'Passed', '75%']],
            'bars, horizontal' => ['block_chart_bar', ['type' => 'horizontal', 'horizontal' => true, 'items' => $items],
                ['slms-bar-row__fill slms-bar-c1', 'width:100%', 'width:33.33%', 'Failed', '25%']],
            'bars, vertical' => ['block_chart_bar', ['type' => 'vertical', 'horizontal' => false, 'items' => $items],
                ['slms-bar-col__fill slms-bar-c2', 'height:100%', 'height:33.33%', 'Failed', '25%']],
            'gauge' => ['block_gauge', ['gauges' => [['value' => 75, 'label' => 'Passed', 'zone' => 'ok']]],
                ['slms-gauge--ok slms-gp-75', 'slms-gauge__fill', '75%', 'Passed']],
        ];
    }

    /**
     * No block draws SVG, and what it does draw is what the HTML cleaner keeps.
     *
     * Regression test: the three blocks were SVG, which the cleaner of a forum post, a glossary entry, a question
     * or an assignment removes, so only the legend (or nothing) reached the reader. They are plain HTML now: the
     * cleaner must leave them exactly as rendered.
     *
     * @dataProvider blocks_provider
     * @param string $template Template name.
     * @param array $context Template context.
     * @param string[] $markers What has to be in the cleaned text.
     */
    public function test_the_block_survives_the_html_cleaner(string $template, array $context, array $markers): void {
        $this->resetAfterTest();

        $html = $this->render($template, $context);
        $this->assertStringNotContainsString('<svg', $html);

        $cleaned = clean_text($html, FORMAT_HTML);
        foreach ($markers as $marker) {
            $this->assertStringContainsString($marker, $cleaned);
        }
        $this->assertStringNotContainsString('<svg', $cleaned);
    }

    /**
     * A label typed by the author is escaped once, in the template.
     */
    public function test_a_label_is_escaped(): void {
        $this->resetAfterTest();

        $html = $this->render('block_chart', [
            'slices' => [['label' => '<b>A & B</b>', 'pct' => 100, 'width' => 100, 'color' => 1]],
        ]);

        $this->assertStringContainsString('&lt;b&gt;A &amp; B&lt;/b&gt;', $html);
    }
}
