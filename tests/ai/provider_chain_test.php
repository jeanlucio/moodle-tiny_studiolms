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
        parent::tearDown();
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

        $result = provider_chain::send('system text', 'user text', true, 'Mind map', $context);

        $this->assertTrue($result['success']);
        $this->assertTrue($result['attempted']);
        $this->assertSame('{"ok":true}', $result['data']);
        $this->assertSame('Gemini', $result['provider']);
        $this->assertSame([['system text', 'user text', true]], $client->calls);

        $logs = $DB->get_records('local_aihub_log', ['component' => 'tiny_studiolms']);
        $this->assertCount(1, $logs);
        $this->assertSame('Mind map', reset($logs)->description);
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
}
