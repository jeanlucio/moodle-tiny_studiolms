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
 * PHPUnit tests for how tiny_studiolms\ai\generator parses and sanitises model output.
 *
 * @package    tiny_studiolms
 * @copyright  2026 Jean Lúcio
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace tiny_studiolms\ai;

use advanced_testcase;
use tiny_studiolms\tests\hub_stub_trait;

defined('MOODLE_INTERNAL') || die();

global $CFG;
require_once($CFG->dirroot . '/lib/editor/tiny/plugins/studiolms/tests/fixtures/hub_stub_trait.php');

/**
 * Tests for the response handling of every dedicated generator.
 *
 * The model is untrusted: whatever it returns is wrapped in code fences, half-filled or hostile. Each
 * generator must strip the fences, drop unusable entries, clean every text field and reject a payload
 * that leaves nothing to show. The hub client is stubbed, so no test reaches a live provider.
 *
 * @covers \tiny_studiolms\ai\generator
 */
final class generator_payload_test extends advanced_testcase {
    use hub_stub_trait;

    #[\Override]
    protected function setUp(): void {
        parent::setUp();
        $this->resetAfterTest();
        $this->setAdminUser();
    }

    #[\Override]
    protected function tearDown(): void {
        $this->reset_hub_stub();
        parent::tearDown();
    }

    /**
     * Runs a generator against a canned model response.
     *
     * @param string $method Name of the generator method.
     * @param string $payload Text the stubbed provider returns.
     * @return array The generator's result.
     */
    private function generate(string $method, string $payload): array {
        $this->install_hub_stub(true, $payload);
        return call_user_func([generator::class, $method], 'Photosynthesis', \context_system::instance());
    }

    /**
     * Wraps a decoded payload in the markdown code fence models often add despite being told not to.
     *
     * @param array $data Payload to encode.
     * @return string
     */
    private function fenced(array $data): string {
        return "\x60\x60\x60json\n" . json_encode($data) . "\n\x60\x60\x60";
    }

    /**
     * Asserts that a generator rejects a model response with its own error code.
     *
     * @param string $method Name of the generator method.
     * @param string $errorcode Expected lang string key.
     * @param string $payload Text the stubbed provider returns.
     */
    private function assert_rejected(string $method, string $errorcode, string $payload): void {
        try {
            $this->generate($method, $payload);
            $this->fail("{$method} accepted an unusable response: {$payload}");
        } catch (\moodle_exception $e) {
            $this->assertSame($errorcode, $e->errorcode, "{$method} threw the wrong error for: {$payload}");
        }
    }

    /**
     * Stats infographic: an item may carry only a value or only a label, never neither.
     */
    public function test_infographic_keeps_partial_items_and_drops_empty_ones(): void {
        $result = $this->generate('generate_infographic', json_encode([
            'title' => '<b>Stats</b>',
            'items' => [
                ['icon' => 'fa-users', 'value' => '<i>240</i>'],
                ['label' => 'Pass rate'],
                ['icon' => 'fa-users'],
                'junk',
            ],
        ]));
        $items = json_decode($result['items'], true);

        $this->assertSame('Stats', $result['title']);
        $this->assertCount(2, $items);
        $this->assertSame(['icon' => 'fa-solid fa-users', 'value' => '240', 'label' => ''], $items[0]);
        $this->assertSame(['icon' => '', 'value' => '', 'label' => 'Pass rate'], $items[1]);
    }

    /**
     * Steps infographic: items without a title are dropped and the rest are cleaned.
     */
    public function test_infographic_steps_drops_untitled_items(): void {
        $result = $this->generate('generate_infographic_steps', json_encode([
            'items' => [
                ['title' => '<b>Absorb</b>', 'description' => '<i>Roots take water</i>'],
                ['title' => '', 'description' => 'no title'],
                'junk',
            ],
        ]));

        $this->assertSame('', $result['title']);
        $this->assertSame(
            [['icon' => '', 'title' => 'Absorb', 'description' => 'Roots take water']],
            json_decode($result['items'], true)
        );
    }

