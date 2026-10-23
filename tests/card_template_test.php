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
 * PHPUnit tests for the card block template.
 *
 * @package    tiny_studiolms
 * @copyright  2026 Jean Lúcio
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace tiny_studiolms;

use advanced_testcase;

/**
 * Tests that the text a visitor's assistive technology reads from the card is a lang string.
 *
 * @coversNothing
 */
final class card_template_test extends advanced_testcase {
    /**
     * The video iframe is named by the video_file string, not by a literal in the template.
     *
     * Regression test: the title was the English word "Video" written into the template, which a
     * screen reader announced in every language and no language pack could translate. The page
     * keeps the markup the template produced, so the name is whatever language the author used.
     */
    public function test_the_video_frame_title_comes_from_a_lang_string(): void {
        global $CFG, $PAGE;

        $this->resetAfterTest();
        $PAGE->set_url('/');

        $html = $PAGE->get_renderer('core')->render_from_template('tiny_studiolms/block_card', [
            'hasMedia' => true,
            'isVideo' => true,
            'mediaUrl' => 'https://www.youtube-nocookie.com/embed/abc',
        ]);

        $this->assertStringContainsString(
            'title="' . get_string('video_file', 'tiny_studiolms') . '"',
            $html
        );

        $source = file_get_contents($CFG->dirroot . '/lib/editor/tiny/plugins/studiolms/templates/block_card.mustache');
        $this->assertDoesNotMatchRegularExpression('/<iframe[^>]*\stitle="[A-Za-z]/', $source);
    }
}
