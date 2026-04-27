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

namespace tiny_studiolms;

use core\hook\output\before_footer_html_generation;

/**
 * Hook callbacks for tiny_studiolms.
 *
 * @package    tiny_studiolms
 * @copyright  2026 Jean Lúcio <jeanlucio@gmail.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class hook_callbacks {

    /**
     * Load the student-facing frontend AMD module on course and module context pages.
     *
     * Exits without action on pages outside course/module context so the AMD
     * module is not requested unnecessarily. The module itself also exits early
     * if no StudioLMS blocks are present in the DOM.
     *
     * @param before_footer_html_generation $hook
     */
    public static function before_footer_html_generation(before_footer_html_generation $hook): void {
        global $PAGE;

        if (!$PAGE->context) {
            return;
        }

        $level = $PAGE->context->contextlevel;
        if ($level === CONTEXT_COURSE || $level === CONTEXT_MODULE) {
            $PAGE->requires->js_call_amd('tiny_studiolms/frontend', 'init');
        }
    }
}
