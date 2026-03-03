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

use editor_tiny\plugin;
use editor_tiny\plugin_with_buttons;
use editor_tiny\plugin_with_menuitems;

/**
 * Plugin info class.
 */
class plugininfo extends plugin implements plugin_with_buttons, plugin_with_menuitems {
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
            'tools' => [ // Places the item in the "Tools" (Ferramentas) menu.
                'tiny_studiolms/studiolms',
            ],
        ];
    }
}
