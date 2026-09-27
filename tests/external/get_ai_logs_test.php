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
 * PHPUnit tests for tiny_studiolms\external\get_ai_logs.
 *
 * @package    tiny_studiolms
 * @copyright  2026 Jean Lúcio
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace tiny_studiolms\external;

use advanced_testcase;

/**
 * Tests for the get_ai_logs external function.
 *
 * @covers \tiny_studiolms\external\get_ai_logs
 */
final class get_ai_logs_test extends advanced_testcase {
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
     * Creates an AI generation log row for the given user.
     *
     * @param \stdClass $user
     * @param string $blocktype
     */
    private function create_log(\stdClass $user, string $blocktype = 'callout'): void {
        global $DB;

        $DB->insert_record('tiny_studiolms_ai_logs', (object) [
            'userid'      => $user->id,
            'blocktype'   => $blocktype,
            'ai_provider' => 'Gemini',
            'timecreated' => time(),
        ]);
    }

    /**
     * A guest (not logged in) user is rejected.
     */
    public function test_guest_cannot_call(): void {
        $this->setGuestUser();

        $this->expectException(\required_capability_exception::class);
        get_ai_logs::execute(\context_system::instance()->id);
    }

    /**
     * A logged-in user without the :use capability is rejected.
     */
    public function test_user_without_capability_is_rejected(): void {
        $user = $this->getDataGenerator()->create_user();
        $this->setUser($user);

        $this->expectException(\required_capability_exception::class);
        get_ai_logs::execute(\context_system::instance()->id);
    }

    /**
     * Only the current user's own log rows are returned, not other users'.
     */
    public function test_returns_only_own_logs(): void {
        $otheruser = $this->getDataGenerator()->create_user();
        $this->create_log($this->teacher, 'callout');
        $this->create_log($otheruser, 'mindmap');

        $this->setUser($this->teacher);
        $logs = get_ai_logs::execute(\context_system::instance()->id);

        $this->assertCount(1, $logs);
        $this->assertSame('callout', $logs[0]['blocktype']);
        $this->assertSame('Gemini', $logs[0]['ai_provider']);
    }

    /**
     * An empty log history returns an empty array, not an error.
     */
    public function test_returns_empty_array_when_no_logs(): void {
        $this->setUser($this->teacher);

        $logs = get_ai_logs::execute(\context_system::instance()->id);

        $this->assertSame([], $logs);
    }
}
