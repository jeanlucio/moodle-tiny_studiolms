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
 * PHPUnit tests for tiny_studiolms\ai\generator.
 *
 * @package    tiny_studiolms
 * @copyright  2026 Jean Lúcio
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace tiny_studiolms\ai;

use advanced_testcase;

/**
 * Tests for the AI block/preset generator that do not require a live provider.
 *
 * These tests cover the fail-safe paths that fire before any HTTP call is made: no
 * provider configured at all, and an unsafe custom endpoint URL (SSRF guard).
 *
 * @covers \tiny_studiolms\ai\generator
 */
final class generator_test extends advanced_testcase {
    #[\Override]
    protected function setUp(): void {
        parent::setUp();
        $this->resetAfterTest();

        // Ensure a clean slate: no keys at any tier of the resolution ladder.
        set_config('apikey_gemini', '', 'tiny_studiolms');
        set_config('apikey_groq', '', 'tiny_studiolms');
        set_config('apikey_custom', '', 'tiny_studiolms');
        set_config('custom_baseurl', '', 'tiny_studiolms');
        set_config('custom_model', '', 'tiny_studiolms');
    }

    /**
     * generate_block() throws when no provider is configured at any level.
     */
    public function test_generate_block_throws_when_no_provider_configured(): void {
        $this->expectException(\moodle_exception::class);
        generator::generate_block('A callout about photosynthesis');
    }

    /**
     * generate_preset() throws when no provider is configured, regardless of palette.
     */
    public function test_generate_preset_throws_when_no_provider_configured(): void {
        $this->expectException(\moodle_exception::class);
        generator::generate_preset('My Layout', 'Intro to photosynthesis', '', 'not-a-real-palette');
    }

    /**
     * generate_mindmap() throws when no provider is configured.
     */
    public function test_generate_mindmap_throws_when_no_provider_configured(): void {
        $this->expectException(\moodle_exception::class);
        generator::generate_mindmap('Photosynthesis');
    }

    /**
     * generate_infographic() throws when no provider is configured.
     */
    public function test_generate_infographic_throws_when_no_provider_configured(): void {
        $this->expectException(\moodle_exception::class);
        generator::generate_infographic('Photosynthesis');
    }

    /**
     * generate_infographic_steps() throws when no provider is configured.
     */
    public function test_generate_infographic_steps_throws_when_no_provider_configured(): void {
        $this->expectException(\moodle_exception::class);
        generator::generate_infographic_steps('Photosynthesis');
    }

    /**
     * generate_infographic_features() throws when no provider is configured.
     */
    public function test_generate_infographic_features_throws_when_no_provider_configured(): void {
        $this->expectException(\moodle_exception::class);
        generator::generate_infographic_features('Photosynthesis');
    }

    /**
     * generate_text() throws when no provider is configured.
     */
    public function test_generate_text_throws_when_no_provider_configured(): void {
        $this->expectException(\moodle_exception::class);
        generator::generate_text('You are a helpful assistant.', 'Say hello.');
    }

    /**
     * A custom provider endpoint pointing at a loopback address is rejected before any
     * network call is attempted (SSRF guard), causing the same fail-safe exception as
     * having no provider at all — never a raw connection error or a silent success.
     */
    public function test_unsafe_custom_url_is_rejected_without_network_call(): void {
        set_config('apikey_custom', 'fake-key', 'tiny_studiolms');
        set_config('custom_baseurl', 'https://127.0.0.1/v1/chat/completions', 'tiny_studiolms');

        $this->expectException(\moodle_exception::class);
        generator::generate_block('A callout about photosynthesis');
    }

    /**
     * A non-HTTPS custom provider endpoint is rejected before any network call is attempted.
     */
    public function test_non_https_custom_url_is_rejected_without_network_call(): void {
        set_config('apikey_custom', 'fake-key', 'tiny_studiolms');
        set_config('custom_baseurl', 'http://api.example.com/v1/chat/completions', 'tiny_studiolms');

        $this->expectException(\moodle_exception::class);
        generator::generate_block('A callout about photosynthesis');
    }
}
