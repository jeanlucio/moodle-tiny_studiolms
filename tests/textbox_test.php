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
 * PHPUnit tests for the Text Box block template.
 *
 * @package    tiny_studiolms
 * @copyright  2026 Jean Lúcio
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace tiny_studiolms;

use advanced_testcase;

/**
 * Tests that the Text Box block shows its text and its alignment where Moodle cleans the text.
 *
 * @coversNothing
 */
final class textbox_test extends advanced_testcase {
    /**
     * The text, the class of the alignment and the hover class survive the HTML cleaner.
     *
     * Regression test: a template holds only blocks, so a paragraph between two of them had no place in it. The
     * block is that paragraph, and a forum post or a question text, where the cleaner drops what is not a class,
     * must show it as it was set.
     */
    public function test_the_text_and_its_alignment_reach_the_reader(): void {
        global $PAGE;

        $PAGE->set_url('/');
        $renderer = $PAGE->get_renderer('core');

        foreach (['left', 'center', 'right', 'justify'] as $align) {
            $html = $renderer->render_from_template('tiny_studiolms/block_textbox', [
                'textAlign' => $align,
                'hoverEffect' => 'lift',
                'content' => '<p>First <strong>line</strong></p><ul><li>Item</li></ul>',
            ]);
            $cleaned = clean_text($html, FORMAT_HTML);

            foreach ([$html, $cleaned] as $shown) {
                $this->assertStringContainsString("slms-textalign-$align", $shown, $align);
                $this->assertStringContainsString('slms-hov-lift', $shown, $align);
                $this->assertStringContainsString('<strong>line</strong>', $shown, $align);
                $this->assertStringContainsString('<li>Item</li>', $shown, $align);
            }
        }
    }

    /**
     * The text of the block is typed in an editable island inside a block that is not editable, and the markup
     * says nothing else about it: no inline style, which the cleaner would have to be trusted to keep.
     */
    public function test_the_block_is_an_editable_island_with_no_inline_style(): void {
        global $PAGE;

        $PAGE->set_url('/');
        $html = $PAGE->get_renderer('core')->render_from_template('tiny_studiolms/block_textbox', [
            'textAlign' => 'left',
            'content' => '<p>Text</p>',
        ]);

        $this->assertStringContainsString('class="slms-textbox-content slms-textalign-left mceEditable"', $html);
        $this->assertStringContainsString('contenteditable="true"', $html);
        $this->assertStringNotContainsString('style=', $html);
    }
}
