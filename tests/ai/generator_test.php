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
use tiny_studiolms\tests\hub_stub_trait;

defined('MOODLE_INTERNAL') || die();

global $CFG;
require_once($CFG->dirroot . '/lib/editor/tiny/plugins/studiolms/tests/fixtures/hub_stub_trait.php');

/**
 * Tests for the AI block/preset generator that never reach a live provider.
 *
 * A fresh test site has no hub key and no enabled core_ai provider, which covers the "no AI" path;
 * generation itself goes through a stubbed local_aihub client.
 *
 * @covers \tiny_studiolms\ai\generator
 */
final class generator_test extends advanced_testcase {
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
     * Asserts that a callable throws a moodle_exception with the given error code.
     *
     * @param string $errorcode Expected lang string key.
     * @param callable $fn Code expected to throw.
     */
    private function assert_throws_code(string $errorcode, callable $fn): void {
        try {
            $fn();
            $this->fail('Expected moodle_exception ' . $errorcode);
        } catch (\moodle_exception $e) {
            $this->assertSame($errorcode, $e->errorcode);
        }
    }

    /**
     * Every generator reports "no AI configured" when no AI source is available at all.
     */
    public function test_generators_throw_no_config_when_no_ai_available(): void {
        $context = \context_system::instance();
        $calls = [
            fn() => generator::generate_block('A callout about photosynthesis', $context),
            fn() => generator::generate_preset('My Layout', 'Intro to photosynthesis', '', 'not-a-real-palette', $context),
            fn() => generator::generate_mindmap('Photosynthesis', $context),
            fn() => generator::generate_infographic('Photosynthesis', $context),
            fn() => generator::generate_infographic_steps('Photosynthesis', $context),
            fn() => generator::generate_infographic_features('Photosynthesis', $context),
            fn() => generator::call_chat('You are a helpful assistant.', [['role' => 'user', 'content' => 'Hi']], $context),
        ];
        foreach ($calls as $call) {
            $this->assert_throws_code('ai_generator_no_config', $call);
        }
    }

    /**
     * A provider failure surfaces as the generator's own error, never as "not configured", and the raw
     * provider detail only reaches developer debugging.
     */
    public function test_provider_failure_throws_generator_error(): void {
        $this->install_hub_stub(false, '', 'Gemini: quota exceeded');

        $this->assert_throws_code(
            'ai_generator_error',
            fn() => generator::generate_block('A callout', \context_system::instance())
        );
        $this->assertDebuggingCalled('StudioLMS AI: Gemini: quota exceeded');
    }

    /**
     * generate_block() parses the hub response and reports the provider that served it.
     */
    public function test_generate_block_via_hub(): void {
        $client = $this->install_hub_stub(true, '{"blocktype":"callout","config":{"title":"Photosynthesis"}}');

        $block = generator::generate_block('A callout about photosynthesis', \context_system::instance());

        $this->assertSame('callout', $block['blocktype']);
        $this->assertSame('{"title":"Photosynthesis"}', $block['config']);
        $this->assertSame('Gemini', $block['provider']);
        $this->assertSame('A callout about photosynthesis', $client->calls[0][1]);
        $this->assertTrue($client->calls[0][2]);
    }

    /**
     * An unknown block type from the model is rejected even when the provider call succeeded.
     */
    public function test_generate_block_rejects_unknown_block_type(): void {
        $this->install_hub_stub(true, '{"blocktype":"script","config":{}}');

        $this->assert_throws_code(
            'ai_generator_error',
            fn() => generator::generate_block('Anything', \context_system::instance())
        );
    }

    /**
     * call_chat() flattens the history into role-labelled lines for the single-prompt providers.
     */
    public function test_call_chat_flattens_history(): void {
        $client = $this->install_hub_stub(true, '{"reply":"Hello"}');
        $messages = [
            ['role' => 'user', 'content' => 'Hi'],
            ['role' => 'assistant', 'content' => 'Hello!'],
            ['role' => 'user', 'content' => 'Make a mind map'],
        ];

        $result = generator::call_chat('System', $messages, \context_system::instance());

        $this->assertSame(['data' => '{"reply":"Hello"}', 'provider' => 'Gemini'], $result);
        $this->assertSame("User: Hi\nAssistant: Hello!\nUser: Make a mind map", $client->calls[0][1]);
        $this->assertSame('System', $client->calls[0][0]);
    }

    /**
     * Icons returned through the public steps generator pass the allow-list end to end.
     */
    public function test_generate_infographic_steps_filters_icons(): void {
        $payload = json_encode([
            'title' => 'Steps',
            'items' => [
                ['icon' => 'fa-users', 'title' => 'One', 'description' => 'First'],
                ['icon' => 'x" onmouseover="alert(1)', 'title' => 'Two', 'description' => 'Second'],
            ],
        ]);
        $this->install_hub_stub(true, $payload);

        $result = generator::generate_infographic_steps('Photosynthesis', \context_system::instance());
        $items = json_decode($result['items'], true);

        $this->assertSame('fa-solid fa-users', $items[0]['icon']);
        $this->assertSame('', $items[1]['icon']);
    }

    /**
     * Calls the private icon allow-list helper directly.
     *
     * Exercised through reflection so the allow-list is covered even on a site without local_aihub,
     * where the public generators can only be reached through the stubbed hub client.
     *
     * @param string $raw Icon value as a model would return it.
     * @return string
     */
    private function allowed_icon(string $raw): string {
        $method = new \ReflectionMethod(generator::class, 'allowed_icon');
        return $method->invoke(null, $raw);
    }

    /**
     * Listed icons pass, including the bare and "fas" short forms a model sometimes returns.
     */
    public function test_allowed_icon_accepts_listed_icons_and_short_forms(): void {
        $this->assertSame('fa-solid fa-users', $this->allowed_icon('fa-solid fa-users'));
        $this->assertSame('fa-solid fa-users', $this->allowed_icon('fa-users'));
        $this->assertSame('fa-solid fa-users', $this->allowed_icon('fas fa-users'));
        $this->assertSame('', $this->allowed_icon(''));
    }

    /**
     * An icon value that tries to break out of the class attribute is discarded entirely.
     *
     * Regression test for the AI icon XSS: PARAM_TEXT keeps quotes, so a prompt-injected value
     * like this one used to reach an innerHTML sink with its event handler intact.
     */
    public function test_allowed_icon_rejects_attribute_breakout(): void {
        $payload = 'x" onmouseover="alert(document.domain)" style="position:fixed;inset:0';

        $this->assertSame('', $this->allowed_icon($payload));
        $this->assertSame('', $this->allowed_icon('fa-solid fa-not-a-real-icon'));
    }
}
