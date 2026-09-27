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
 * PHPUnit tests for tiny_studiolms\external\get_ai_keys.
 *
 * @package    tiny_studiolms
 * @copyright  2026 Jean Lúcio
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace tiny_studiolms\external;

use advanced_testcase;

/**
 * Tests for the get_ai_keys external function.
 *
 * @covers \tiny_studiolms\external\get_ai_keys
 */
final class get_ai_keys_test extends advanced_testcase {
    /** @var \stdClass Teacher user fixture. */
    private \stdClass $teacher;

    #[\Override]
    protected function setUp(): void {
        parent::setUp();
        $this->resetAfterTest();

        $this->teacher = $this->getDataGenerator()->create_user();

        $context = \context_system::instance();
        $role = $this->getDataGenerator()->create_role();
        assign_capability('tiny/studiolms:use', CAP_ALLOW, $role, $context->id);
        role_assign($role, $this->teacher->id, $context->id);
    }

    /**
     * A guest (not logged in) user is rejected.
     */
    public function test_guest_cannot_call(): void {
        $this->setGuestUser();

        $this->expectException(\required_capability_exception::class);
        get_ai_keys::execute(\context_system::instance()->id);
    }

    /**
     * A logged-in user without the :use capability is rejected.
     */
    public function test_user_without_capability_is_rejected(): void {
        $user = $this->getDataGenerator()->create_user();
        $this->setUser($user);

        $this->expectException(\required_capability_exception::class);
        get_ai_keys::execute(\context_system::instance()->id);
    }

    /**
     * When no personal keys are set, every presence flag is false and values are empty.
     */
    public function test_returns_false_when_no_keys_set(): void {
        $this->setUser($this->teacher);
        unset_user_preference('tiny_studiolms_gemini_key', $this->teacher);
        unset_user_preference('tiny_studiolms_groq_key', $this->teacher);
        unset_user_preference('tiny_studiolms_custom_key', $this->teacher);

        $result = get_ai_keys::execute(\context_system::instance()->id);

        $this->assertFalse($result['has_gemini']);
        $this->assertFalse($result['has_groq']);
        $this->assertFalse($result['has_custom_key']);
        $this->assertSame('', $result['gemini_key']);
    }

    /**
     * Personal key values and presence flags are returned once set.
     */
    public function test_returns_saved_key_values(): void {
        $this->setUser($this->teacher);
        set_user_preference('tiny_studiolms_gemini_key', 'my-secret-key', $this->teacher);
        set_user_preference('tiny_studiolms_custom_url', 'https://example.com/v1/chat/completions', $this->teacher);
        set_user_preference('tiny_studiolms_custom_model', 'llama-3', $this->teacher);

        $result = get_ai_keys::execute(\context_system::instance()->id);

        $this->assertTrue($result['has_gemini']);
        $this->assertSame('my-secret-key', $result['gemini_key']);
        $this->assertFalse($result['has_groq']);
        $this->assertSame('https://example.com/v1/chat/completions', $result['custom_url']);
        $this->assertSame('llama-3', $result['custom_model']);
    }
}
