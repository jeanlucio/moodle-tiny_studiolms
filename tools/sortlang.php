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
 *
 * Moodle Language File Sorter
 * @package    tiny_studiolms
 * @copyright  2026 Jean Lúcio <jeanlucio@gmail.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 *
 * - Sorts language strings alphabetically
 * - Preserves Moodle header
 * - Removes duplicates
 * - Processes all languages
 */

defined('MOODLE_INTERNAL') || die();

$base = __DIR__ . '/../lang';

if (!is_dir($base)) {
    echo "Lang directory not found.\n";
    exit(1);
}

$dirs = scandir($base);

foreach ($dirs as $dir) {
    if ($dir === '.' || $dir === '..') {
        continue;
    }

    $file = $base . '/' . $dir;
    if (!is_dir($file)) {
        continue;
    }

    $files = glob($file . '/*.php');

    foreach ($files as $langfile) {
        echo "Processing: $langfile\n";
        $lines = file($langfile);
        echo "Lines: " . count($lines) . "\n";
        $header = [];
        $strings = [];

        foreach ($lines as $line) {
            if (preg_match("/\\\$string\\['([^']+)'\\]/", $line, $match)) {
                $key = $match[1];

                if (!isset($strings[$key])) {
                    $strings[$key] = trim($line);
                }
            } else {
                if (empty($strings)) {
                    $header[] = $line;
                }
            }
        }

        ksort($strings);

        $output = implode('', $header) . "\n";

        foreach ($strings as $line) {
            $output .= $line . "\n";
        }

        file_put_contents($langfile, $output);

        echo "✔ Sorted\n";
    }
}

echo "\nAll language files processed.\n";
