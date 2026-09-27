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
 * Shared PHPUnit coverage for the tiny_studiolms AI content-generation endpoints.
 *
 * @package    tiny_studiolms
 * @copyright  2026 Jean Lúcio
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace tiny_studiolms\external;

use advanced_testcase;

/**
 * Shared access-control and fail-safe coverage for tiny_studiolms\external\generate_* classes.
 *
 * Every generate_* external function follows the same contract: validate the given
 * context, require tiny/studiolms:use, delegate to tiny_studiolms\ai\generator, and
 * rethrow any \moodle_exception unchanged (never a raw \Throwable). These three tests
 * exercise that shared contract without depending on a live AI provider. Each concrete
 * subclass only has to say how to call its own execute() with a minimal valid payload.
 */
abstract class generate_endpoint_testcase extends advanced_testcase {
    /** @var \stdClass Teacher user fixture holding the tiny/studiolms:use capability. */
    protected \stdClass $teacher;

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
     * Calls the external function under test with a minimal valid payload.
     *
     * @param int $contextid Context ID to pass through to the endpoint's execute().
     */
    abstract protected function call_execute(int $contextid): void;

    /**
     * A guest (not logged in) user is rejected before any AI call.
     */
    public function test_guest_cannot_call(): void {
        $this->setGuestUser();

        $this->expectException(\required_capability_exception::class);
        $this->call_execute(\context_system::instance()->id);
    }

    /**
     * A logged-in user without the :use capability is rejected.
     */
    public function test_user_without_capability_is_rejected(): void {
        $user = $this->getDataGenerator()->create_user();
        $this->setUser($user);

        $this->expectException(\required_capability_exception::class);
        $this->call_execute(\context_system::instance()->id);
    }

    /**
     * When no AI provider is configured, execute() throws a moodle_exception.
     *
     * Verifies the fail-safe path: the function never returns a 200 with empty data
     * when every provider is unconfigured, and never leaks a raw \Throwable to the caller.
     */
    public function test_no_provider_throws_moodle_exception(): void {
        $this->setUser($this->teacher);

        unset_user_preference('tiny_studiolms_gemini_key', $this->teacher);
        unset_user_preference('tiny_studiolms_groq_key', $this->teacher);
        unset_user_preference('tiny_studiolms_custom_key', $this->teacher);
        set_config('apikey_gemini', '', 'tiny_studiolms');
        set_config('apikey_groq', '', 'tiny_studiolms');
        set_config('apikey_custom', '', 'tiny_studiolms');

        $this->expectException(\moodle_exception::class);
        $this->call_execute(\context_system::instance()->id);
    }
}
