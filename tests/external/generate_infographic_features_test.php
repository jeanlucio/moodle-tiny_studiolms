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
 * PHPUnit tests for tiny_studiolms\external\generate_infographic_features.
 *
 * @package    tiny_studiolms
 * @copyright  2026 Jean Lúcio
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace tiny_studiolms\external;

defined('MOODLE_INTERNAL') || die();

global $CFG;
require_once($CFG->dirroot . '/lib/editor/tiny/plugins/studiolms/tests/external/generate_endpoint_testcase.php');

/**
 * Tests for the generate_infographic_features external function.
 *
 * The access-control and fail-safe assertions live in generate_endpoint_testcase;
 * these three methods only exist so Moodle's PHPUnit tooling (which requires each
 * testcase class to declare its own test_ methods) can discover and run them here.
 *
 * @covers \tiny_studiolms\external\generate_infographic_features
 */
final class generate_infographic_features_test extends generate_endpoint_testcase {
    #[\Override]
    protected function call_execute(int $contextid): void {
        generate_infographic_features::execute($contextid, 'Photosynthesis in plants');
    }

    #[\Override]
    // phpcs:ignore Generic.CodeAnalysis.UselessOverridingMethod.Found -- needed for TestCaseNamesSniff.
    public function test_guest_cannot_call(): void {
        parent::test_guest_cannot_call();
    }

    #[\Override]
    // phpcs:ignore Generic.CodeAnalysis.UselessOverridingMethod.Found -- needed for TestCaseNamesSniff.
    public function test_user_without_capability_is_rejected(): void {
        parent::test_user_without_capability_is_rejected();
    }

    #[\Override]
    // phpcs:ignore Generic.CodeAnalysis.UselessOverridingMethod.Found -- needed for TestCaseNamesSniff.
    public function test_no_provider_throws_moodle_exception(): void {
        parent::test_no_provider_throws_moodle_exception();
    }
}