    /**
     * Feature cards: fenced output is parsed, icons go through the allow-list and untitled items drop.
     */
    public function test_infographic_features_parses_and_filters(): void {
        $result = $this->generate('generate_infographic_features', $this->fenced([
            'title' => 'Why it matters',
            'items' => [
                ['icon' => 'fa-solid fa-brain', 'title' => 'Memory', 'description' => 'Sticks'],
                ['icon' => 'x" onclick="alert(1)', 'title' => 'Focus'],
                ['title' => ''],
                'junk',
            ],
        ]));
        $items = json_decode($result['items'], true);

        $this->assertSame('Why it matters', $result['title']);
        $this->assertSame('Gemini', $result['provider']);
        $this->assertCount(2, $items);
        $this->assertSame('fa-solid fa-brain', $items[0]['icon']);
        $this->assertSame('', $items[1]['icon']);
        $this->assertSame('', $items[1]['description']);
    }

    /**
     * Timeline: dates are kept as text, untitled entries are dropped.
     */
    public function test_infographic_timeline_parses_and_drops_untitled_items(): void {
        $result = $this->generate('generate_infographic_timeline', $this->fenced([
            'title' => 'History',
            'items' => [
                ['date' => '<b>1771</b>', 'title' => 'Priestley', 'description' => 'Plants restore air'],
                ['date' => '1779', 'title' => ''],
                'junk',
            ],
        ]));

        $this->assertSame('History', $result['title']);
        $this->assertSame(
            [['date' => '1771', 'title' => 'Priestley', 'description' => 'Plants restore air']],
            json_decode($result['items'], true)
        );
    }

    /**
     * Comparison: booleans are normalised, a missing flag defaults to true and unlabelled rows drop.
     */
    public function test_infographic_comparison_normalises_flags_and_defaults(): void {
        $result = $this->generate('generate_infographic_comparison', $this->fenced([
            'items' => [
                ['label' => '<b>Needs light</b>', 'col1' => true, 'col2' => false],
                ['label' => 'Makes oxygen', 'col1' => 0],
                ['label' => '', 'col1' => true],
                'junk',
            ],
        ]));

        $this->assertSame('', $result['title']);
        $this->assertSame(get_string('default_option_label', 'tiny_studiolms', 'A'), $result['col1']);
        $this->assertSame(get_string('default_option_label', 'tiny_studiolms', 'B'), $result['col2']);
        $this->assertSame([
            ['label' => 'Needs light', 'col1' => true, 'col2' => false],
            ['label' => 'Makes oxygen', 'col1' => false, 'col2' => true],
        ], json_decode($result['items'], true));
    }

    /**
     * Comparison: the option names the model supplies are cleaned and kept.
     */
    public function test_infographic_comparison_keeps_option_names(): void {
        $result = $this->generate('generate_infographic_comparison', json_encode([
            'title' => 'Plants',
            'col1' => '<b>Leaf</b>',
            'col2' => 'Root',
            'items' => [['label' => 'Absorbs water', 'col1' => false, 'col2' => true]],
        ]));

        $this->assertSame('Plants', $result['title']);
        $this->assertSame('Leaf', $result['col1']);
        $this->assertSame('Root', $result['col2']);
    }

    /**
     * Callout: scripts are purified out of the HTML body and the icon is kept.
     */
    public function test_callout_purifies_html_and_keeps_icon(): void {
        $result = $this->generate('generate_callout', $this->fenced([
            'icon' => '🔥',
            'contentHtml' => '<p>Careful</p><script>alert(1)</script>',
        ]));

        $this->assertSame('🔥', $result['icon']);
        $this->assertStringContainsString('<p>Careful</p>', $result['contenthtml']);
        $this->assertStringNotContainsString('script', $result['contenthtml']);
        $this->assertSame('Gemini', $result['provider']);
    }

