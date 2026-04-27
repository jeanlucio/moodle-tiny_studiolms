<?php
// This file is part of Moodle - http://moodle.org/
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
// along with Moodle.  If not, see <http://www.gnu.org/licenses/>.

/**
 * Library of functions for tiny_studiolms.
 *
 * @package    tiny_studiolms
 * @copyright  2026 Jean Lúcio <jeanlucio@gmail.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

/**
 * Load the student-facing frontend AMD module on course and module context pages.
 *
 * Uses the legacy before_footer callback so no separate filter plugin is required.
 * Exits immediately on pages that have no StudioLMS blocks (checked inside the AMD
 * module itself), keeping the overhead near zero on unrelated pages.
 *
 * @return string Always empty — AMD is registered via $PAGE->requires, not HTML output.
 */
function tiny_studiolms_before_footer(): string {
    global $PAGE;

    if (!$PAGE->context) {
        return '';
    }

    $level = $PAGE->context->contextlevel;
    if ($level === CONTEXT_COURSE || $level === CONTEXT_MODULE) {
        $PAGE->requires->js_call_amd('tiny_studiolms/frontend', 'init');
    }

    return '';
}
