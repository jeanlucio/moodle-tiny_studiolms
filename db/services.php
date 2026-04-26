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
];
