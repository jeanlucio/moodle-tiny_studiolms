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
 * PHPUnit tests for the tiny_studiolms upgrade steps.
 *
 * @package    tiny_studiolms
 * @copyright  2026 Jean Lúcio
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace tiny_studiolms;

use advanced_testcase;
use xmldb_table;

/**
 * Runs the real upgrade function against the pre-upgrade shape of a site.
 *
 * The test database is built from install.xml, which no longer has the AI log table or any trace of
 * the plugin's own AI keys, so the legacy state is recreated here before each step runs.
 *
 * @covers ::xmldb_tiny_studiolms_upgrade
 */
final class db_upgrade_test extends advanced_testcase {
    #[\Override]
    protected function setUp(): void {
        global $CFG;

        parent::setUp();
        $this->resetAfterTest();

        // The savepoint helper lives in upgradelib.php, which only the real upgrade runner loads.
        require_once($CFG->libdir . '/upgradelib.php');
        require_once($CFG->dirroot . '/lib/editor/tiny/plugins/studiolms/db/upgrade.php');
    }

    /**
     * Recreates the AI log table as a site on 2026062200 still holds it.
     */
    private function create_legacy_ai_logs_table(): void {
        global $DB;

        $table = new xmldb_table('tiny_studiolms_ai_logs');
        $table->add_field('id', XMLDB_TYPE_INTEGER, '10', null, XMLDB_NOTNULL, XMLDB_SEQUENCE);
        $table->add_field('userid', XMLDB_TYPE_INTEGER, '10', null, XMLDB_NOTNULL);
        $table->add_field('blocktype', XMLDB_TYPE_CHAR, '50', null, XMLDB_NOTNULL);
        $table->add_field('ai_provider', XMLDB_TYPE_CHAR, '50', null, XMLDB_NOTNULL);
        $table->add_field('timecreated', XMLDB_TYPE_INTEGER, '10', null, XMLDB_NOTNULL, null, '0');
        $table->add_key('primary', XMLDB_KEY_PRIMARY, ['id']);

        $dbman = $DB->get_manager();
        if (!$dbman->table_exists($table)) {
            $dbman->create_table($table);
        }
    }

    /**
     * The 2026092700 step removes the plugin's own keys, settings and AI log, and nothing else.
     */
    public function test_upgrade_removes_own_ai_keys_and_log(): void {
        global $DB;

        $user = $this->getDataGenerator()->create_user();
        set_user_preference('tiny_studiolms_gemini_key', 'personal-key', $user);
        set_user_preference('tiny_studiolms_custom_url', 'https://example.com/v1', $user);
        set_user_preference('othercomponent_setting', 'keep', $user);
        foreach (['apikey_gemini', 'apikey_groq', 'apikey_custom', 'custom_baseurl', 'custom_model'] as $setting) {
            set_config($setting, 'value', 'tiny_studiolms');
        }
        $this->create_legacy_ai_logs_table();

        set_config('version', 2026062200, 'tiny_studiolms');
        $this->assertTrue(xmldb_tiny_studiolms_upgrade(2026062200));

        $ownprefs = $DB->count_records_select('user_preferences', $DB->sql_like('name', ':p'), ['p' => 'tiny_studiolms_%']);
        $this->assertSame(0, $ownprefs);
        $this->assertTrue($DB->record_exists('user_preferences', ['name' => 'othercomponent_setting']));
        foreach (['apikey_gemini', 'apikey_groq', 'apikey_custom', 'custom_baseurl', 'custom_model'] as $setting) {
            $this->assertFalse(get_config('tiny_studiolms', $setting));
        }
        $this->assertFalse($DB->get_manager()->table_exists('tiny_studiolms_ai_logs'));
        $this->assertEquals(2026092700, get_config('tiny_studiolms', 'version'));
    }

    /**
     * The step also runs cleanly on a site that never had the AI log table.
     */
    public function test_upgrade_tolerates_missing_ai_logs_table(): void {
        set_config('version', 2026062200, 'tiny_studiolms');

        $this->assertTrue(xmldb_tiny_studiolms_upgrade(2026062200));
        $this->assertEquals(2026092700, get_config('tiny_studiolms', 'version'));
    }
}
