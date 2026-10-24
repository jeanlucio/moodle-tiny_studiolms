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
 * PHPUnit tests for the ready-made layouts shipped with the plugin.
 *
 * @package    tiny_studiolms
 * @copyright  2026 Jean Lúcio
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace tiny_studiolms;

use advanced_testcase;

/**
 * Tests that every language the plugin ships the layouts in has the same layouts.
 *
 * @coversNothing
 */
final class presets_test extends advanced_testcase {
    /**
     * Reads the preset files of a language folder.
     *
     * @param string $lang Folder name under presets/.
     * @return array[] Decoded presets, keyed by file name.
     */
    private function presets(string $lang): array {
        global $CFG;

        $presets = [];
        foreach (glob($CFG->dirroot . '/lib/editor/tiny/plugins/studiolms/presets/' . $lang . '/*.json') as $file) {
            $data = json_decode(file_get_contents($file), true);
            $this->assertIsArray($data, $file);
            $presets[basename($file)] = $data;
        }
        ksort($presets);
        return $presets;
    }

    /**
     * Every layout of pt_br has an English one with the same file name, the same blocks and the same settings.
     *
     * Regression test: only the Portuguese layouts existed. Translating them is a copy of the structure with
     * the text changed, so the check is that nothing else moved: the block types and every setting key stay, and
     * only text differs.
     */
    public function test_each_english_layout_mirrors_the_portuguese_one(): void {
        $portuguese = $this->presets('pt_br');
        $english = $this->presets('en');

        $this->assertNotEmpty($portuguese);
        $this->assertSame(array_keys($portuguese), array_keys($english));

        foreach ($portuguese as $file => $preset) {
            $this->assertSame(array_keys($preset), array_keys($english[$file]), $file);
            $this->assertSame(
                array_column($preset['blocks'] ?? [], 'type'),
                array_column($english[$file]['blocks'] ?? [], 'type'),
                $file
            );
            $this->assertNotSame($preset['name'], $english[$file]['name'], $file);
        }
    }

    /**
     * No English layout still holds Portuguese text.
     *
     * Every accented letter of the Portuguese text is a sign of a sentence left untranslated.
     */
    public function test_english_layouts_have_no_portuguese_text_left(): void {
        foreach ($this->presets('en') as $file => $preset) {
            $this->assertDoesNotMatchRegularExpression(
                '/[À-ÿ]/u',
                json_encode($preset, JSON_UNESCAPED_UNICODE),
                $file
            );
        }
    }
}