    /**
     * Callout: a missing icon falls back to the light bulb.
     */
    public function test_callout_defaults_the_icon(): void {
        $result = $this->generate('generate_callout', json_encode(['contentHtml' => '<p>Tip</p>']));

        $this->assertSame('💡', $result['icon']);
    }

    /**
     * Card: the body is purified and the button label is reduced to plain text.
     */
    public function test_card_purifies_content_and_cleans_button_text(): void {
        $result = $this->generate('generate_card', $this->fenced([
            'content' => '<h4>Chlorophyll</h4><p onclick="alert(1)">Green</p><script>alert(2)</script>',
            'btnText' => '<b>Learn more</b>',
        ]));

        $this->assertStringContainsString('<h4>Chlorophyll</h4>', $result['content']);
        $this->assertStringNotContainsString('onclick', $result['content']);
        $this->assertStringNotContainsString('script', $result['content']);
        $this->assertSame('Learn more', $result['btntext']);
        $this->assertSame('Gemini', $result['provider']);
    }

    /**
     * Card: no button label means an empty string, not a missing key.
     */
    public function test_card_without_button_text_returns_empty_string(): void {
        $result = $this->generate('generate_card', json_encode(['content' => '<p>Body</p>']));

        $this->assertSame('', $result['btntext']);
    }

    /**
     * Accordion: the body is purified and a missing title becomes an empty string.
     */
    public function test_accordion_purifies_content_and_defaults_the_title(): void {
        $result = $this->generate('generate_accordion', $this->fenced([
            'content' => '<ul><li>Light</li></ul><script>alert(1)</script>',
        ]));

        $this->assertSame('', $result['title']);
        $this->assertStringContainsString('<li>Light</li>', $result['content']);
        $this->assertStringNotContainsString('script', $result['content']);

        $titled = $this->generate('generate_accordion', json_encode(['title' => '<b>Steps</b>', 'content' => '<p>x</p>']));
        $this->assertSame('Steps', $titled['title']);
    }

    /**
     * Resources: unknown types become links, titles are cleaned and the address is never trusted.
     */
    public function test_resources_normalises_types_and_never_keeps_model_urls(): void {
        $result = $this->generate('generate_resources', $this->fenced([
            'title' => '<b>Reading</b>',
            'desc' => '<i>Extra material</i>',
            'resources' => [
                ['type' => 'pdf', 'title' => 'Paper', 'url' => 'javascript:alert(1)'],
                ['type' => 'video', 'title' => '<b>Lecture</b>'],
                ['type' => 'exe', 'title' => 'Installer'],
                ['title' => 'No type'],
                ['type' => 'pdf', 'title' => ''],
                'junk',
            ],
        ]));
        $resources = json_decode($result['resources'], true);

        $this->assertSame('Reading', $result['title']);
        $this->assertSame('Extra material', $result['desc']);
        $this->assertSame(['pdf', 'video', 'link', 'link'], array_column($resources, 'type'));
        $this->assertSame(['Paper', 'Lecture', 'Installer', 'No type'], array_column($resources, 'title'));
        $this->assertSame(['#'], array_unique(array_column($resources, 'url')));
    }

    /**
     * Resources: title and description default to empty strings.
     */
    public function test_resources_defaults_title_and_description(): void {
        $result = $this->generate('generate_resources', json_encode(['resources' => [['title' => 'Paper']]]));

        $this->assertSame('', $result['title']);
        $this->assertSame('', $result['desc']);
    }

