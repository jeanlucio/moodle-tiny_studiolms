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
 * PHPUnit tests for tiny_studiolms\ai\chat.
 *
 * @package    tiny_studiolms
 * @copyright  2026 Jean Lúcio
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace tiny_studiolms\ai;

use advanced_testcase;
use tiny_studiolms\tests\hub_stub_trait;

defined('MOODLE_INTERNAL') || die();

global $CFG;
require_once($CFG->dirroot . '/lib/editor/tiny/plugins/studiolms/tests/fixtures/hub_stub_trait.php');

/**
 * Tests for the AI chat assistant that never reach a live provider.
 *
 * build_system_prompt() is tested directly; send() goes through a stubbed local_aihub client.
 *
 * @covers \tiny_studiolms\ai\chat
 */
final class chat_test extends advanced_testcase {
    use hub_stub_trait;

    #[\Override]
    protected function setUp(): void {
        parent::setUp();
        $this->resetAfterTest();
        $this->setAdminUser();
    }

    #[\Override]
    protected function tearDown(): void {
        $this->reset_hub_stub();
        parent::tearDown();
    }

    /**
     * A reply that is not valid JSON is cleaned exactly like the JSON branch, not returned raw.
     *
     * Regression test: the fallback branch used to return the model's text with only trim(), while a
     * prompt can easily steer the model away from JSON.
     */
    public function test_non_json_reply_is_cleaned(): void {
        $this->install_hub_stub(true, 'Hello <img src=x onerror=alert(1)><b>there</b>');

        $result = chat::send([['role' => 'user', 'content' => 'Hi']], '[]', \context_system::instance());

        $this->assertStringNotContainsString('<', $result['reply']);
        $this->assertStringContainsString('Hello', $result['reply']);
        $this->assertNull($result['action']);
    }

    /**
     * The system prompt lists presets by name when a preset context is supplied.
     */
    public function test_system_prompt_includes_supplied_presets(): void {
        $prompt = chat::build_system_prompt(json_encode(['Onboarding', 'Course Wrap-up']));

        $this->assertStringContainsString('Onboarding', $prompt);
        $this->assertStringContainsString('Course Wrap-up', $prompt);
    }

    /**
     * No preset section is added when the preset context is empty.
     */
    public function test_system_prompt_omits_preset_section_when_none_supplied(): void {
        $prompt = chat::build_system_prompt('');

        $this->assertStringNotContainsString('Available presets', $prompt);
    }

    /**
     * Malformed (non-JSON) preset context is tolerated rather than fataling.
     */
    public function test_system_prompt_tolerates_malformed_preset_context(): void {
        $prompt = chat::build_system_prompt('not valid json{{{');

        $this->assertIsString($prompt);
        $this->assertStringNotContainsString('Available presets', $prompt);
    }

    /**
     * The prompt always documents the generate_template and apply_preset action shapes.
     */
    public function test_system_prompt_documents_action_types(): void {
        $prompt = chat::build_system_prompt('[]');

        $this->assertStringContainsString('generate_template', $prompt);
        $this->assertStringContainsString('apply_preset', $prompt);
    }
}
