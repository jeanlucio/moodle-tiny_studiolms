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
 * Helper trait that swaps the local_aihub client for a stub.
 *
 * @package    tiny_studiolms
 * @copyright  2026 Jean Lúcio
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace tiny_studiolms\tests;

/**
 * Makes local_aihub available with a stubbed client, or skips the test when the hub is not installed.
 *
 * The hub is a soft dependency: CI installs it next to this plugin, but a site without it must still
 * run the rest of the suite. A test class using this trait must call reset_hub_stub() in tearDown(),
 * since the hub keeps the stub in a static property that outlives resetAfterTest().
 *
 * @package    tiny_studiolms
 * @copyright  2026 Jean Lúcio
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
trait hub_stub_trait {
    /**
     * Installs a stub hub client returning the given result and gives the hub a site key.
     *
     * @param bool $success Whether the stubbed provider call succeeds.
     * @param string $data Text the stubbed provider returns.
     * @param string $message Failure detail when $success is false.
     * @return hub_stub_client
     */
    protected function install_hub_stub(bool $success, string $data = '', string $message = ''): hub_stub_client {
        global $CFG;

        if (!class_exists(\local_aihub\ai::class)) {
            $this->markTestSkipped('local_aihub is not installed.');
        }
        require_once($CFG->dirroot . '/lib/editor/tiny/plugins/studiolms/tests/fixtures/hub_stub_client.php');

        // Any site key makes the hub report itself available; the stub means it is never used.
        set_config('gemini_key', 'stub-key', 'local_aihub');

        $attempt = [
            'success' => $success,
            'provider' => 'Gemini',
            'model' => 'stub-model',
            'keysource' => 'site',
            'message' => $message,
        ];
        $client = new hub_stub_client();
        $client->result = $attempt + ['data' => $data, 'attempts' => [$attempt]];
        \local_aihub\ai::set_client_for_testing($client);

        return $client;
    }

    /**
     * Removes the stub client from the hub.
     */
    protected function reset_hub_stub(): void {
        if (class_exists(\local_aihub\ai::class)) {
            \local_aihub\ai::set_client_for_testing(null);
        }
    }
}