    /**
     * Every dedicated generator rejects a response that is not JSON or leaves nothing usable.
     *
     * Covers the three ways a model fails: prose instead of JSON, JSON of the wrong shape, and a list in
     * which no entry survives the per-item filter.
     */
    public function test_generators_reject_unusable_responses(): void {
        $listed = [
            ['generate_infographic', 'infographic_ai_error', 'items', ['icon' => 'fa-users']],
            ['generate_infographic_steps', 'infographic_steps_ai_error', 'items', ['title' => '']],
            ['generate_infographic_features', 'infographic_features_ai_error', 'items', ['title' => '']],
            ['generate_infographic_timeline', 'infographic_timeline_ai_error', 'items', ['title' => '']],
            ['generate_infographic_comparison', 'infographic_comparison_ai_error', 'items', ['label' => '']],
            ['generate_resources', 'resources_ai_error', 'resources', ['title' => '']],
        ];
        foreach ($listed as [$method, $errorcode, $key, $unusable]) {
            $this->assert_rejected($method, $errorcode, 'Sorry, I cannot help with that.');
            $this->assert_rejected($method, $errorcode, '{}');
            $this->assert_rejected($method, $errorcode, json_encode([$key => []]));
            $this->assert_rejected($method, $errorcode, json_encode([$key => 'text']));
            $this->assert_rejected($method, $errorcode, json_encode([$key => [$unusable, 'junk']]));
        }

        $bodies = [
            ['generate_callout', 'callout_ai_error', 'contentHtml'],
            ['generate_card', 'card_ai_error', 'content'],
            ['generate_accordion', 'accordion_ai_error', 'content'],
        ];
        foreach ($bodies as [$method, $errorcode, $key]) {
            $this->assert_rejected($method, $errorcode, 'Sorry, I cannot help with that.');
            $this->assert_rejected($method, $errorcode, '{}');
            $this->assert_rejected($method, $errorcode, json_encode([$key => '']));
        }
    }

    /**
     * Block type hints are added to the preset prompt only when the teacher gave some.
     */
    public function test_preset_prompt_includes_block_hints_only_when_given(): void {
        $payload = json_encode(['name' => 'Layout', 'blocks' => [['type' => 'callout', 'config' => []]]]);
        $client = $this->install_hub_stub(true, $payload);
        $context = \context_system::instance();

        generator::generate_preset('Layout', 'Intro', 'callout, gauge', 'green', $context);
        generator::generate_preset('Layout', 'Intro', '   ', 'green', $context);

        $this->assertStringContainsString('Preferred block types (use if appropriate): callout, gauge', $client->calls[0][1]);
        $this->assertStringNotContainsString('Preferred block types', $client->calls[1][1]);
    }

    /**
     * A preset without a name, without blocks or with only unknown block types is rejected.
     */
    public function test_preset_rejects_unusable_responses(): void {
        $context = \context_system::instance();
        $unusable = [
            'Sorry, no.',
            '{}',
            json_encode(['name' => '', 'blocks' => [['type' => 'callout']]]),
            json_encode(['name' => 'Layout']),
            json_encode(['name' => 'Layout', 'blocks' => []]),
            json_encode(['name' => 'Layout', 'blocks' => 'callout']),
            json_encode(['name' => 'Layout', 'blocks' => [['type' => 'script'], 'junk', ['config' => []]]]),
        ];

        foreach ($unusable as $payload) {
            $this->install_hub_stub(true, $payload);
            try {
                generator::generate_preset('Layout', 'Intro', '', 'blue', $context);
                $this->fail('generate_preset accepted: ' . $payload);
            } catch (\moodle_exception $e) {
                $this->assertSame('ai_preset_error', $e->errorcode, $payload);
            }
        }
    }

    /**
     * A preset keeps a block whose config is missing or malformed, as an empty config.
     */
    public function test_preset_keeps_block_with_non_array_config(): void {
        $this->install_hub_stub(true, $this->fenced([
            'name' => '<b>Layout</b>',
            'blocks' => [['type' => 'callout', 'config' => 'oops'], ['type' => 'gauge']],
        ]));

        $preset = generator::generate_preset('Layout', 'Intro', '', 'blue', \context_system::instance());

        $this->assertSame('Layout', $preset['name']);
        $this->assertSame(
            [['type' => 'callout', 'config' => []], ['type' => 'gauge', 'config' => []]],
            json_decode($preset['blocks'], true)
        );
    }

