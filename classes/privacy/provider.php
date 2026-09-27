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
 * Privacy API implementation for tiny_studiolms.
 *
 * @package    tiny_studiolms
 * @copyright  2026 Jean Lúcio
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace tiny_studiolms\privacy;

use core_privacy\local\metadata\collection;
use core_privacy\local\request\approved_contextlist;
use core_privacy\local\request\approved_userlist;
use core_privacy\local\request\contextlist;
use core_privacy\local\request\core_userlist_provider;
use core_privacy\local\request\userlist;
use core_privacy\local\request\writer;

/**
 * Privacy provider for tiny_studiolms.
 *
 * This plugin stores layout templates created by users and their favourite relationships.
 *
 * AI requests go only through local_aihub (when installed) and Moodle core_ai. Both declare the
 * external providers and keep their own usage records, so this plugin sends no personal data to an
 * external location itself and stores no AI key or AI log.
 */
class provider implements
    \core_privacy\local\metadata\provider,
    \core_privacy\local\request\plugin\provider,
    core_userlist_provider {
    /**
     * Returns metadata about data stored by this plugin.
     *
     * @param collection $collection
     * @return collection
     */
    public static function get_metadata(collection $collection): collection {
        $collection->add_database_table(
            'tiny_studiolms_templates',
            [
                'userid'       => 'privacy:metadata:tiny_studiolms_templates:userid',
                'name'         => 'privacy:metadata:tiny_studiolms_templates:name',
                'content'      => 'privacy:metadata:tiny_studiolms_templates:content',
                'timecreated'  => 'privacy:metadata:tiny_studiolms_templates:timecreated',
                'usermodified' => 'privacy:metadata:tiny_studiolms_templates:usermodified',
            ],
            'privacy:metadata:tiny_studiolms_templates'
        );

        $collection->add_database_table(
            'tiny_studiolms_favourites',
            [
                'userid'      => 'privacy:metadata:tiny_studiolms_favourites:userid',
                'templateid'  => 'privacy:metadata:tiny_studiolms_favourites:templateid',
                'timecreated' => 'privacy:metadata:tiny_studiolms_favourites:timecreated',
            ],
            'privacy:metadata:tiny_studiolms_favourites'
        );

        return $collection;
    }

    /**
     * Returns the contexts that contain user data for the specified user.
     *
     * @param int $userid
     * @return contextlist
     */
    public static function get_contexts_for_userid(int $userid): contextlist {
        $contextlist = new contextlist();

        $sql = "SELECT ctx.id
                  FROM {context} ctx
                 WHERE ctx.contextlevel = :ctxlevel
                   AND (
                       EXISTS (
                           SELECT 1
                             FROM {tiny_studiolms_templates} t
                            WHERE t.userid = :tuserid
                       )
                       OR
                       EXISTS (
                           SELECT 1
                             FROM {tiny_studiolms_favourites} f
                            WHERE f.userid = :fuserid
                       )
                   )";

        $contextlist->add_from_sql($sql, [
            'ctxlevel' => CONTEXT_SYSTEM,
            'tuserid'  => $userid,
            'fuserid'  => $userid,
        ]);

        return $contextlist;
    }

    /**
     * Exports all data for the specified user in the given contexts.
     *
     * @param approved_contextlist $contextlist
     */
    public static function export_user_data(approved_contextlist $contextlist): void {
        global $DB;

        $userid = $contextlist->get_user()->id;

        $context = \context_system::instance();

        $templates = $DB->get_records('tiny_studiolms_templates', ['userid' => $userid]);
        if (!empty($templates)) {
            writer::with_context($context)->export_data(
                [get_string('pluginname', 'tiny_studiolms'), get_string('tab_mine', 'tiny_studiolms')],
                (object) ['templates' => array_values($templates)]
            );
        }

        $favourites = $DB->get_records('tiny_studiolms_favourites', ['userid' => $userid]);
        if (!empty($favourites)) {
            writer::with_context($context)->export_data(
                [get_string('pluginname', 'tiny_studiolms'), get_string('tab_favourites', 'tiny_studiolms')],
                (object) ['favourites' => array_values($favourites)]
            );
        }
    }

    /**
     * Deletes all data for all users in the given context.
     *
     * @param \context $context
     */
    public static function delete_data_for_all_users_in_context(\context $context): void {
        if (!$context instanceof \context_system) {
            return;
        }

        global $DB;
        $DB->delete_records('tiny_studiolms_favourites');
        $DB->delete_records_select(
            'tiny_studiolms_templates',
            'isglobal = 0'
        );
        $DB->set_field_select('tiny_studiolms_templates', 'userid', 0, 'isglobal = 1');
        $DB->set_field_select('tiny_studiolms_templates', 'usermodified', 0, 'isglobal = 1');
    }

    /**
     * Removes the given users' authorship from global templates without deleting them.
     *
     * A global template is institutional content other users rely on, so it survives a data
     * deletion request — but who created or last modified it is still personal data, so both
     * columns are cleared for the deleted users.
     *
     * @param string $insql IN/equal SQL fragment for the user IDs, from get_in_or_equal().
     * @param array $inparams Parameters for $insql.
     */
    private static function anonymise_global_templates(string $insql, array $inparams): void {
        global $DB;

        $DB->set_field_select('tiny_studiolms_templates', 'userid', 0, "isglobal = 1 AND userid {$insql}", $inparams);
        $DB->set_field_select(
            'tiny_studiolms_templates',
            'usermodified',
            0,
            "isglobal = 1 AND usermodified {$insql}",
            $inparams
        );
    }

    /**
     * Deletes all data for the specified user.
     *
     * @param approved_contextlist $contextlist
     */
    public static function delete_data_for_user(approved_contextlist $contextlist): void {
        global $DB;

        $userid = $contextlist->get_user()->id;

        $DB->delete_records('tiny_studiolms_favourites', ['userid' => $userid]);

        $templateids = $DB->get_fieldset_select(
            'tiny_studiolms_templates',
            'id',
            'userid = :userid AND isglobal = 0',
            ['userid' => $userid]
        );

        if (!empty($templateids)) {
            [$insql, $inparams] = $DB->get_in_or_equal($templateids, SQL_PARAMS_NAMED);
            $DB->delete_records_select('tiny_studiolms_favourites', "templateid {$insql}", $inparams);
            $DB->delete_records_select('tiny_studiolms_templates', "id {$insql}", $inparams);
        }

        [$usersql, $userparams] = $DB->get_in_or_equal([$userid], SQL_PARAMS_NAMED);
        self::anonymise_global_templates($usersql, $userparams);
    }

    /**
     * Returns users who have data in the given context.
     *
     * @param userlist $userlist
     */
    public static function get_users_in_context(userlist $userlist): void {
        $context = $userlist->get_context();

        if (!$context instanceof \context_system) {
            return;
        }

        $userlist->add_from_sql('userid', "SELECT userid FROM {tiny_studiolms_templates}", []);
        $userlist->add_from_sql('userid', "SELECT userid FROM {tiny_studiolms_favourites}", []);
    }

    /**
     * Deletes data for multiple users in the given context.
     *
     * @param approved_userlist $userlist
     */
    public static function delete_data_for_users(approved_userlist $userlist): void {
        global $DB;

        $context = $userlist->get_context();

        if (!$context instanceof \context_system) {
            return;
        }

        $userids = $userlist->get_userids();

        if (empty($userids)) {
            return;
        }

        [$insql, $inparams] = $DB->get_in_or_equal($userids, SQL_PARAMS_NAMED);

        $DB->delete_records_select('tiny_studiolms_favourites', "userid {$insql}", $inparams);

        $templateids = $DB->get_fieldset_select(
            'tiny_studiolms_templates',
            'id',
            "userid {$insql} AND isglobal = 0",
            $inparams
        );

        if (!empty($templateids)) {
            [$tplsql, $tplparams] = $DB->get_in_or_equal($templateids, SQL_PARAMS_NAMED);
            $DB->delete_records_select('tiny_studiolms_favourites', "templateid {$tplsql}", $tplparams);
            $DB->delete_records_select('tiny_studiolms_templates', "id {$tplsql}", $tplparams);
        }

        self::anonymise_global_templates($insql, $inparams);
    }
}
