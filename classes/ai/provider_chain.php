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
 * AI provider chain for tiny_studiolms.
 *
 * @package    tiny_studiolms
 * @copyright  2026 Jean Lúcio
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace tiny_studiolms\ai;

/**
 * Routes every AI request through the shared ecosystem ladder:
 *   1. local_aihub (when installed), which resolves the user's personal then the site BYOK keys;
 *   2. Moodle core_ai, as the institutional fallback.
 *
 * The plugin holds no API key of its own and makes no HTTP request to an AI provider itself. The
 * hub is a soft dependency (class_exists), so a site running only core_ai works without it.
 *
 * @package    tiny_studiolms
 * @copyright  2026 Jean Lúcio
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class provider_chain {
    /**
     * Returns true when at least one AI source can serve a request in the given context.
     *
     * local_aihub has no per-course scoping of its own, so only the core_ai path depends on the
     * context (to honour a course/module-level "Enable AI tools" override).
     *
     * @param \context $context Context the AI feature is offered in.
     * @return bool
     */
    public static function has_ai(\context $context): bool {
        if (class_exists(\local_aihub\ai::class) && \local_aihub\ai::is_available()) {
            return true;
        }
        return self::has_core_ai($context);
    }

    /**
     * Sends a system + user prompt through the provider chain.
     *
     * @param string $system System instruction.
     * @param string $user User prompt text.
     * @param bool $jsonmode Whether structured JSON output is requested.
     * @param string $description Short label of what is generated, for the hub usage log.
     * @param \context $context Context the request is made in.
     * @return array Keys: success (bool), data (string), provider (string), message (string),
     *               attempted (bool — false when no AI source was available at all).
     */
    public static function send(
        string $system,
        string $user,
        bool $jsonmode,
        string $description,
        \context $context
    ): array {
        $result = ['success' => false, 'data' => '', 'provider' => '', 'message' => '', 'attempted' => false];

        if (class_exists(\local_aihub\ai::class) && \local_aihub\ai::is_available()) {
            $hub = \local_aihub\ai::generate_text($system, $user, $jsonmode, 'tiny_studiolms', $description);
            $result = [
                'success'   => !empty($hub['success']),
                'data'      => (string) ($hub['data'] ?? ''),
                'provider'  => (string) ($hub['provider'] ?? ''),
                'message'   => (string) ($hub['message'] ?? ''),
                'attempted' => true,
            ];
            if ($result['success'] && $result['data'] !== '') {
                return $result;
            }
        }

        if (self::has_core_ai($context)) {
            $coreresult = self::call_core_ai($system, $user, $context);
            // Keep the hub's failure message when core_ai also fails without one of its own, so a real
            // cause (e.g. an invalid key) is not masked.
            if ($coreresult['success'] || $coreresult['message'] !== '' || !$result['attempted']) {
                return $coreresult;
            }
        }

        return $result;
    }

    /**
     * Returns true when core_ai has a text-generation provider enabled and, on Moodle versions
     * that support it, AI tools are not disabled for this context.
     *
     * @param \context $context Context the AI feature is offered or used in.
     * @return bool
     */
    private static function has_core_ai(\context $context): bool {
        if (
            !class_exists(\core_ai\manager::class)
            || !class_exists(\core_ai\aiactions\generate_text::class)
        ) {
            return false;
        }

        try {
            $actionclass = \core_ai\aiactions\generate_text::class;
            $manager = \core\di::get(\core_ai\manager::class);
            $providers = $manager->get_providers_for_actions([$actionclass], true);
            if (empty($providers[$actionclass])) {
                return false;
            }
            return self::action_enabled_in_context($manager, $context, $actionclass);
        } catch (\Throwable $e) {
            return false;
        }
    }

    /**
     * Checks the per-course/per-module "Enable AI tools" override when the running Moodle supports it.
     *
     * core_ai\manager::is_action_enabled_in_context() does not exist on Moodle 4.5, so the check is
     * skipped there — never blocking — exactly like every other method_exists() guarded integration.
     *
     * @param \core_ai\manager $manager The AI manager.
     * @param \context $context Context the request is made in.
     * @param string $actionclass Fully qualified AI action class name.
     * @return bool
     */
    private static function action_enabled_in_context(
        \core_ai\manager $manager,
        \context $context,
        string $actionclass
    ): bool {
        if (!method_exists($manager, 'is_action_enabled_in_context')) {
            return true;
        }
        return $manager->is_action_enabled_in_context($context, $actionclass);
    }

    /**
     * Generates text via core_ai in the given context.
     *
     * The generate_text action has a single prompt field, so the system instruction is prepended.
     *
     * @param string $system System instruction.
     * @param string $user User prompt text.
     * @param \context $context Context the request is made in (also the action's contextid).
     * @return array Same shape as send().
     */
    private static function call_core_ai(string $system, string $user, \context $context): array {
        global $USER;

        $failure = ['success' => false, 'data' => '', 'provider' => 'Moodle AI', 'message' => '', 'attempted' => true];

        try {
            $manager = \core\di::get(\core_ai\manager::class);
            $action = new \core_ai\aiactions\generate_text(
                contextid: $context->id,
                userid: (int) $USER->id,
                prompttext: trim($system . "\n\n" . $user),
            );
            $response = $manager->process_action($action);
            if (!$response->get_success()) {
                $failure['message'] = 'core_ai: provider returned failure';
                return $failure;
            }
            $content = (string) ($response->get_response_data()['generatedcontent'] ?? '');
            if ($content === '') {
                $failure['message'] = 'core_ai: empty response';
                return $failure;
            }
            return ['success' => true, 'data' => $content, 'provider' => 'Moodle AI', 'message' => '', 'attempted' => true];
        } catch (\Throwable $e) {
            $failure['message'] = 'core_ai: ' . $e->getMessage();
            return $failure;
        }
    }
}
