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
 * PHPUnit tests for the Tabs block template.
 *
 * @package    tiny_studiolms
 * @copyright  2026 Jean Lúcio
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace tiny_studiolms;

use advanced_testcase;

/**
 * Tests that the Tabs block keeps all its panels, and the colour of its titles, where Moodle cleans the text.
 *
 * @coversNothing
 */
final class tabs_test extends advanced_testcase {
    /**
     * Every panel, its title and the colour of the title survive the HTML cleaner, and nothing is hidden by the markup.
     *
     * Regression test: the page script builds the row of tabs from the titles, and the cleaner of a forum or a question
     * removes every role and name, so the stored text must read well with no script at all: the panels one after the
     * other, each under its title, none of them hidden.
     */
    public function test_every_panel_reaches_the_reader_with_its_title(): void {
        global $PAGE;

        $PAGE->set_url('/');
        $html = $PAGE->get_renderer('core')->render_from_template('tiny_studiolms/block_tabs', [
            'hoverEffect' => 'none',
            'accent' => '#0b5d63',
            'tabs' => [
                ['title' => 'First tab', 'content' => '<p>First <strong>text</strong></p>'],
                ['title' => 'Second tab', 'content' => '<ul><li>Item</li></ul>'],
                ['title' => 'Third tab & more', 'content' => '<p>Third</p>'],
            ],
        ]);
        $cleaned = clean_text($html, FORMAT_HTML);

        foreach ([$html, $cleaned] as $shown) {
            $this->assertSame(3, substr_count($shown, 'studiolms-tab-panel'));
            foreach (['First tab', 'Second tab', 'Third tab &amp; more'] as $title) {
                $this->assertStringContainsString($title, $shown);
            }
            $this->assertStringContainsString('<strong>text</strong>', $shown);
            $this->assertStringContainsString('<li>Item</li>', $shown);
            // The cleaner writes the declaration without the space, so the colour is looked for either way.
            $this->assertMatchesRegularExpression('/color:\s*#0b5d63/', $shown);
            $this->assertStringNotContainsString('display: none', $shown);
            $this->assertStringNotContainsString('hidden', $shown);
        }
    }

    /**
     * A title is plain text: the template escapes it, so markup typed into it is not markup.
     */
    public function test_a_title_is_escaped(): void {
        global $PAGE;

        $PAGE->set_url('/');
        $html = $PAGE->get_renderer('core')->render_from_template('tiny_studiolms/block_tabs', [
            'accent' => '#0d47a1',
            'tabs' => [['title' => '<img src=x onerror=alert(1)>', 'content' => '<p>Text</p>']],
        ]);

        $this->assertStringNotContainsString('<img src=x', $html);
        $this->assertStringContainsString('&lt;img src=x onerror=alert(1)&gt;', $html);
    }
}
