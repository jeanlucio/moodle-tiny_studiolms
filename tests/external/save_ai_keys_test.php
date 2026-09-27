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
 * PHPUnit tests for tiny_studiolms\external\save_ai_keys.
 *
 * @package    tiny_studiolms
 * @copyright  2026 Jean Lúcio
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace tiny_studiolms\external;

use advanced_testcase;

/**
 * Tests for the save_ai_keys external function.
 *
 * @covers \tiny_studiolms\external\save_ai_keys
 */
final class save_ai_keys_test extends advanced_testcase {
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
        save_ai_keys::execute(\context_system::instance()->id, 'k', '', '', '', '');
    }

    /**
     * A logged-in user without the :use capability is rejected.
     */
    public function test_user_without_capability_is_rejected(): void {
        $user = $this->getDataGenerator()->create_user();
        $this->setUser($user);

        $this->expectException(\required_capability_exception::class);
        save_ai_keys::execute(\context_system::instance()->id, 'k', '', '', '', '');
    }

    /**
     * Non-empty values are persisted as user preferences.
     */
    public function test_saves_key_values_as_user_preferences(): void {
        $this->setUser($this->teacher);

        $result = save_ai_keys::execute(
            \context_system::instance()->id,
            'gemini-secret',
            'groq-secret',
            '',
            '',
            ''
        );

        $this->assertTrue($result['success']);
        $this->assertSame('gemini-secret', get_user_preferences('tiny_studiolms_gemini_key', '', $this->teacher));
        $this->assertSame('groq-secret', get_user_preferences('tiny_studiolms_groq_key', '', $this->teacher));
    }

    /**
     * An empty string clears an already-saved preference instead of storing it literally.
     */
    public function test_empty_value_clears_existing_preference(): void {
        $this->setUser($this->teacher);
        // Primed via the implicit current-user form (no explicit $user object), matching how
        // save_ai_keys itself always reads/writes preferences — passing $this->teacher here
        // instead would populate a preference cache on that specific object instance that a
        // later unset_user_preference() on the global $USER (a separate instance) never touches.
        set_user_preference('tiny_studiolms_gemini_key', 'old-value');

        save_ai_keys::execute(\context_system::instance()->id, '', '', '', '', '');

        $this->assertSame('', get_user_preferences('tiny_studiolms_gemini_key', ''));
    }

    /**
     * A safe HTTPS public custom URL is accepted and saved.
     *
     * Uses a literal public IP rather than a hostname: is_safe_url() calls gethostbyname(),
     * so a hostname-based assertion would depend on real DNS resolution being available in
     * whatever environment runs this suite.
     */
    public function test_safe_https_custom_url_is_saved(): void {
        $this->setUser($this->teacher);

        $result = save_ai_keys::execute(
            \context_system::instance()->id,
            '',
            '',
            'custom-secret',
            'https://8.8.8.8/v1/chat/completions',
            'llama-3'
        );

        $this->assertTrue($result['success']);
        $this->assertSame(
            'https://8.8.8.8/v1/chat/completions',
            get_user_preferences('tiny_studiolms_custom_url', '', $this->teacher)
        );
    }

    /**
     * A plain HTTP (non-HTTPS) custom URL is rejected before anything is saved.
     */
    public function test_non_https_custom_url_is_rejected(): void {
        $this->setUser($this->teacher);

        try {
            save_ai_keys::execute(
                \context_system::instance()->id,
                '',
                '',
                'custom-secret',
                'http://api.example.com/v1/chat/completions',
                ''
            );
            $this->fail('Expected a moodle_exception for a non-HTTPS custom URL.');
        } catch (\moodle_exception $e) {
            $this->assertSame('', get_user_preferences('tiny_studiolms_custom_key', '', $this->teacher));
        }
    }

    /**
     * A loopback custom URL is rejected (SSRF guard).
     */
    public function test_loopback_custom_url_is_rejected(): void {
        $this->setUser($this->teacher);

        $this->expectException(\moodle_exception::class);
        save_ai_keys::execute(
            \context_system::instance()->id,
            '',
            '',
            'custom-secret',
            'https://127.0.0.1/v1/chat/completions',
            ''
        );
    }
}
