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
 * Plugin info class for tiny_studiolms.
 *
 * @package    tiny_studiolms
 * @copyright  2026 Jean Lúcio <jeanlucio@gmail.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace tiny_studiolms;

use context;
use editor_tiny\plugin;
use editor_tiny\plugin_with_buttons;
use editor_tiny\plugin_with_configuration;
use editor_tiny\plugin_with_menuitems;

/**
 * Plugin info class.
 *
 * @package    tiny_studiolms
 * @copyright  2026 Jean Lúcio <jeanlucio@gmail.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class plugininfo extends plugin implements plugin_with_buttons, plugin_with_configuration, plugin_with_menuitems {
    /**
     * Returns plugin configuration for the current context.
     *
     * @param context $context
     * @param array $options
     * @param array $fpoptions
     * @param \editor_tiny\editor|null $editor
     * @return array
     */
    public static function get_plugin_configuration_for_context(
        context $context,
        array $options,
        array $fpoptions,
        ?\editor_tiny\editor $editor = null
    ): array {
        return [
            'enabled'                  => has_capability('tiny/studiolms:use', $context),
            'canmanageglobaltemplates' => has_capability('tiny/studiolms:manageglobaltemplates', $context),
            'presets'                  => self::load_presets(current_language()),
        ];
    }

    /**
     * Load preset templates for the given language, falling back to English.
     *
     * @param string $lang Current Moodle language code (e.g. 'pt_br', 'en').
     * @return array Array of preset definitions, each with 'name' and 'blocks' keys.
     */
    private static function load_presets(string $lang): array {
        $basedir = dirname(__DIR__) . '/presets';
        $langdir = $basedir . '/' . $lang;

        if (!is_dir($langdir)) {
            $langdir = $basedir . '/en';
        }

        if (!is_dir($langdir)) {
            return [];
        }

        $files = glob($langdir . '/*.json');
        if (!$files) {
            return [];
        }

        sort($files);

        $presets = [];
        foreach ($files as $file) {
            $raw = file_get_contents($file);
            if ($raw === false) {
                continue;
            }
            $data = json_decode($raw, true);
            if (is_array($data) && !empty($data['name']) && !empty($data['blocks'])) {
                $presets[] = $data;
            }
        }

        return $presets;
    }

    /**
     * Get the list of available buttons provided by this plugin.
     *
     * @return array
     */
    public static function get_available_buttons(): array {
        return [
            'tiny_studiolms/studiolms' => [
                'image' => 'icon', // Looks for pix/icon.svg.
            ],
        ];
    }

    /**
     * Get the list of available menu items provided by this plugin.
     *
     * @return array
     */
    public static function get_available_menuitems(): array {
        return [
            'tools' => [ // Places the item in the Tools menu.
                'tiny_studiolms/studiolms',
            ],
        ];
    }
}
