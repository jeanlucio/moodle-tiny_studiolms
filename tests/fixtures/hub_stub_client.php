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
 * Stub local_aihub client used by the provider chain tests.
 *
 * @package    tiny_studiolms
 * @copyright  2026 Jean Lúcio
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace tiny_studiolms\tests;

/**
 * Returns a canned hub result and records every call, so no test ever reaches a real AI provider.
 *
 * Only loaded after checking that local_aihub is installed: it extends the hub's own client class.
 *
 * @package    tiny_studiolms
 * @copyright  2026 Jean Lúcio
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class hub_stub_client extends \local_aihub\local\client {
    /** @var array Result returned by every generate_text() call. */
    public array $result = [];

    /** @var array[] Calls received, each as [system, user, jsonmode]. */
    public array $calls = [];

    #[\Override]
    public function generate_text(string $system, string $user, bool $jsonmode = false, ?int $userid = null): array {
        $this->calls[] = [$system, $user, $jsonmode];
        return $this->result;
    }
}
