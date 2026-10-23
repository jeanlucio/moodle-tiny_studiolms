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

    /**
     * A JSON reply is cleaned and its whitelisted action is passed through as JSON.
     */
    public function test_json_reply_returns_whitelisted_action(): void {
        $action = ['type' => 'generate_template', 'name' => 'Week 1', 'blocks' => 'callout', 'palette' => 'blue'];
        $reply = json_encode(['reply' => '<b>Done</b>', 'action' => $action]);
        $this->install_hub_stub(true, "\x60\x60\x60json\n" . $reply . "\n\x60\x60\x60");

        $result = chat::send([['role' => 'user', 'content' => 'Make week 1']], '[]', \context_system::instance());

        $this->assertSame('Done', $result['reply']);
        $this->assertSame('Gemini', $result['provider']);
        $this->assertSame($action, json_decode($result['action'], true));
    }

    /**
     * Both documented action types are accepted.
     */
    public function test_apply_preset_action_is_accepted(): void {
        $action = ['type' => 'apply_preset', 'preset_name' => 'Onboarding'];
        $this->install_hub_stub(true, json_encode(['reply' => 'Applying it', 'action' => $action]));

        $result = chat::send([['role' => 'user', 'content' => 'Use Onboarding']], '["Onboarding"]', \context_system::instance());

        $this->assertSame($action, json_decode($result['action'], true));
    }

    /**
     * An action type the model invents is dropped while the reply is kept.
     *
     * The type decides what the editor does next, so only the two documented ones may get through.
     */
    public function test_unknown_action_type_is_dropped(): void {
        $this->install_hub_stub(true, json_encode([
            'reply' => 'Sure',
            'action' => ['type' => 'delete_everything', 'target' => 'all'],
        ]));

        $result = chat::send([['role' => 'user', 'content' => 'Hi']], '[]', \context_system::instance());

        $this->assertSame('Sure', $result['reply']);
        $this->assertNull($result['action']);
    }

    /**
     * An action that is not an object, or has no type, is dropped.
     */
    public function test_malformed_action_is_dropped(): void {
        $context = \context_system::instance();
        $messages = [['role' => 'user', 'content' => 'Hi']];

        foreach (['generate_template', ['name' => 'no type'], []] as $action) {
            $this->install_hub_stub(true, json_encode(['reply' => 'Sure', 'action' => $action]));
            $result = chat::send($messages, '[]', $context);

            $this->assertSame('Sure', $result['reply']);
            $this->assertNull($result['action']);
        }
    }

    /**
     * Only the most recent MAX_HISTORY messages are sent to the provider.
     */
    public function test_send_keeps_only_the_latest_history(): void {
        $client = $this->install_hub_stub(true, '{"reply":"ok"}');
        $messages = [];
        for ($i = 1; $i <= chat::MAX_HISTORY + 5; $i++) {
            $messages[] = ['role' => 'user', 'content' => "message {$i}"];
        }

        chat::send($messages, '[]', \context_system::instance());

        $sent = explode("\n", $client->calls[0][1]);
        $this->assertCount(chat::MAX_HISTORY, $sent);
        $this->assertSame('User: message 6', $sent[0]);
    }

    /**
     * A reply that is not text (an object or a list) is handled like a reply that is not JSON.
     *
     * Regression test: clean_param() threw on it and the teacher saw the core's "coding error" page.
     */
    public function test_a_reply_that_is_not_text_does_not_break_the_chat(): void {
        $context = \context_system::instance();
        $messages = [['role' => 'user', 'content' => 'Hi']];

        foreach ([['Hello'], ['text' => 'Hello'], null, '', '   '] as $reply) {
            $this->install_hub_stub(true, json_encode(['reply' => $reply, 'action' => null]));
            $result = chat::send($messages, '[]', $context);

            $this->assertIsString($result['reply']);
            $this->assertNull($result['action']);
        }
    }
}
