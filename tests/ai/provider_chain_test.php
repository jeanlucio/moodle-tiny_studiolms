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
 * PHPUnit tests for tiny_studiolms\ai\provider_chain.
 *
 * @package    tiny_studiolms
 * @copyright  2026 Jean Lúcio
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace tiny_studiolms\ai;

use advanced_testcase;
use core_ai\aiactions\generate_text;
use core_ai\aiactions\responses\response_generate_text;
use core_ai\manager;
use tiny_studiolms\tests\hub_stub_trait;

defined('MOODLE_INTERNAL') || die();

global $CFG;
require_once($CFG->dirroot . '/lib/editor/tiny/plugins/studiolms/tests/fixtures/hub_stub_trait.php');

/**
 * Tests for the local_aihub then core_ai provider chain.
 *
 * A fresh test site has no hub key and no enabled core_ai provider, so "nothing available" is the
 * baseline; the hub path is exercised through a stubbed client and never reaches the network.
 *
 * @covers \tiny_studiolms\ai\provider_chain
 */
final class provider_chain_test extends advanced_testcase {
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
        \core\di::reset_container();
        parent::tearDown();
    }

    /**
     * Skips the test when the core_ai manager cannot be replaced by a mock.
     *
     * On Moodle 4.5 the manager's methods are static and are not resolved through the container, so
     * there is no instance to substitute; the core_ai fallback is exercised on 5.0 and later only.
     */
    private function require_replaceable_core_ai_manager(): void {
        if ((new \ReflectionMethod(manager::class, 'get_providers_for_actions'))->isStatic()) {
            $this->markTestSkipped('The core_ai manager is static on this Moodle version and cannot be stubbed.');
        }
    }

    /**
     * Replaces the core_ai manager with a mock that has one enabled text provider.
     *
     * @param bool $enabledincontext What the per-context "Enable AI tools" check answers.
     * @return \PHPUnit\Framework\MockObject\MockObject
     */
    private function install_core_ai_manager(bool $enabledincontext = true): \PHPUnit\Framework\MockObject\MockObject {
        $this->require_replaceable_core_ai_manager();

        $methods = ['get_providers_for_actions', 'process_action'];
        if (method_exists(manager::class, 'is_action_enabled_in_context')) {
            $methods[] = 'is_action_enabled_in_context';
        }
        $mock = $this->getMockBuilder(manager::class)
            ->disableOriginalConstructor()
            ->onlyMethods($methods)
            ->getMock();
        $mock->method('get_providers_for_actions')->willReturn([generate_text::class => [1]]);
        if (in_array('is_action_enabled_in_context', $methods, true)) {
            $mock->method('is_action_enabled_in_context')->willReturn($enabledincontext);
        }
        \core\di::set(manager::class, $mock);

        return $mock;
    }

    /**
     * Builds a core_ai text-generation response.
     *
     * @param bool $success Whether the provider call succeeded.
     * @param string|null $content Generated text, or null for none.
     * @return response_generate_text
     */
    private function core_ai_response(bool $success, ?string $content = null): response_generate_text {
        $response = new response_generate_text($success, $success ? 0 : 1, $success ? '' : 'error', 'detail');
        if ($content !== null) {
            $response->set_response_data(['generatedcontent' => $content]);
        }
        return $response;
    }

    /**
     * With no hub key and no core_ai provider there is no AI, and nothing is attempted.
     */
    public function test_nothing_available(): void {
        $context = \context_system::instance();

        $this->assertFalse(provider_chain::has_ai($context));

        $result = provider_chain::send('system', 'user', true, 'label', $context);
        $this->assertFalse($result['success']);
        $this->assertFalse($result['attempted']);
        $this->assertSame('', $result['data']);
    }

    /**
     * A hub success is returned as-is and logged under this plugin's component.
     */
    public function test_hub_success_is_returned_and_logged(): void {
        global $DB;

        $client = $this->install_hub_stub(true, '{"ok":true}');
        $context = \context_system::instance();

        $this->assertTrue(provider_chain::has_ai($context));

        $result = provider_chain::send('system text', 'user text', true, 'Chart', $context);

        $this->assertTrue($result['success']);
        $this->assertTrue($result['attempted']);
        $this->assertSame('{"ok":true}', $result['data']);
        $this->assertSame('Gemini', $result['provider']);
        $this->assertSame([['system text', 'user text', true]], $client->calls);

        $logs = $DB->get_records('local_aihub_log', ['component' => 'tiny_studiolms']);
        $this->assertCount(1, $logs);
        $this->assertSame('Chart', reset($logs)->description);
    }

    /**
     * A hub failure with no core_ai to fall back to keeps the hub's own failure detail.
     */
    public function test_hub_failure_without_core_ai_keeps_hub_message(): void {
        $this->install_hub_stub(false, '', 'Gemini: invalid key');

        $result = provider_chain::send('system', 'user', false, 'label', \context_system::instance());

        $this->assertFalse($result['success']);
        $this->assertTrue($result['attempted']);
        $this->assertSame('Gemini: invalid key', $result['message']);
    }

    /**
     * With no hub, core_ai answers: the system and user prompts are merged and the action targets the context.
     */
    public function test_core_ai_serves_the_request_when_there_is_no_hub(): void {
        $this->setAdminUser();
        $course = $this->getDataGenerator()->create_course();
        $context = \context_course::instance($course->id);
        $captured = null;
        $manager = $this->install_core_ai_manager();
        $manager->method('process_action')->willReturnCallback(
            function (generate_text $action) use (&$captured): response_generate_text {
                $captured = $action;
                return $this->core_ai_response(true, 'Generated by core');
            }
        );

        $this->assertTrue(provider_chain::has_ai($context));
        $result = provider_chain::send('System rules', 'User request', true, 'label', $context);

        $this->assertTrue($result['success']);
        $this->assertTrue($result['attempted']);
        $this->assertSame('Generated by core', $result['data']);
        $this->assertSame('Moodle AI', $result['provider']);
        $this->assertSame('', $result['message']);
        $this->assertSame("System rules\n\nUser request", $captured->get_configuration('prompttext'));
        $this->assertSame((int) $context->id, (int) $captured->get_configuration('contextid'));
        $this->assertSame((int) get_admin()->id, (int) $captured->get_configuration('userid'));
    }

    /**
     * A core_ai provider that reports failure surfaces as an attempted failure with a core_ai message.
     */
    public function test_core_ai_failure_is_reported(): void {
        $this->setAdminUser();
        $this->install_core_ai_manager()->method('process_action')->willReturn($this->core_ai_response(false));

        $result = provider_chain::send('system', 'user', false, 'label', \context_system::instance());

        $this->assertFalse($result['success']);
        $this->assertTrue($result['attempted']);
        $this->assertSame('Moodle AI', $result['provider']);
        $this->assertSame('core_ai: provider returned failure', $result['message']);
    }

    /**
     * A successful core_ai call that generated nothing is a failure, not an empty success.
     */
    public function test_core_ai_empty_response_is_a_failure(): void {
        $this->setAdminUser();
        $this->install_core_ai_manager()->method('process_action')->willReturn($this->core_ai_response(true, ''));

        $result = provider_chain::send('system', 'user', false, 'label', \context_system::instance());

        $this->assertFalse($result['success']);
        $this->assertSame('core_ai: empty response', $result['message']);
    }

    /**
     * An exception inside core_ai is contained and reported, never propagated to the caller.
     */
    public function test_core_ai_exception_is_contained(): void {
        $this->setAdminUser();
        $this->install_core_ai_manager()->method('process_action')
            ->willThrowException(new \RuntimeException('boom'));

        $result = provider_chain::send('system', 'user', false, 'label', \context_system::instance());

        $this->assertFalse($result['success']);
        $this->assertTrue($result['attempted']);
        $this->assertSame('core_ai: boom', $result['message']);
    }

    /**
     * A course where "Enable AI tools" is off hides the core_ai path: nothing is offered or attempted.
     */
    public function test_core_ai_disabled_in_context_is_not_used(): void {
        if (!method_exists(manager::class, 'is_action_enabled_in_context')) {
            $this->markTestSkipped('The per-context AI toggle does not exist on this Moodle version.');
        }
        $this->setAdminUser();
        $course = $this->getDataGenerator()->create_course();
        $context = \context_course::instance($course->id);
        $manager = $this->install_core_ai_manager(false);
        $manager->expects($this->never())->method('process_action');

        $this->assertFalse(provider_chain::has_ai($context));
        $result = provider_chain::send('system', 'user', false, 'label', $context);

        $this->assertFalse($result['success']);
        $this->assertFalse($result['attempted']);
    }

    /**
     * A manager that cannot even list its providers means "no AI", not a fatal error.
     */
    public function test_core_ai_manager_failure_means_no_ai(): void {
        $this->require_replaceable_core_ai_manager();

        $mock = $this->getMockBuilder(manager::class)
            ->disableOriginalConstructor()
            ->onlyMethods(['get_providers_for_actions'])
            ->getMock();
        $mock->method('get_providers_for_actions')->willThrowException(new \RuntimeException('no providers'));
        \core\di::set(manager::class, $mock);

        $this->assertFalse(provider_chain::has_ai(\context_system::instance()));
    }

    /**
     * When the hub fails, core_ai takes over and its answer is the one returned.
     */
    public function test_core_ai_takes_over_when_the_hub_fails(): void {
        $this->setAdminUser();
        $this->install_hub_stub(false, '', 'Gemini: quota exceeded');
        $this->install_core_ai_manager()->method('process_action')
            ->willReturn($this->core_ai_response(true, 'Rescued by core'));

        $result = provider_chain::send('system', 'user', false, 'label', \context_system::instance());

        $this->assertTrue($result['success']);
        $this->assertSame('Rescued by core', $result['data']);
        $this->assertSame('Moodle AI', $result['provider']);
    }

    /**
     * A hub that "succeeds" with no text is not final: core_ai still gets its turn.
     */
    public function test_core_ai_takes_over_when_the_hub_returns_nothing(): void {
        $this->setAdminUser();
        $this->install_hub_stub(true, '');
        $this->install_core_ai_manager()->method('process_action')
            ->willReturn($this->core_ai_response(true, 'Rescued by core'));

        $result = provider_chain::send('system', 'user', false, 'label', \context_system::instance());

        $this->assertTrue($result['success']);
        $this->assertSame('Rescued by core', $result['data']);
    }

    /**
     * When both sources fail, the hub's failure detail is kept: it names the real cause.
     */
    public function test_both_sources_failing_keeps_the_hub_failure(): void {
        $this->setAdminUser();
        $this->install_hub_stub(false, '', 'Gemini: quota exceeded');
        $this->install_core_ai_manager()->method('process_action')->willReturn($this->core_ai_response(false));

        $result = provider_chain::send('system', 'user', false, 'label', \context_system::instance());

        $this->assertFalse($result['success']);
        $this->assertTrue($result['attempted']);
        $this->assertSame('Gemini: quota exceeded', $result['message']);
    }
}
