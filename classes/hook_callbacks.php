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

namespace tiny_studiolms;

use core\hook\output\before_footer_html_generation;

/**
 * Hook callbacks for tiny_studiolms.
 *
 * @package    tiny_studiolms
 * @copyright  2026 Jean Lúcio
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class hook_callbacks {
    /**
     * Load the student-facing frontend AMD module on every page.
     *
     * The editor offers the StudioLMS button wherever the user holds the capability, so blocks can be saved
     * in a category description, a dashboard text block or a profile as well as in a course. The stylesheet
     * hides the content of a closed accordion on every page and only this module opens it again, so the
     * module cannot be limited to course and module pages. It exits at once when the page holds no block.
     *
     * @param before_footer_html_generation $hook The hook event, not used: the module is loaded on every page.
     */
    public static function before_footer_html_generation(before_footer_html_generation $hook): void {
        global $PAGE;

        $PAGE->requires->js_call_amd('tiny_studiolms/frontend', 'init');
    }
}
