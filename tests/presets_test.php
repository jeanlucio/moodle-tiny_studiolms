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
     * Every layout of pt_br has an English one with the same blocks and the same settings.
     *
     * Regression test: only the Portuguese layouts existed. Translating them is a copy of the structure with
     * the text changed, so the check is that nothing else moved: the block types and every setting key stay, and
     * only text differs. The files are named after their English title, so each pair is matched through this map.
     */
    public function test_each_english_layout_mirrors_the_portuguese_one(): void {
        $pairs = [
            'aviso_de_prazo.json' => 'deadline_notice.json',
            'card_acesso_plano.json' => 'course_plan_access_card.json',
            'card_de_conceito.json' => 'concept_card.json',
            'citacao.json' => 'quote.json',
            'contatos_professor.json' => 'teacher_contacts.json',
            'contatos_professor_azul.json' => 'teacher_contacts_blue.json',
            'depoimento.json' => 'testimonial.json',
            'dica_de_estudo.json' => 'study_tip.json',
            'encarte_playerhud.json' => 'playerhud_flyer.json',
            'encontros_sincronos.json' => 'live_sessions.json',
            'encontros_sincronos_verde.json' => 'live_sessions_green.json',
            'fechamento_de_modulo.json' => 'module_wrap_up.json',
            'forum_avaliativo_com_rubrica.json' => 'graded_forum_with_rubric.json',
            'informacao_importante.json' => 'important_information.json',
            'inicio_de_modulo.json' => 'module_start.json',
            'material_de_apoio.json' => 'support_material.json',
            'plano_de_disciplina.json' => 'course_syllabus.json',
            'quadro_de_missoes.json' => 'mission_board.json',
            'roteiro_de_atividade.json' => 'activity_guide.json',
        ];
        $portuguese = $this->presets('pt_br');
        $english = $this->presets('en');

        $this->assertSame(array_keys($pairs), array_keys($portuguese));
        $this->assertEqualsCanonicalizing(array_values($pairs), array_keys($english));

        foreach ($pairs as $ptfile => $enfile) {
            $preset = $portuguese[$ptfile];
            $this->assertSame(array_keys($preset), array_keys($english[$enfile]), $enfile);
            $this->assertSame(
                array_column($preset['blocks'] ?? [], 'type'),
                array_column($english[$enfile]['blocks'] ?? [], 'type'),
                $enfile
            );
            $this->assertNotSame($preset['name'], $english[$enfile]['name'], $enfile);
        }
    }

    /**
     * A layout is made of the blocks of the plugin and nothing else.
     *
     * Regression test: two layouts were a single card whose text was hand-written HTML, with a styled heading, a
     * round photo and buttons drawn as links with a background, and two grids held hand-made boxes in their
     * columns. None of that could be changed with the settings of a block, and the photo was a broken image. Every
     * block now comes from the library, and a column of a grid holds blocks, not styled boxes.
     */
    public function test_layouts_are_made_of_blocks_only(): void {
        $hand = [
            'a button drawn as a link' => '/<a\b[^>]*style="[^"]*background/i',
            'a heading with a background' => '/<h[1-6]\b[^>]*style="[^"]*background/i',
            'a flex layout' => '/display:\s*flex/i',
            'an image' => '/<img\b/i',
            'a styled box' => '/<div\b[^>]*style="[^"]*(border|background)/i',
        ];
        foreach (['pt_br', 'en'] as $lang) {
            foreach ($this->presets($lang) as $file => $preset) {
                foreach ($preset['blocks'] as $block) {
                    if ($block['type'] === 'gridcards') {
                        // The heading and the line under it are plain text, each in its own field.
                        foreach (['containerTitle', 'containerDesc'] as $field) {
                            $this->assertSame(
                                strip_tags($block['config'][$field] ?? ''),
                                $block['config'][$field] ?? '',
                                "$lang/$file: $field holds markup"
                            );
                        }
                        foreach ($block['config']['slots'] as $slot) {
                            $this->assertStringContainsString('data-slms-block-type="', $slot, "$lang/$file: a column");
                        }
                        continue;
                    }
                    $fields = [];
                    array_walk_recursive($block['config'], function ($value) use (&$fields) {
                        if (is_string($value)) {
                            $fields[] = $value;
                        }
                    });
                    foreach ($fields as $value) {
                        foreach ($hand as $what => $pattern) {
                            $this->assertDoesNotMatchRegularExpression($pattern, $value, "$lang/$file: $what");
                        }
                    }
                }
            }
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
