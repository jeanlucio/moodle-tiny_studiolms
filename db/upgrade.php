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
 * Upgrade script for the StudioLMS Tiny editor plugin.
 *
 * @package    tiny_studiolms
 * @copyright  2026 Jean Lúcio
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

/**
 * Execute upgrade steps for the plugin.
 *
 * @param int $oldversion The old version of the plugin.
 * @return bool Always returns true.
 */
function xmldb_tiny_studiolms_upgrade(int $oldversion): bool {
    global $DB;

    $dbman = $DB->get_manager();

    if ($oldversion < 2026092700) {
        // AI now runs only through local_aihub and core_ai, so the plugin's own keys and AI log are gone.
        // Personal keys lived in the core {user_preferences} table, which core never cleans for a plugin.
        $DB->delete_records_select(
            'user_preferences',
            $DB->sql_like('name', ':prefix'),
            ['prefix' => 'tiny_studiolms_%']
        );

        foreach (['apikey_gemini', 'apikey_groq', 'apikey_custom', 'custom_baseurl', 'custom_model'] as $setting) {
            unset_config($setting, 'tiny_studiolms');
        }

        $table = new xmldb_table('tiny_studiolms_ai_logs');
        if ($dbman->table_exists($table)) {
            $dbman->drop_table($table);
        }

        upgrade_plugin_savepoint(true, 2026092700, 'tiny', 'studiolms');
    }

    return true;
}
