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
 * Web service function definitions for tiny_studiolms.
 *
 * @package    tiny_studiolms
 * @copyright  2026 Jean Lúcio
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

defined('MOODLE_INTERNAL') || die();

$functions = [
    'tiny_studiolms_save_template' => [
        'classname'   => 'tiny_studiolms\external\save_template',
        'methodname'  => 'execute',
        'description' => 'Save a layout template for the current user.',
        'type'        => 'write',
        'ajax'        => true,
        'loginrequired' => true,
        'capabilities'  => 'tiny/studiolms:use',
    ],
    'tiny_studiolms_get_templates' => [
        'classname'   => 'tiny_studiolms\external\get_templates',
        'methodname'  => 'execute',
        'description' => 'Return a list of templates filtered by type.',
        'type'        => 'read',
        'ajax'        => true,
        'loginrequired' => true,
        'capabilities'  => 'tiny/studiolms:use',
    ],
    'tiny_studiolms_delete_template' => [
        'classname'   => 'tiny_studiolms\external\delete_template',
        'methodname'  => 'execute',
        'description' => 'Delete a template owned by the current user.',
        'type'        => 'write',
        'ajax'        => true,
        'loginrequired' => true,
        'capabilities'  => 'tiny/studiolms:use',
    ],
    'tiny_studiolms_toggle_favourite' => [
        'classname'   => 'tiny_studiolms\external\toggle_favourite',
        'methodname'  => 'execute',
        'description' => 'Add or remove a template from the current user\'s favourites.',
        'type'        => 'write',
        'ajax'        => true,
        'loginrequired' => true,
        'capabilities'  => 'tiny/studiolms:use',
    ],
    'tiny_studiolms_generate_block' => [
        'classname'   => 'tiny_studiolms\external\generate_block',
        'methodname'  => 'execute',
        'description' => 'Generate a StudioLMS block configuration via a configured LLM provider.',
        'type'        => 'write',
        'ajax'        => true,
        'loginrequired' => true,
        'capabilities'  => 'tiny/studiolms:use',
    ],
    'tiny_studiolms_generate_preset' => [
        'classname'   => 'tiny_studiolms\external\generate_preset',
        'methodname'  => 'execute',
        'description' => 'Generate a multi-block StudioLMS layout via a configured LLM provider.',
        'type'        => 'write',
        'ajax'        => true,
        'loginrequired' => true,
        'capabilities'  => 'tiny/studiolms:use',
    ],
    'tiny_studiolms_get_ai_keys' => [
        'classname'   => 'tiny_studiolms\external\get_ai_keys',
        'methodname'  => 'execute',
        'description' => 'Return the current user\'s personal AI key status (presence flags, no actual values).',
        'type'        => 'read',
        'ajax'        => true,
        'loginrequired' => true,
        'capabilities'  => 'tiny/studiolms:use',
    ],
    'tiny_studiolms_save_ai_keys' => [
        'classname'   => 'tiny_studiolms\external\save_ai_keys',
        'methodname'  => 'execute',
        'description' => 'Save personal AI provider keys as Moodle user preferences.',
        'type'        => 'write',
        'ajax'        => true,
        'loginrequired' => true,
        'capabilities'  => 'tiny/studiolms:use',
    ],
    'tiny_studiolms_export_templates' => [
        'classname'   => 'tiny_studiolms\external\export_templates',
        'methodname'  => 'execute',
        'description' => 'Export templates owned by the current user as a portable JSON payload.',
        'type'        => 'read',
        'ajax'        => true,
        'loginrequired' => true,
        'capabilities'  => 'tiny/studiolms:use',
    ],
    'tiny_studiolms_import_templates' => [
        'classname'   => 'tiny_studiolms\external\import_templates',
        'methodname'  => 'execute',
        'description' => 'Import templates from a portable JSON payload into the current user\'s library.',
        'type'        => 'write',
        'ajax'        => true,
        'loginrequired' => true,
        'capabilities'  => 'tiny/studiolms:use',
    ],
    'tiny_studiolms_generate_mindmap' => [
        'classname'   => 'tiny_studiolms\external\generate_mindmap',
        'methodname'  => 'execute',
        'description' => 'Generate a mind map node structure via a configured LLM provider.',
        'type'        => 'write',
        'ajax'        => true,
        'loginrequired' => true,
        'capabilities'  => 'tiny/studiolms:use',
    ],
    'tiny_studiolms_generate_infographic' => [
        'classname'   => 'tiny_studiolms\external\generate_infographic',
        'methodname'  => 'execute',
        'description' => 'Generate an infographic stat structure via a configured LLM provider.',
        'type'        => 'write',
        'ajax'        => true,
        'loginrequired' => true,
        'capabilities'  => 'tiny/studiolms:use',
    ],
    'tiny_studiolms_generate_infographic_steps' => [
        'classname'   => 'tiny_studiolms\external\generate_infographic_steps',
        'methodname'  => 'execute',
        'description' => 'Generate a process steps structure via a configured LLM provider.',
        'type'        => 'write',
        'ajax'        => true,
        'loginrequired' => true,
        'capabilities'  => 'tiny/studiolms:use',
    ],
    'tiny_studiolms_generate_infographic_features' => [
        'classname'   => 'tiny_studiolms\external\generate_infographic_features',
        'methodname'  => 'execute',
        'description' => 'Generate a feature cards infographic via a configured LLM provider.',
        'type'        => 'write',
        'ajax'        => true,
        'loginrequired' => true,
        'capabilities'  => 'tiny/studiolms:use',
    ],
    'tiny_studiolms_generate_infographic_timeline' => [
        'classname'   => 'tiny_studiolms\external\generate_infographic_timeline',
        'methodname'  => 'execute',
        'description' => 'Generate a timeline infographic via a configured LLM provider.',
        'type'        => 'write',
        'ajax'        => true,
        'loginrequired' => true,
        'capabilities'  => 'tiny/studiolms:use',
    ],
    'tiny_studiolms_generate_infographic_comparison' => [
        'classname'   => 'tiny_studiolms\external\generate_infographic_comparison',
        'methodname'  => 'execute',
        'description' => 'Generate a comparison infographic via a configured LLM provider.',
        'type'        => 'write',
        'ajax'        => true,
        'loginrequired' => true,
        'capabilities'  => 'tiny/studiolms:use',
    ],
    'tiny_studiolms_generate_callout' => [
        'classname'   => 'tiny_studiolms\external\generate_callout',
        'methodname'  => 'execute',
        'description' => 'Generate icon and HTML content for a callout block via a configured LLM provider.',
        'type'        => 'write',
        'ajax'        => true,
        'loginrequired' => true,
        'capabilities'  => 'tiny/studiolms:use',
    ],
    'tiny_studiolms_generate_card' => [
        'classname'   => 'tiny_studiolms\external\generate_card',
        'methodname'  => 'execute',
        'description' => 'Generate HTML content and button label for an advanced card block via a configured LLM provider.',
        'type'        => 'write',
        'ajax'        => true,
        'loginrequired' => true,
        'capabilities'  => 'tiny/studiolms:use',
    ],
    'tiny_studiolms_generate_accordion' => [
        'classname'   => 'tiny_studiolms\external\generate_accordion',
        'methodname'  => 'execute',
        'description' => 'Generate title and HTML content for an accordion block via a configured LLM provider.',
        'type'        => 'write',
        'ajax'        => true,
        'loginrequired' => true,
        'capabilities'  => 'tiny/studiolms:use',
    ],
    'tiny_studiolms_generate_webteca' => [
        'classname'   => 'tiny_studiolms\external\generate_webteca',
        'methodname'  => 'execute',
        'description' => 'Generate a curated resource list for a webteca block via a configured LLM provider.',
        'type'        => 'write',
        'ajax'        => true,
        'loginrequired' => true,
        'capabilities'  => 'tiny/studiolms:use',
    ],
    'tiny_studiolms_chat_message' => [
        'classname'   => 'tiny_studiolms\external\chat_message',
        'methodname'  => 'execute',
        'description' => 'Send a chat message to the AI assistant and receive a reply with an optional action.',
        'type'        => 'write',
        'ajax'        => true,
        'loginrequired' => true,
        'capabilities'  => 'tiny/studiolms:use',
    ],
    'tiny_studiolms_get_ai_logs' => [
        'classname'   => 'tiny_studiolms\external\get_ai_logs',
        'methodname'  => 'execute',
        'description' => 'Return the current user\'s last 50 AI generation log entries.',
        'type'        => 'read',
        'ajax'        => true,
        'loginrequired' => true,
        'capabilities'  => 'tiny/studiolms:use',
    ],
];
