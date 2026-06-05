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
 * External function: send a chat message to the AI assistant.
 *
 * @package    tiny_studiolms
 * @copyright  2026 Jean Lúcio
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace tiny_studiolms\external;

use core_external\external_api;
use core_external\external_function_parameters;
use core_external\external_multiple_structure;
use core_external\external_single_structure;
use core_external\external_value;
use context_system;
use tiny_studiolms\ai\chat;
use stdClass;

/**
 * Processes a multi-turn AI chat message and returns a reply with an optional action.
 *
 * @package    tiny_studiolms
 * @copyright  2026 Jean Lúcio
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class chat_message extends external_api {
    /** @var int Maximum conversation history entries accepted per request. */
    public const MAX_HISTORY = 30;

    /**
     * Filters a raw history array to only include valid roles (user, assistant).
     *
     * @param array $history Raw history entries [{role, content}, ...].
     * @return array History with only user and assistant entries, re-indexed.
     */
    public static function filter_history(array $history): array {
        $allowed = ['user', 'assistant'];
        return array_values(
            array_filter($history, fn($m) => in_array($m['role'] ?? '', $allowed, true))
        );
    }

    /**
     * Declares the parameters accepted by execute().
     *
     * @return external_function_parameters
     */
    public static function execute_parameters(): external_function_parameters {
        return new external_function_parameters([
            'history' => new external_multiple_structure(
                new external_single_structure([
                    'role'    => new external_value(PARAM_ALPHA, 'Message role: user or assistant'),
                    'content' => new external_value(PARAM_RAW, 'Message content'),
                ]),
                'Conversation history'
            ),
            'presetscontext' => new external_value(
                PARAM_RAW,
                'JSON-encoded array of available preset names',
                VALUE_DEFAULT,
                ''
            ),
        ]);
    }

    /**
     * Sends the conversation to the AI and returns a reply with an optional action.
     *
     * @param array  $history        Conversation history [{role, content}, ...].
     * @param string $presetscontext JSON-encoded preset names for the system prompt.
     * @return array With keys 'reply', 'action' (optional), 'provider'.
     */
    public static function execute(array $history, string $presetscontext): array {
        global $DB, $USER;

        $params = self::validate_parameters(self::execute_parameters(), [
            'history'        => $history,
            'presetscontext' => $presetscontext,
        ]);

        $context = context_system::instance();
        self::validate_context($context);
        require_capability('tiny/studiolms:use', $context);

        $cleanhistory = [];
        foreach (self::filter_history($params['history']) as $msg) {
            $cleanhistory[] = [
                'role'    => $msg['role'],
                'content' => clean_param($msg['content'], PARAM_RAW),
            ];
        }

        try {
            $result = chat::send($cleanhistory, $params['presetscontext']);
        } catch (\moodle_exception $e) {
            throw $e;
        } catch (\Throwable $t) {
            $detail = 'SLMS ' . get_class($t) . ': ' . $t->getMessage()
                . ' at ' . basename($t->getFile()) . ':' . $t->getLine();
            throw new \moodle_exception('generalexceptionmessage', 'error', '', $detail);
        }

        try {
            $log = new stdClass();
            $log->userid = $USER->id;
            $log->blocktype = 'chat';
            $log->ai_provider = $result['provider'] ?? 'unknown';
            $log->timecreated = time();
            $DB->insert_record('tiny_studiolms_ai_logs', $log);
        } catch (\dml_exception $e) {
            debugging('StudioLMS AI: log insert failed — ' . $e->getMessage(), DEBUG_DEVELOPER);
        }

        $response = [
            'reply'    => $result['reply'],
            'provider' => $result['provider'],
        ];
        if (!empty($result['action'])) {
            $response['action'] = $result['action'];
        }
        return $response;
    }

    /**
     * Describes the return value of execute().
     *
     * @return external_single_structure
     */
    public static function execute_returns(): external_single_structure {
        return new external_single_structure([
            'reply'    => new external_value(PARAM_RAW, 'AI reply text'),
            'action'   => new external_value(PARAM_RAW, 'JSON-encoded action (optional)', VALUE_OPTIONAL),
            'provider' => new external_value(PARAM_TEXT, 'AI provider used'),
        ]);
    }
}
