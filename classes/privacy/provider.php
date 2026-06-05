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
use core_privacy\local\request\helper;
use core_privacy\local\request\userlist;
use core_privacy\local\request\writer;

/**
 * Privacy provider for tiny_studiolms.
 *
 * This plugin stores layout templates created by users and their favourite relationships.
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
            ],
            'privacy:metadata:tiny_studiolms_templates'
        );

        $collection->add_external_location_link(
            'tiny_studiolms_ai',
            ['prompt' => 'privacy:metadata:tiny_studiolms_ai'],
            'privacy:metadata:tiny_studiolms_ai'
        );

        $collection->add_database_table(
            'tiny_studiolms_ai_logs',
            [
                'userid'      => 'privacy:metadata:tiny_studiolms_ai_logs:userid',
                'blocktype'   => 'privacy:metadata:tiny_studiolms_ai_logs:blocktype',
                'ai_provider' => 'privacy:metadata:tiny_studiolms_ai_logs:ai_provider',
                'timecreated' => 'privacy:metadata:tiny_studiolms_ai_logs:timecreated',
            ],
            'privacy:metadata:tiny_studiolms_ai_logs'
        );

        $collection->add_user_preference(
            'tiny_studiolms_gemini_key',
            'privacy:metadata:tiny_studiolms_userprefs:gemini_key'
        );
        $collection->add_user_preference(
            'tiny_studiolms_groq_key',
            'privacy:metadata:tiny_studiolms_userprefs:groq_key'
        );
        $collection->add_user_preference(
            'tiny_studiolms_custom_key',
            'privacy:metadata:tiny_studiolms_userprefs:custom_key'
        );
        $collection->add_user_preference(
            'tiny_studiolms_custom_url',
            'privacy:metadata:tiny_studiolms_userprefs:custom_url'
        );
        $collection->add_user_preference(
            'tiny_studiolms_custom_model',
            'privacy:metadata:tiny_studiolms_userprefs:custom_model'
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

        $ailogs = $DB->get_records('tiny_studiolms_ai_logs', ['userid' => $userid]);
        if (!empty($ailogs)) {
            writer::with_context($context)->export_data(
                [get_string('pluginname', 'tiny_studiolms'), get_string('privacy:ailogs', 'tiny_studiolms')],
                (object) ['ailogs' => array_values($ailogs)]
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
        $DB->delete_records('tiny_studiolms_ai_logs');
        $DB->delete_records('tiny_studiolms_favourites');
        $DB->delete_records_select(
            'tiny_studiolms_templates',
            'isglobal = 0'
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

        $DB->delete_records('tiny_studiolms_ai_logs', ['userid' => $userid]);
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
        $userlist->add_from_sql('userid', "SELECT userid FROM {tiny_studiolms_ai_logs}", []);
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

        $DB->delete_records_select('tiny_studiolms_ai_logs', "userid {$insql}", $inparams);
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
    }
}
