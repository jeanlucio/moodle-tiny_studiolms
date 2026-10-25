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

    /**
     * Where the media goes and whether the side accent shows are classes, not inline styles.
     *
     * Regression test for the card layout options: the purifier keeps classes and strips what an inline style
     * carries beyond the properties it knows, so the page must not depend on a variable set in a style.
     */
    public function test_media_position_and_accent_are_classes(): void {
        global $PAGE;

        $this->resetAfterTest();
        $PAGE->set_url('/');
        $renderer = $PAGE->get_renderer('core');

        $plain = $renderer->render_from_template('tiny_studiolms/block_card', ['accent' => true, 'border' => '#0d47a1']);
        $this->assertStringNotContainsString('slms-media-end', $plain);
        $this->assertStringNotContainsString('slms-no-accent', $plain);
        $this->assertStringContainsString('border-left-color: #0d47a1', $plain);

        $end = $renderer->render_from_template('tiny_studiolms/block_card', [
            'isHorizontal' => true, 'mediaEnd' => true, 'accent' => false, 'border' => '#0d47a1',
        ]);
        $this->assertStringContainsString('slms-horizontal slms-media-end slms-no-accent', $end);
        $this->assertStringNotContainsString('border-left-color', $end);
    }

    /**
     * An accordion draws both icons of its pair and a title bar background only when one is set.
     *
     * Regression test: one icon was drawn and turned a quarter when the accordion was closed, so a folder lay on
     * its side and a plus sign was turned; the stylesheet now shows the first icon while closed and the second
     * while open. A block saved before the title bar had a background of its own has none, and stays one colour.
     */
    public function test_accordion_draws_both_icons_and_a_header_background_only_when_set(): void {
        global $PAGE;

        $this->resetAfterTest();
        $PAGE->set_url('/');
        $renderer = $PAGE->get_renderer('core');

        $html = $renderer->render_from_template('tiny_studiolms/block_accordion', [
            'bg' => '#ffffff', 'color' => '#3b82f6', 'iconFirst' => '📁', 'iconSecond' => '📂',
        ]);
        $this->assertStringContainsString('slms-acc-icon-closed">📁<', $html);
        $this->assertStringContainsString('slms-acc-icon-open">📂<', $html);
        $this->assertStringNotContainsString('background-color: #', substr($html, strpos($html, 'studiolms-accordion-header')));

        $coloured = $renderer->render_from_template('tiny_studiolms/block_accordion', [
            'bg' => '#ffffff', 'color' => '#3b82f6', 'headerBg' => '#e3f2fd', 'iconFirst' => '▼', 'iconSecond' => '▲',
        ]);
        $this->assertStringContainsString('color: #3b82f6; background-color: #e3f2fd;', $coloured);
    }

    /**
     * A pair of one icon twice is one icon that turns, and the content has a body to animate.
     *
     * Regression test for the chevron option: it is drawn once, with the class the stylesheet turns, and not as
     * two icons that would cross-fade; and the content sits in a body whose height the stylesheet animates.
     */
    public function test_accordion_chevron_is_one_turning_icon_and_content_has_a_body(): void {
        global $PAGE;

        $this->resetAfterTest();
        $PAGE->set_url('/');
        $renderer = $PAGE->get_renderer('core');

        $html = $renderer->render_from_template('tiny_studiolms/block_accordion', [
            'bg' => '#ffffff', 'color' => '#3b82f6', 'iconFirst' => '❯', 'iconSecond' => '❯', 'iconTurns' => true,
            'content' => '<p>Text</p>',
        ]);
        $this->assertStringContainsString('slms-acc-icon slms-acc-icon-turns', $html);
        $this->assertSame(1, substr_count($html, '❯'));
        $this->assertStringNotContainsString('slms-acc-icon-open', $html);
        $this->assertMatchesRegularExpression(
            '/<div class="studiolms-accordion-body">\s*<div class="studiolms-editable-area studiolms-accordion-content"/',
            $html
        );
    }

    /**
     * An accordion set not to animate carries the class that switches the movement off, and a content colour only when set.
     *
     * Regression test for the animation option and the text colour of the content: the stylesheet switches the
     * transitions off by a class, and the colour is an inline style the purifier keeps, written only when set so
     * that an accordion saved without it keeps the colour of the page's text.
     */
    public function test_accordion_animation_and_content_colour_are_written_only_as_chosen(): void {
        global $PAGE;

        $this->resetAfterTest();
        $PAGE->set_url('/');
        $renderer = $PAGE->get_renderer('core');

        $plain = $renderer->render_from_template('tiny_studiolms/block_accordion', ['animate' => true, 'bg' => '#fff']);
        $this->assertStringNotContainsString('slms-static', $plain);
        $this->assertDoesNotMatchRegularExpression('/studiolms-accordion-content"[^>]*style=/', $plain);

        $chosen = $renderer->render_from_template('tiny_studiolms/block_accordion', [
            'animate' => false, 'contentColor' => '#112233', 'bg' => '#fff',
        ]);
        $this->assertStringContainsString('slms-static', $chosen);
        $this->assertMatchesRegularExpression('/studiolms-accordion-content"[^>]*style="color: #112233;"/', $chosen);
    }

    /**
     * The resources list draws the icon pair, has a body to animate and carries the switch, as the accordion does.
     *
     * Regression test: the list drew one icon and turned it a quarter when closed. Its content no longer takes its
     * padding from the p-4 utility, which cannot be taken to nothing while the list closes.
     */
    public function test_resources_draws_the_pair_and_has_a_body_to_animate(): void {
        global $PAGE;

        $this->resetAfterTest();
        $PAGE->set_url('/');
        $renderer = $PAGE->get_renderer('core');

        $pair = $renderer->render_from_template('tiny_studiolms/block_resources', [
            'bg' => '#fff', 'headerBg' => '#eee', 'color' => '#000', 'animate' => true,
            'iconFirst' => '📁', 'iconSecond' => '📂',
        ]);
        $this->assertStringContainsString('slms-acc-icon-closed">📁<', $pair);
        $this->assertStringContainsString('slms-acc-icon-open">📂<', $pair);
        $this->assertStringNotContainsString('slms-static', $pair);
        $this->assertStringContainsString('studiolms-resources-body', $pair);
        $this->assertStringNotContainsString('studiolms-resources-content p-4', $pair);

        $turns = $renderer->render_from_template('tiny_studiolms/block_resources', [
            'animate' => false, 'iconFirst' => '❯', 'iconSecond' => '❯', 'iconTurns' => true,
        ]);
        $this->assertStringContainsString('slms-acc-icon slms-acc-icon-turns', $turns);
        $this->assertStringNotContainsString('slms-acc-icon-open', $turns);
        $this->assertStringContainsString('slms-static', $turns);
    }

    /**
     * The description of a resources list has its colour from the block and not from the framework's grey.
     *
     * Regression test: the description was Bootstrap's "text-secondary", which in Moodle's theme is #ced4da, a
     * contrast of 1.42 to 1 on the header, far below the 4.5 to 1 that WCAG 2.1 AA asks of text that size.
     */
    public function test_resources_description_is_coloured_by_the_block_not_the_framework_grey(): void {
        global $PAGE;

        $this->resetAfterTest();
        $PAGE->set_url('/');

        $html = $PAGE->get_renderer('core')->render_from_template('tiny_studiolms/block_resources', [
            'bg' => '#fff', 'headerBg' => '#0d47a1', 'color' => '#fff', 'desc' => 'About', 'descColor' => '#ffffff',
        ]);

        $this->assertStringContainsString('<span class="slms-resources-desc small" style="color: #ffffff;">About</span>', $html);
        $this->assertStringNotContainsString('text-secondary', $html);
    }
}
