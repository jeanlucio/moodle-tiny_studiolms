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
 * PHPUnit tests for tiny_studiolms\privacy\provider.
 *
 * @package    tiny_studiolms
 * @copyright  2026 Jean Lúcio
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace tiny_studiolms\tests\privacy;

use core_privacy\local\request\approved_contextlist;
use core_privacy\local\request\approved_userlist;
use core_privacy\local\request\userlist;
use core_privacy\tests\provider_testcase;
use tiny_studiolms\privacy\provider;

/**
 * Tests for the Privacy API provider.
 *
 * @covers \tiny_studiolms\privacy\provider
 */
final class provider_test extends provider_testcase {
    /** @var \stdClass First user fixture. */
    private \stdClass $user1;

    /** @var \stdClass Second user fixture. */
    private \stdClass $user2;

    protected function setUp(): void {
        parent::setUp();
        $this->resetAfterTest();

        $this->user1 = $this->getDataGenerator()->create_user();
        $this->user2 = $this->getDataGenerator()->create_user();
    }

    /**
     * Creates a template record owned by the given user.
     *
     * @param \stdClass $user
     * @param string $name
     * @param int $isglobal
     * @return int New record ID.
     */
    private function create_template(\stdClass $user, string $name = 'T', int $isglobal = 0): int {
        global $DB;

        $now = time();
        return $DB->insert_record('tiny_studiolms_templates', (object) [
            'name'         => $name,
            'content'      => '<p>x</p>',
            'userid'       => $user->id,
            'usermodified' => $user->id,
            'isglobal'     => $isglobal,
            'timecreated'  => $now,
            'timemodified' => $now,
        ]);
    }

    /**
     * Creates a favourite relationship.
     *
     * @param \stdClass $user
     * @param int $templateid
     */
    private function create_favourite(\stdClass $user, int $templateid): void {
        global $DB;

        $DB->insert_record('tiny_studiolms_favourites', (object) [
            'userid'      => $user->id,
            'templateid'  => $templateid,
            'timecreated' => time(),
        ]);
    }

    /**
     * get_contexts_for_userid returns the system context when the user has templates.
     */
    public function test_get_contexts_for_userid_with_templates(): void {
        $this->create_template($this->user1);

        $contextlist = provider::get_contexts_for_userid($this->user1->id);

        $contextids = array_map('intval', $contextlist->get_contextids());
        $this->assertNotEmpty($contextids);
        $this->assertContains((int)\context_system::instance()->id, $contextids);
    }

    /**
     * get_contexts_for_userid returns the system context when the user has favourites.
     */
    public function test_get_contexts_for_userid_with_favourites(): void {
        $templateid = $this->create_template($this->user2);
        $this->create_favourite($this->user1, $templateid);

        $contextlist = provider::get_contexts_for_userid($this->user1->id);

        $this->assertNotEmpty($contextlist->get_contextids());
    }

    /**
     * get_contexts_for_userid returns empty for a user with no data.
     */
    public function test_get_contexts_for_userid_empty_when_no_data(): void {
        $contextlist = provider::get_contexts_for_userid($this->user1->id);

        $this->assertCount(0, $contextlist->get_contextids());
    }

    /**
     * export_user_data exports templates owned by the user.
     */
    public function test_export_user_data_includes_templates(): void {
        $this->create_template($this->user1, 'Layout A');

        $contextlist = provider::get_contexts_for_userid($this->user1->id);
        $approvedlist = new approved_contextlist($this->user1, 'tiny_studiolms', $contextlist->get_contextids());

        provider::export_user_data($approvedlist);

        $writer = \core_privacy\local\request\writer::with_context(\context_system::instance());
        $data = $writer->get_data([get_string('pluginname', 'tiny_studiolms'), get_string('tab_mine', 'tiny_studiolms')]);

        $this->assertNotEmpty($data->templates);
        $this->assertEquals('Layout A', reset($data->templates)->name);
    }

    /**
     * delete_data_for_user removes the user's templates and favourites.
     */
    public function test_delete_data_for_user_removes_personal_data(): void {
        global $DB;

        $templateid = $this->create_template($this->user1);
        $this->create_favourite($this->user1, $this->create_template($this->user2));

        $contextlist = provider::get_contexts_for_userid($this->user1->id);
        $approvedlist = new approved_contextlist($this->user1, 'tiny_studiolms', $contextlist->get_contextids());

        provider::delete_data_for_user($approvedlist);

        $this->assertFalse($DB->record_exists('tiny_studiolms_templates', ['userid' => $this->user1->id]));
        $this->assertFalse($DB->record_exists('tiny_studiolms_favourites', ['userid' => $this->user1->id]));
    }

    /**
     * delete_data_for_user preserves global templates even when owned by the deleted user.
     */
    public function test_delete_data_for_user_preserves_global_templates(): void {
        global $DB;

        $this->create_template($this->user1, 'Personal', 0);
        $this->create_template($this->user1, 'Global', 1);

        $contextlist = provider::get_contexts_for_userid($this->user1->id);
        $approvedlist = new approved_contextlist($this->user1, 'tiny_studiolms', $contextlist->get_contextids());

        provider::delete_data_for_user($approvedlist);

        $this->assertTrue($DB->record_exists('tiny_studiolms_templates', ['name' => 'Global', 'isglobal' => 1]));
    }

    /**
     * delete_data_for_all_users_in_context removes all personal templates and favourites.
     */
    public function test_delete_data_for_all_users_in_context(): void {
        global $DB;

        $this->create_template($this->user1);
        $this->create_template($this->user2);
        $this->create_favourite($this->user1, $this->create_template($this->user2, 'T2'));

        provider::delete_data_for_all_users_in_context(\context_system::instance());

        $this->assertEquals(0, $DB->count_records('tiny_studiolms_templates', ['isglobal' => 0]));
        $this->assertEquals(0, $DB->count_records('tiny_studiolms_favourites'));
    }

    /**
     * get_users_in_context lists all users who have templates or favourites.
     */
    public function test_get_users_in_context(): void {
        $templateid = $this->create_template($this->user1);
        $this->create_favourite($this->user2, $templateid);

        $context = \context_system::instance();
        $userlist = new userlist($context, 'tiny_studiolms');
        provider::get_users_in_context($userlist);

        $userids = array_map('intval', $userlist->get_userids());
        $this->assertContains((int) $this->user1->id, $userids);
        $this->assertContains((int) $this->user2->id, $userids);
    }

    /**
     * delete_data_for_users removes data only for the specified users.
     */
    public function test_delete_data_for_users(): void {
        global $DB;

        $this->create_template($this->user1, 'U1 Layout');
        $this->create_template($this->user2, 'U2 Layout');

        $context = \context_system::instance();
        $approveduserlist = new approved_userlist($context, 'tiny_studiolms', [$this->user1->id]);

        provider::delete_data_for_users($approveduserlist);

        $this->assertFalse($DB->record_exists('tiny_studiolms_templates', ['userid' => $this->user1->id]));
        $this->assertTrue($DB->record_exists('tiny_studiolms_templates', ['userid' => $this->user2->id]));
    }
}