    /**
     * A single block with a missing or malformed config is returned with an empty config.
     */
    public function test_block_with_non_array_config_gets_empty_config(): void {
        $block = $this->generate('generate_block', '{"blocktype":"callout","config":"oops"}');

        $this->assertSame('callout', $block['blocktype']);
        $this->assertSame('[]', $block['config']);
    }

    /**
     * Plain text in a generated config is kept as the model wrote it; only real markup is purified.
     *
     * Regression test: any string with a '<' was purified, which entity-encodes '&' and '<' and made
     * a template show "x &lt; 5". A '<' that no browser reads as a tag (before a space or a digit)
     * is text, like an ampersand in a URL.
     */
    public function test_block_config_keeps_plain_text_with_symbols(): void {
        $block = $this->generate('generate_block', json_encode([
            'blocktype' => 'callout',
            'config' => [
                'btnUrl' => 'https://example.com/watch?v=abc&t=30s',
                'title' => 'P&D',
                'note' => 'x < 5 and y > 2',
                'contentHtml' => '<b>ok</b><script>alert(1)</script>',
            ],
        ]));
        $config = json_decode($block['config'], true);

        $this->assertSame('https://example.com/watch?v=abc&t=30s', $config['btnUrl']);
        $this->assertSame('P&D', $config['title']);
        $this->assertSame('x < 5 and y > 2', $config['note']);
        $this->assertStringContainsString('<b>ok</b>', $config['contentHtml']);
        $this->assertStringNotContainsString('script', $config['contentHtml']);
    }

    /**
     * A field of the wrong type never reaches clean_param(), which throws on an array.
     *
     * Regression test: the model may answer with an object or a list where text was asked for, and the
     * teacher then saw the core's "coding error" page instead of the generator's own message. Each
     * generator gets a response whose top-level text fields are the wrong type but whose list is fine:
     * it must return a result with those fields empty, never throw anything but its own error.
     */
    public function test_wrong_typed_text_fields_do_not_break_a_generator(): void {
        $wrong = ['text' => 'object'];
        $cases = [
            'generate_infographic' => ['title' => $wrong, 'items' => [['value' => '1']]],
            'generate_infographic_steps' => ['title' => $wrong, 'items' => [['title' => 'a']]],
            'generate_infographic_features' => ['title' => ['x'], 'items' => [['title' => 'a']]],
            'generate_infographic_timeline' => ['title' => $wrong, 'items' => [['title' => 'a']]],
            'generate_infographic_comparison' => [
                'title' => $wrong, 'col1' => $wrong, 'col2' => ['B'], 'items' => [['label' => 'a']],
            ],
            'generate_accordion' => ['title' => $wrong, 'content' => '<p>x</p>'],
            'generate_card' => ['btnText' => $wrong, 'content' => '<p>x</p>'],
            'generate_callout' => ['icon' => $wrong, 'contentHtml' => '<p>x</p>'],
            'generate_resources' => ['title' => $wrong, 'desc' => ['x'], 'resources' => [['title' => 'a']]],
        ];

        foreach ($cases as $method => $payload) {
            $result = $this->generate($method, json_encode($payload));
            $this->assertIsArray($result, $method);
            foreach (['title', 'btntext', 'desc'] as $key) {
                if (array_key_exists($key, $result)) {
                    $this->assertSame('', $result[$key], "{$method} {$key}");
                }
            }
        }
    }

