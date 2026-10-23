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
 * PHPUnit tests for the hover and sound classes emitted by the block templates.
 *
 * @package    tiny_studiolms
 * @copyright  2026 Jean Lúcio
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace tiny_studiolms;

use advanced_testcase;

/**
 * Tests that the hover effect and click sound a teacher picks reach the page as CSS classes.
 *
 * @coversNothing
 */
final class interaction_classes_test extends advanced_testcase {
    /**
     * Renders one of the plugin templates.
     *
     * @param string $name Template name without the component.
     * @param array $context Template context.
     * @return string The rendered HTML.
     */
    private function render(string $name, array $context): string {
        global $PAGE;

        $this->resetAfterTest();
        $PAGE->set_url('/');
        return $PAGE->get_renderer('core')->render_from_template('tiny_studiolms/' . $name, $context);
    }

    /**
     * The button carries the classes the stylesheet and the front-end script read.
     *
     * Regression test: the template wrote data-slms-hover and data-slms-sound, which nothing reads
     * (and the HTML purifier drops), so the hover effect and the click sound never worked. The
     * accordion has always used the slms-hov-* and slms-snd-* classes.
     */
    public function test_button_emits_hover_and_sound_classes(): void {
        $html = $this->render('block_button', ['btnUrl' => '#', 'hoverEffect' => 'lift', 'clickSound' => 'chime']);

        $this->assertMatchesRegularExpression('/<a [^>]*class="[^"]*\bslms-hov-lift\b[^"]*"/', $html);
        $this->assertMatchesRegularExpression('/<a [^>]*class="[^"]*\bslms-snd-chime\b[^"]*"/', $html);
        $this->assertStringNotContainsString('data-slms-hover', $html);
        $this->assertStringNotContainsString('data-slms-sound', $html);
    }

    /**
     * The card and its button each carry their own hover class, and the button its sound.
     */
    public function test_card_emits_hover_and_sound_classes(): void {
        $html = $this->render('block_card', [
            'hoverEffect' => 'scale',
            'hasButton' => true,
            'btnUrl' => '#',
            'btnHoverEffect' => 'glow',
            'btnClickSound' => 'pop',
        ]);

        $this->assertMatchesRegularExpression('/class="studiolms-card slms-hov-scale\b/', $html);
        $this->assertMatchesRegularExpression('/class="studiolms-btn slms-hov-glow slms-snd-pop"/', $html);
        $this->assertStringNotContainsString('data-slms-hover', $html);
        $this->assertStringNotContainsString('data-slms-sound', $html);
    }

    /**
     * The callout carries its hover class on the wrapper.
     */
    public function test_callout_emits_hover_class(): void {
        $html = $this->render('block_callout', ['hoverEffect' => 'lift', 'contentHtml' => '<p>Tip</p>']);

        $this->assertMatchesRegularExpression('/class="studiolms-callout-wrap [^"]*\bslms-hov-lift\b/', $html);
        $this->assertStringNotContainsString('data-slms-hover', $html);
    }

    /**
     * The front-end script starts on a page whose only StudioLMS blocks need no script of their own.
     *
     * Regression test: init() returned early unless the page had an accordion, resources, card or
     * callout, so on a page with only a heading and a button the editing attributes were never
     * removed and a student, or a teacher outside the editor, could type into the text of the blocks.
     * Every block root carries data-slms-block-type, which is what the check has to look for.
     */
    public function test_frontend_script_starts_for_any_block(): void {
        global $CFG;

        $source = file_get_contents($CFG->dirroot . '/lib/editor/tiny/plugins/studiolms/amd/src/frontend.js');

        $this->assertMatchesRegularExpression("/ANY_BLOCK: '\\[data-slms-block-type\\]'/", $source);
    }
}