    /**
     * A list item whose fields are the wrong type is dropped, and a response left with none is rejected.
     */
    public function test_wrong_typed_item_fields_drop_the_item(): void {
        $this->assert_rejected(
            'generate_infographic_steps',
            'infographic_steps_ai_error',
            json_encode(['items' => [['title' => ['x']], ['title' => new \stdClass()]]])
        );
        $this->assert_rejected(
            'generate_infographic_comparison',
            'infographic_comparison_ai_error',
            json_encode(['items' => [['label' => ['x']]]])
        );
        $this->assert_rejected('generate_resources', 'resources_ai_error', json_encode(['resources' => [['title' => ['x']]]]));
        $this->assert_rejected('generate_card', 'card_ai_error', json_encode(['content' => ['<p>x</p>']]));
        $this->assert_rejected('generate_callout', 'callout_ai_error', json_encode(['contentHtml' => new \stdClass()]));
        $this->assert_rejected('generate_accordion', 'accordion_ai_error', json_encode(['content' => [1]]));

        // The preset has its own signature, so it does not go through the shared helper.
        foreach ([['x'], new \stdClass()] as $name) {
            $this->install_hub_stub(true, json_encode(['name' => $name, 'blocks' => [['type' => 'callout']]]));
            try {
                generator::generate_preset('Layout', 'Intro', '', 'blue', \context_system::instance());
                $this->fail('generate_preset accepted a name that is not text.');
            } catch (\moodle_exception $e) {
                $this->assertSame('ai_preset_error', $e->errorcode);
            }
        }
    }

    /**
     * Comparison flags written as text keep their meaning, and a missing one defaults to true.
     */
    public function test_comparison_flags_written_as_text(): void {
        $result = $this->generate('generate_infographic_comparison', json_encode(['items' => [
            ['label' => 'a', 'col1' => 'false', 'col2' => 'true'],
            ['label' => 'b', 'col1' => 0, 'col2' => 'no'],
            ['label' => 'c', 'col1' => 'yes', 'col2' => 'maybe'],
            ['label' => 'd', 'col1' => ['x']],
        ]]));

        $this->assertSame([
            ['label' => 'a', 'col1' => false, 'col2' => true],
            ['label' => 'b', 'col1' => false, 'col2' => false],
            ['label' => 'c', 'col1' => true, 'col2' => true],
            ['label' => 'd', 'col1' => true, 'col2' => true],
        ], json_decode($result['items'], true));
    }

    /**
     * The names of the two compared options come from a language string when the model gives none.
     */
    public function test_comparison_default_option_names_are_translated(): void {
        $result = $this->generate('generate_infographic_comparison', json_encode(['items' => [['label' => 'a']]]));

        $this->assertSame(get_string('default_option_label', 'tiny_studiolms', 'A'), $result['col1']);
        $this->assertSame(get_string('default_option_label', 'tiny_studiolms', 'B'), $result['col2']);
    }

    /**
     * The prompt offers a block only the values and fields the block really uses.
     *
     * Regression test: the schema said "2, 3, or 4" columns for the feature cards (the block draws two
     * or three, and drew three for a four), "bordered" for the table style (the block knows "default")
     * and a shadow for the grid, which the grid never reads. Each was a request the block ignored
     * without saying so.
     */
    public function test_the_prompt_offers_only_what_the_blocks_support(): void {
        $method = new \ReflectionMethod(generator::class, 'block_types_schema');
        $schema = $method->invoke(null);
        $section = function (string $type) use ($schema): string {
            $start = strpos($schema, ' ' . $type . ' ');
            $this->assertNotFalse($start, $type);
            preg_match('/\n\d+\. /', $schema, $next, PREG_OFFSET_CAPTURE, $start + 1);
            return substr($schema, $start, isset($next[0]) ? $next[0][1] - $start : null);
        };

        $features = $section('infographicFeatures');
        $this->assertStringContainsString('- columns: 2 or 3', $features);
        $this->assertStringNotContainsString('4', substr($features, 0, strpos($features, 'items')));
        $this->assertStringContainsString('- style: "striped" or "default"', $section('table'));
        $this->assertStringNotContainsString('bordered', $section('table'));
        $this->assertStringNotContainsString('shadow', $section('gridcards'));
        $this->assertStringContainsString('- columns: "2", "3", or "4"', $section('gridcards'));
    }
}
