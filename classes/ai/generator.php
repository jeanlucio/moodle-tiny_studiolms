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
 * AI block generator for tiny_studiolms.
 *
 * @package    tiny_studiolms
 * @copyright  2026 Jean Lúcio
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace tiny_studiolms\ai;

/**
 * Builds the StudioLMS AI prompts and validates the model's responses.
 *
 * Every request goes through provider_chain (local_aihub, then core_ai); this class owns no API
 * key and makes no HTTP request of its own.
 *
 * @package    tiny_studiolms
 * @copyright  2026 Jean Lúcio
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class generator {
    /**
     * Returns a language instruction for the system prompt based on the current Moodle user language.
     *
     * Replaces the vague "same language as user's topic" heuristic with an explicit directive.
     * Product names and acronyms (e.g. "Moodle") carry no language signal, so the LLM defaults
     * to English without this explicit instruction.
     *
     * @return string
     */
    private static function language_instruction(): string {
        $lang = current_language();
        $langnames = [
            'pt_br' => 'Brazilian Portuguese',
            'pt'    => 'Portuguese',
            'es'    => 'Spanish',
            'fr'    => 'French',
            'de'    => 'German',
            'it'    => 'Italian',
            'nl'    => 'Dutch',
            'ru'    => 'Russian',
            'zh_cn' => 'Simplified Chinese',
            'zh_tw' => 'Traditional Chinese',
            'ja'    => 'Japanese',
            'ko'    => 'Korean',
            'ar'    => 'Arabic',
            'tr'    => 'Turkish',
            'pl'    => 'Polish',
        ];
        $name = $langnames[$lang] ?? $lang;
        return '- Write all text in ' . $name . ' (' . $lang . ')';
    }

    /**
     * Returns the schema description for all available block types (shared between system prompts).
     *
     * @return string
     */
    private static function block_types_schema(): string {
        $s = '1. stylizedHeading — A styled section heading with emoji icon.' . "\n";
        $s .= '   config keys:' . "\n";
        $s .= '   - text: string (heading text, plain text)' . "\n";
        $s .= '   - level: "h3" or "h4"' . "\n";
        $s .= '   - icon: string (one emoji)' . "\n";
        $s .= '   - bgColor: string (hex background for the heading band)' . "\n";
        $s .= '   - textColor: string (hex text color)' . "\n\n";

        $s .= '2. callout — A highlighted notice box with a colored left border.' . "\n";
        $s .= '   config keys:' . "\n";
        $s .= '   - icon: string (one emoji, e.g. "💡", "⚠️", "✅", "📌")' . "\n";
        $s .= '   - backgroundColor: string (hex)' . "\n";
        $s .= '   - textColor: string (hex)' . "\n";
        $s .= '   - borderColor: string (hex)' . "\n";
        $s .= '   - borderLeftWidth: number (2 to 8)' . "\n";
        $s .= '   - borderRadius: number (0 to 16)' . "\n";
        $s .= '   - contentHtml: string (HTML; use <p>, <strong>, <ul>, <li>)' . "\n\n";

        $s .= '3. accordion — A collapsible content section.' . "\n";
        $s .= '   config keys:' . "\n";
        $s .= '   - title: string (topic title, plain text)' . "\n";
        $s .= '   - color: string (hex for header background)' . "\n";
        $s .= '   - bg: string (hex for body background)' . "\n";
        $s .= '   - icon: string (one emoji for toggle indicator)' . "\n";
        $s .= '   - state: "open" or "closed"' . "\n";
        $s .= '   - content: string (HTML; use <p>, <ul>, <li>, <strong>)' . "\n\n";

        $s .= '4. actionButton — A styled call-to-action button.' . "\n";
        $s .= '   config keys:' . "\n";
        $s .= '   - btnText: string (button label, keep short)' . "\n";
        $s .= '   - btnUrl: string (URL; use "#" if not specified)' . "\n";
        $s .= '   - btnBg: string (hex background color)' . "\n";
        $s .= '   - btnTextCol: string (hex text color)' . "\n";
        $s .= '   - radius: number (0 to 50, border-radius in px)' . "\n";
        $s .= '   - align: "left", "center", "right", or "full"' . "\n\n";

        $s .= '5. advancedCard — A rich content card with optional button.' . "\n";
        $s .= '   config keys:' . "\n";
        $s .= '   - bg: string (hex background)' . "\n";
        $s .= '   - text: string (hex text color)' . "\n";
        $s .= '   - border: string (hex accent border color)' . "\n";
        $s .= '   - radius: number (4 to 20)' . "\n";
        $s .= '   - shadow: "none", "sm", "md", or "lg"' . "\n";
        $s .= '   - content: string (HTML; use <h4>, <p>, <ul>, <li>)' . "\n";
        $s .= '   - btnText: string (button label; use "" for no button)' . "\n";
        $s .= '   - btnUrl: string (URL; use "#" if not specified)' . "\n\n";

        $s .= '6. webteca — A resource list (links, PDFs, videos) with a collapsible panel.' . "\n";
        $s .= '   config keys:' . "\n";
        $s .= '   - title: string (panel heading, plain text)' . "\n";
        $s .= '   - desc: string (short description, plain text)' . "\n";
        $s .= '   - isOpen: boolean' . "\n";
        $s .= '   - layout: "list" or "grid"' . "\n";
        $s .= '   - resources: array of {type: "pdf"|"video"|"link", title: string, url: string}' . "\n";
        $s .= '   IMPORTANT: ALL resources go into the resources array of ONE webteca block.' . "\n\n";

        $s .= '7. gridcards — A responsive grid where each slot is an HTML card.' . "\n";
        $s .= '   config keys:' . "\n";
        $s .= '   - columns: "2", "3", or "4"' . "\n";
        $s .= '   - gap: number (spacing between cards in px, e.g. 16)' . "\n";
        $s .= '   - containerTitle: string (optional section heading; use "" if not needed)' . "\n";
        $s .= '   - titleColor: string (hex for container title text, e.g. "#333333")' . "\n";
        $s .= '   - background: string (hex or "transparent")' . "\n";
        $s .= '   - borderColor: string (hex for card borders)' . "\n";
        $s .= '   - borderWidth: number (0–4)' . "\n";
        $s .= '   - borderRadius: number (0–20)' . "\n";
        $s .= '   - shadow: "none", "sm", "md", or "lg"' . "\n";
        $s .= '   - slots: array of HTML strings (one per card; use <h4>, <p>, <a href="...">' . "\n";
        $s .= '     inside each slot to represent the card content)' . "\n";
        $s .= '   IMPORTANT: ALL cards go inside the slots array of ONE gridcards block.' . "\n";
        $s .= '   Never create multiple gridcards blocks — one block holds all cards.' . "\n\n";

        $s .= '8. profileCard — A presenter or teacher profile card.' . "\n";
        $s .= '   config keys:' . "\n";
        $s .= '   - photoUrl: string (image URL; use "" if none)' . "\n";
        $s .= '   - name: string' . "\n";
        $s .= '   - role: string (job title or role)' . "\n";
        $s .= '   - bio: string (short biography, plain text)' . "\n";
        $s .= '   - link0label / link0url: string (optional contact link 1)' . "\n";
        $s .= '   - link1label / link1url: string (optional contact link 2)' . "\n";
        $s .= '   - link2label / link2url: string (optional contact link 3)' . "\n";
        $s .= '   - bgColor: string (hex background)' . "\n";
        $s .= '   - accentColor: string (hex accent for name and links)' . "\n\n";

        $s .= '9. table — A styled data table with a header row.' . "\n";
        $s .= '   config keys:' . "\n";
        $s .= '   - cols: number (2–6)' . "\n";
        $s .= '   - rows: number (total rows including header, 2–10)' . "\n";
        $s .= '   - style: "striped" or "bordered"' . "\n";
        $s .= '   - headerBg: string (hex for header row background)' . "\n";
        $s .= '   - headerText: string (hex for header row text)' . "\n";
        $s .= '   - cellData: array of arrays (rows × cols of HTML strings;' . "\n";
        $s .= '     cellData[0] = header row, cellData[1..n] = data rows)' . "\n\n";

        $s .= '10. chart — Pie or donut chart.' . "\n";
        $s .= '    config keys:' . "\n";
        $s .= '    - type: "donut" or "pie"' . "\n";
        $s .= '    - title: string (optional heading; use "" if not needed)' . "\n";
        $s .= '    - slices: array of {label: string, value: number (1–100)}' . "\n";
        $s .= '    Generate 2–6 slices. Values do not need to sum to 100.' . "\n\n";

        $s .= '11. chartBar — Horizontal or vertical bar chart.' . "\n";
        $s .= '    config keys:' . "\n";
        $s .= '    - type: "horizontal" or "vertical"' . "\n";
        $s .= '    - title: string (optional heading; use "" if not needed)' . "\n";
        $s .= '    - items: array of {label: string, value: number (1–100)}' . "\n";
        $s .= '    Generate 2–6 items. "vertical" for time-series; "horizontal" for rankings.' . "\n\n";

        $s .= '12. gauge — Semi-circle speedometer chart.' . "\n";
        $s .= '    config keys:' . "\n";
        $s .= '    - title: string (optional heading; use "" if not needed)' . "\n";
        $s .= '    - gauges: array of {value: number (0–100), label: string}' . "\n";
        $s .= '    Generate 1–3 gauge objects (shown side by side).' . "\n\n";

        $s .= '13. mindmap — Radial SVG mind map.' . "\n";
        $s .= '    config keys:' . "\n";
        $s .= '    - topic: string (central node, max 20 chars)' . "\n";
        $s .= '    - theme: "blue", "green", "purple", or "orange"' . "\n";
        $s .= '    - branches: array of {label: string, children: [string, ...]}' . "\n";
        $s .= '    Generate 4–6 branches, each with 2–4 children (1–4 word strings).' . "\n\n";

        $s .= '14. infographic — Stats/metrics cards.' . "\n";
        $s .= '    config keys:' . "\n";
        $s .= '    - layout: always "stats"' . "\n";
        $s .= '    - title: string (optional heading; use "" if not needed)' . "\n";
        $s .= '    - theme: "blue", "green", "purple", or "orange"' . "\n";
        $s .= '    - items: array of {icon: string, value: string (short metric, max 8 chars),' . "\n";
        $s .= '        label: string}' . "\n";
        $s .= '    Generate 2–4 items.' . "\n";
        $s .= '    Allowed icon values (use ONLY these): "fa-solid fa-users", "fa-solid fa-chart-line",' . "\n";
        $s .= '      "fa-solid fa-book-open", "fa-solid fa-graduation-cap", "fa-solid fa-trophy",' . "\n";
        $s .= '      "fa-solid fa-star", "fa-solid fa-circle-check", "fa-solid fa-clock",' . "\n";
        $s .= '      "fa-solid fa-calendar", "fa-solid fa-lightbulb", "fa-solid fa-brain",' . "\n";
        $s .= '      "fa-solid fa-medal", "fa-solid fa-bullseye", "fa-solid fa-fire",' . "\n";
        $s .= '      "fa-solid fa-heart", "fa-solid fa-percent", "fa-solid fa-arrow-up",' . "\n";
        $s .= '      "fa-solid fa-globe", "fa-solid fa-bolt", "fa-solid fa-rocket",' . "\n";
        $s .= '      "fa-solid fa-chart-bar", "fa-solid fa-laptop", "fa-solid fa-book",' . "\n";
        $s .= '      "fa-solid fa-flask", "fa-solid fa-code", "fa-solid fa-database",' . "\n";
        $s .= '      "fa-solid fa-user".' . "\n\n";

        $s .= '15. infographicSteps — Numbered process flow.' . "\n";
        $s .= '    config keys:' . "\n";
        $s .= '    - title: string (optional heading; use "" if not needed)' . "\n";
        $s .= '    - theme: "blue", "green", "purple", or "orange"' . "\n";
        $s .= '    - layout: "vertical" or "horizontal"' . "\n";
        $s .= '    - items: array of {icon: string (from the allowed list above or ""),' . "\n";
        $s .= '        title: string, description: string}' . "\n";
        $s .= '    Generate 3–6 steps.' . "\n\n";

        $s .= '16. infographicFeatures — Feature/benefit card grid.' . "\n";
        $s .= '    config keys:' . "\n";
        $s .= '    - title: string (optional heading; use "" if not needed)' . "\n";
        $s .= '    - theme: "blue", "green", "purple", or "orange"' . "\n";
        $s .= '    - columns: 2, 3, or 4' . "\n";
        $s .= '    - items: array of {icon: string (from the allowed list above or ""),' . "\n";
        $s .= '        title: string, description: string}' . "\n";
        $s .= '    Generate 3–6 items.' . "\n\n";

        $s .= '17. infographicTimeline — Vertical chronological timeline.' . "\n";
        $s .= '    config keys:' . "\n";
        $s .= '    - title: string (optional heading; use "" if not needed)' . "\n";
        $s .= '    - theme: "blue", "green", "purple", or "orange"' . "\n";
        $s .= '    - items: array of {date: string (year/period, max 15 chars), title: string,' . "\n";
        $s .= '        description: string}' . "\n";
        $s .= '    Generate 3–6 items in chronological order.' . "\n\n";

        $s .= '18. infographicComparison — Side-by-side comparison table with checkmarks.' . "\n";
        $s .= '    config keys:' . "\n";
        $s .= '    - title: string (optional heading; use "" if not needed)' . "\n";
        $s .= '    - col1: string (first option name, max 20 chars)' . "\n";
        $s .= '    - col2: string (second option name, max 20 chars)' . "\n";
        $s .= '    - theme: "blue", "green", "purple", or "orange"' . "\n";
        $s .= '    - items: array of {label: string, col1: boolean, col2: boolean}' . "\n";
        $s .= '    Generate 3–6 items with genuine differences between the two options.' . "\n\n";

        return $s;
    }

    /**
     * Returns the system prompt for single-block generation.
     *
     * @return string
     */
    private static function system_prompt(): string {
        $prompt = 'You are a Moodle LMS content creation assistant. Your task is to generate';
        $prompt .= ' StudioLMS block configurations based on the teacher\'s request.' . "\n\n";
        $prompt .= 'Respond ONLY with a valid JSON object — no markdown, no code fences, no explanation.' . "\n\n";
        $prompt .= 'Schema: {"blocktype": "TYPE", "config": {BLOCK_CONFIG_OBJECT}}' . "\n\n";
        $prompt .= 'Available block types:' . "\n\n";
        $prompt .= self::block_types_schema();
        $prompt .= self::language_instruction() . "\n";
        $prompt .= 'Choose the most appropriate block type for the request. Respond ONLY with JSON.';

        return $prompt;
    }

    /**
     * Returns the system prompt for multi-block preset generation.
     *
     * @param string $palette Colour palette identifier: blue|green|purple|orange|neutral.
     * @return string
     */
    private static function preset_system_prompt(string $palette): string {
        $palettes = [
            'blue'    => [
                'heading_bg'     => '#dbeafe',
                'heading_text'   => '#1e3a8a',
                'callout_bg'     => '#eff6ff',
                'callout_border' => '#3b82f6',
                'callout_text'   => '#1e3a8a',
                'accordion'      => '#2563eb',
                'button_bg'      => '#1e40af',
                'button_text'    => '#ffffff',
            ],
            'green'   => [
                'heading_bg'     => '#dcfce7',
                'heading_text'   => '#14532d',
                'callout_bg'     => '#f0fdf4',
                'callout_border' => '#16a34a',
                'callout_text'   => '#14532d',
                'accordion'      => '#15803d',
                'button_bg'      => '#166534',
                'button_text'    => '#ffffff',
            ],
            'purple'  => [
                'heading_bg'     => '#f3e8ff',
                'heading_text'   => '#581c87',
                'callout_bg'     => '#faf5ff',
                'callout_border' => '#9333ea',
                'callout_text'   => '#581c87',
                'accordion'      => '#7c3aed',
                'button_bg'      => '#6d28d9',
                'button_text'    => '#ffffff',
            ],
            'orange'  => [
                'heading_bg'     => '#ffedd5',
                'heading_text'   => '#7c2d12',
                'callout_bg'     => '#fff7ed',
                'callout_border' => '#f97316',
                'callout_text'   => '#7c2d12',
                'accordion'      => '#ea580c',
                'button_bg'      => '#c2410c',
                'button_text'    => '#ffffff',
            ],
            'neutral' => [
                'heading_bg'     => '#f1f5f9',
                'heading_text'   => '#1e293b',
                'callout_bg'     => '#f8fafc',
                'callout_border' => '#64748b',
                'callout_text'   => '#334155',
                'accordion'      => '#475569',
                'button_bg'      => '#334155',
                'button_text'    => '#ffffff',
            ],
        ];

        $p = $palettes[$palette] ?? $palettes['blue'];

        $prompt = 'You are a Moodle LMS instructional design assistant. Generate a StudioLMS preset:' . "\n";
        $prompt .= 'a sequence of 2 to 6 content blocks tailored to the teacher\'s pedagogical context.' . "\n\n";
        $prompt .= 'Respond ONLY with a valid JSON object — no markdown, no code fences, no explanation.' . "\n\n";
        $prompt .= 'Schema: {"name": "layout name", "blocks": [{"type": "TYPE", "config": {...}}, ...]}' . "\n\n";
        $prompt .= 'Colour palette — use these exact hex values consistently across ALL blocks:' . "\n";
        $prompt .= '  stylizedHeading: bgColor=' . $p['heading_bg'] . ', textColor=' . $p['heading_text'] . "\n";
        $prompt .= '  callout: backgroundColor=' . $p['callout_bg'] . ', borderColor=' . $p['callout_border'];
        $prompt .= ', textColor=' . $p['callout_text'] . "\n";
        $prompt .= '  accordion: color=' . $p['accordion'] . "\n";
        $prompt .= '  actionButton / advancedCard: btnBg=' . $p['button_bg'] . ', btnTextCol=' . $p['button_text'] . "\n\n";
        $prompt .= 'Available block types:' . "\n\n";
        $prompt .= self::block_types_schema();
        $prompt .= 'Rules:' . "\n";
        $prompt .= '- Order blocks logically: heading → content blocks → actions.' . "\n";
        $prompt .= '- For text-based blocks (1–9): use ONLY the hex values from the palette above.' . "\n";
        $prompt .= '- For visual blocks (10–18: chart, chartBar, gauge, mindmap, infographic*):'
            . ' set their "theme" field to match the palette name ('
            . $palette . ').' . "\n";
        $prompt .= self::language_instruction() . "\n";
        $prompt .= '- Generate rich, placeholder-quality HTML content in contentHtml/content fields.' . "\n";
        $prompt .= '- Respond ONLY with JSON.' . "\n";

        return $prompt;
    }

    /**
     * Sends a prompt through the provider chain (local_aihub, then core_ai) and returns the result.
     *
     * @param string $userprompt  The user-facing prompt text.
     * @param string $sysprompt   The system instruction to send.
     * @param string $errkey      Lang string key used when an AI source is available but fails.
     * @param string $description Short label of what is generated, for the hub usage log.
     * @param \context $context   Context the request is made in.
     * @return array With keys 'data' (string) and 'provider' (string).
     * @throws \moodle_exception If no AI source is available or the request fails.
     */
    private static function call_providers(
        string $userprompt,
        string $sysprompt,
        string $errkey,
        string $description,
        \context $context
    ): array {
        $result = provider_chain::send($sysprompt, $userprompt, true, $description, $context);

        if (!$result['success']) {
            if (!$result['attempted']) {
                throw new \moodle_exception('ai_generator_no_config', 'tiny_studiolms');
            }
            // The provider's own failure detail can carry raw response text: keep it for a
            // developer, never hand it to the caller.
            debugging('StudioLMS AI: ' . $result['message'], DEBUG_DEVELOPER);
            throw new \moodle_exception($errkey, 'tiny_studiolms');
        }

        return $result;
    }

    /**
     * Generates a block configuration from a plain-text prompt.
     *
     * @param string $prompt Teacher's content request.
     * @param \context $context Context the request is made in.
     * @return array With keys 'blocktype' (string), 'config' (JSON string), 'provider' (string).
     * @throws \moodle_exception If no AI source is available or the request fails.
     */
    public static function generate_block(string $prompt, \context $context): array {
        $result = self::call_providers(
            $prompt,
            self::system_prompt(),
            'ai_generator_error',
            get_string('tab_ai_block', 'tiny_studiolms'),
            $context
        );
        $block = self::parse_block_json($result['data']);
        $block['provider'] = $result['provider'];
        return $block;
    }

    /**
     * Generates a multi-block layout from a pedagogical context.
     *
     * @param string $name        Desired layout name.
     * @param string $contexttext Pedagogical context and intent.
     * @param string $blocks      Optional comma-separated block type hints.
     * @param string $palette     Colour palette identifier (blue|green|purple|orange|neutral).
     * @param \context $context   Context the request is made in.
     * @return array With keys 'name' (string), 'blocks' (JSON string), 'provider' (string).
     * @throws \moodle_exception If no AI source is available or the request fails.
     */
    public static function generate_preset(
        string $name,
        string $contexttext,
        string $blocks,
        string $palette,
        \context $context
    ): array {
        $userparts = ['Preset name: ' . $name, 'Pedagogical context: ' . $contexttext];
        if (!empty(trim($blocks))) {
            $userparts[] = 'Preferred block types (use if appropriate): ' . $blocks;
        }
        $userprompt = implode("\n", $userparts);

        $validpalettes = ['blue', 'green', 'purple', 'orange', 'neutral'];
        $safpalette = in_array($palette, $validpalettes, true) ? $palette : 'blue';

        $result = self::call_providers(
            $userprompt,
            self::preset_system_prompt($safpalette),
            'ai_preset_error',
            get_string('tab_ai_model', 'tiny_studiolms'),
            $context
        );
        $preset = self::parse_preset_json($result['data']);
        $preset['provider'] = $result['provider'];
        return $preset;
    }

    /**
     * Returns the system prompt for mind map generation.
     *
     * @return string
     */
    private static function mindmap_system_prompt(): string {
        $p = 'You are a mind map generator for educational content.' . "\n";
        $p .= 'Given a topic, generate a structured mind map.' . "\n\n";
        $p .= 'Respond ONLY with a valid JSON object — no markdown, no code fences, no explanation.' . "\n\n";
        $p .= 'Schema: {"topic": "string", "branches": [{"label": "string", "children": ["string", ...]}, ...]}' . "\n\n";
        $p .= 'Rules:' . "\n";
        $p .= '- Generate 4 to 6 main branches' . "\n";
        $p .= '- Each branch must have 2 to 4 children' . "\n";
        $p .= '- Keep all labels concise (1–4 words each)' . "\n";
        $p .= self::language_instruction() . "\n";
        $p .= '- Respond ONLY with JSON.' . "\n";
        return $p;
    }

    /**
     * Generates a mind map node structure from a topic description.
     *
     * @param string $topic Topic description from the teacher.
     * @param \context $context Context the request is made in.
     * @return array With keys 'topic' (string), 'branches' (JSON string), 'provider' (string).
     * @throws \moodle_exception If no provider is configured, all calls fail, or the response is invalid.
     */
    public static function generate_mindmap(string $topic, \context $context): array {
        $result = self::call_providers(
            $topic,
            self::mindmap_system_prompt(),
            'mindmap_ai_error',
            get_string('block_mindmap_title', 'tiny_studiolms'),
            $context
        );

        $raw = trim($result['data']);
        $raw = preg_replace('/^\x60{3}(?:json)?\s*/i', '', $raw);
        $raw = preg_replace('/\s*\x60{3}$/i', '', $raw);

        $data = json_decode(trim($raw), true);

        if (!is_array($data) || empty($data['branches']) || !is_array($data['branches'])) {
            throw new \moodle_exception('mindmap_ai_error', 'tiny_studiolms');
        }

        $safetopic = clean_param($data['topic'] ?? $topic, PARAM_TEXT);
        $safebranches = [];
        foreach ($data['branches'] as $branch) {
            if (!is_array($branch) || empty($branch['label'])) {
                continue;
            }
            $safechildren = [];
            foreach (($branch['children'] ?? []) as $child) {
                $safechildren[] = clean_param((string)$child, PARAM_TEXT);
            }
            $safebranches[] = [
                'label'    => clean_param((string)$branch['label'], PARAM_TEXT),
                'children' => $safechildren,
            ];
        }

        if (empty($safebranches)) {
            throw new \moodle_exception('mindmap_ai_error', 'tiny_studiolms');
        }

        return [
            'topic'    => $safetopic,
            'branches' => json_encode($safebranches),
            'provider' => $result['provider'],
        ];
    }

    /** @var string[] Curated FA6 icons offered to the AI; must stay in sync with ICON_UNICODE in infographic_shared.js. */
    private const ALLOWED_ICONS = [
        'fa-solid fa-users', 'fa-solid fa-chart-line', 'fa-solid fa-chart-bar',
        'fa-solid fa-book-open', 'fa-solid fa-book', 'fa-solid fa-graduation-cap',
        'fa-solid fa-trophy', 'fa-solid fa-medal', 'fa-solid fa-star',
        'fa-solid fa-circle-check', 'fa-solid fa-clock', 'fa-solid fa-calendar',
        'fa-solid fa-lightbulb', 'fa-solid fa-brain', 'fa-solid fa-bullseye',
        'fa-solid fa-fire', 'fa-solid fa-heart', 'fa-solid fa-percent',
        'fa-solid fa-arrow-up', 'fa-solid fa-globe', 'fa-solid fa-bolt',
        'fa-solid fa-rocket', 'fa-solid fa-laptop', 'fa-solid fa-flask',
        'fa-solid fa-code', 'fa-solid fa-database', 'fa-solid fa-user',
        'fa-solid fa-gear', 'fa-solid fa-key', 'fa-solid fa-lock',
        'fa-solid fa-envelope', 'fa-solid fa-flag', 'fa-solid fa-magnifying-glass',
        'fa-solid fa-play', 'fa-solid fa-check', 'fa-solid fa-download',
        'fa-solid fa-upload', 'fa-solid fa-arrow-right', 'fa-solid fa-pen',
        'fa-solid fa-file',
    ];

    /**
     * Returns the curated FA6 icon list hint shared across all infographic AI prompts.
     *
     * @return string
     */
    private static function icon_list_hint(): string {
        return implode(', ', self::ALLOWED_ICONS);
    }

    /**
     * Restricts an AI-returned icon class to the curated allow-list.
     *
     * PARAM_TEXT strips tags but keeps quotes, so an unchecked value can still break out of the
     * class attribute it is later interpolated into. Accepts the bare ("fa-users") and "fas"
     * short forms the model sometimes returns; anything outside the list becomes empty.
     *
     * @param string $raw Icon value as returned by the model.
     * @return string A class string from ALLOWED_ICONS, or '' when not allowed.
     */
    private static function allowed_icon(string $raw): string {
        $name = preg_replace('/^(fa-solid|fas)\s+/', '', trim($raw));
        $icon = 'fa-solid ' . $name;
        return in_array($icon, self::ALLOWED_ICONS, true) ? $icon : '';
    }

    /**
     * Returns the system prompt for infographic generation.
     *
     * @return string
     */
    private static function infographic_system_prompt(): string {
        $p = 'You are an infographic generator for educational content.' . "\n";
        $p .= 'Given a topic or context, generate a set of stat cards for a "stats" infographic.' . "\n\n";
        $p .= 'Respond ONLY with a valid JSON object — no markdown, no code fences, no explanation.' . "\n\n";
        $p .= 'Schema: {"title": "string", "items": [{"icon": "string", "value": "string",'
            . ' "label": "string"}, ...]}' . "\n\n";
        $p .= 'Rules:' . "\n";
        $p .= '- Generate 3 or 4 items' . "\n";
        $p .= '- Each "icon" must be from this curated list (use ONLY these):'
            . ' ' . self::icon_list_hint() . "\n";
        $p .= '- "value" must be a short metric: number, percentage, time or short word (max 8 chars)' . "\n";
        $p .= '- "label" must be a short description (max 30 chars)' . "\n";
        $p .= '- "title" should be a short headline (max 50 chars), or empty string if not needed' . "\n";
        $p .= self::language_instruction() . "\n";
        $p .= '- Respond ONLY with JSON.' . "\n";
        return $p;
    }

    /**
     * Generates an infographic stat structure from a topic description.
     *
     * @param string $topic Topic or context description from the teacher.
     * @param \context $context Context the request is made in.
     * @return array With keys 'title' (string), 'items' (JSON string), 'provider' (string).
     * @throws \moodle_exception If no provider is configured, all calls fail, or response is invalid.
     */
    public static function generate_infographic(string $topic, \context $context): array {
        $result = self::call_providers(
            $topic,
            self::infographic_system_prompt(),
            'infographic_ai_error',
            get_string('block_infographic_title', 'tiny_studiolms'),
            $context
        );

        $raw = trim($result['data']);
        $raw = preg_replace('/^\x60{3}(?:json)?\s*/i', '', $raw);
        $raw = preg_replace('/\s*\x60{3}$/i', '', $raw);

        $data = json_decode(trim($raw), true);

        if (!is_array($data) || empty($data['items']) || !is_array($data['items'])) {
            throw new \moodle_exception('infographic_ai_error', 'tiny_studiolms');
        }

        $safetitle = clean_param($data['title'] ?? '', PARAM_TEXT);
        $safeitems = [];
        foreach ($data['items'] as $item) {
            if (!is_array($item) || (empty($item['value']) && empty($item['label']))) {
                continue;
            }
            $safeitems[] = [
                'icon'  => self::allowed_icon((string)($item['icon'] ?? '')),
                'value' => clean_param((string)($item['value'] ?? ''), PARAM_TEXT),
                'label' => clean_param((string)($item['label'] ?? ''), PARAM_TEXT),
            ];
        }

        if (empty($safeitems)) {
            throw new \moodle_exception('infographic_ai_error', 'tiny_studiolms');
        }

        return [
            'title'    => $safetitle,
            'items'    => json_encode($safeitems),
            'provider' => $result['provider'],
        ];
    }

    /**
     * Returns the system prompt for process steps generation.
     *
     * @return string
     */
    private static function infographic_steps_system_prompt(): string {
        $p = 'You are an educational content assistant generating process step infographics.' . "\n";
        $p .= 'Given a topic or process description, generate a numbered list of steps.' . "\n\n";
        $p .= 'Respond ONLY with a valid JSON object — no markdown, no code fences, no explanation.' . "\n\n";
        $p .= 'Schema: {"title": "string", "items": [{"icon": "string", "title": "string",'
            . ' "description": "string"}, ...]}' . "\n\n";
        $p .= 'Rules:' . "\n";
        $p .= '- Generate 3 to 6 steps' . "\n";
        $p .= '- "icon" is optional — use empty string "" when no icon fits;'
            . ' otherwise choose from: ' . self::icon_list_hint() . "\n";
        $p .= '- "title" is the short step name (max 50 chars)' . "\n";
        $p .= '- "description" is an optional brief explanation (max 100 chars); use empty string if not needed' . "\n";
        $p .= '- "title" at the top level should be a short headline for the whole flow (max 60 chars),'
            . ' or empty string if not needed' . "\n";
        $p .= self::language_instruction() . "\n";
        $p .= '- Respond ONLY with JSON.' . "\n";
        return $p;
    }

    /**
     * Generates a process steps structure from a topic description.
     *
     * @param string $topic Teacher's process or topic description.
     * @param \context $context Context the request is made in.
     * @return array With keys 'title' (string), 'items' (JSON string), 'provider' (string).
     * @throws \moodle_exception If no provider is configured, all calls fail, or response is invalid.
     */
    public static function generate_infographic_steps(string $topic, \context $context): array {
        $result = self::call_providers(
            $topic,
            self::infographic_steps_system_prompt(),
            'infographic_steps_ai_error',
            get_string('block_infographic_steps_title', 'tiny_studiolms'),
            $context
        );

        $raw = trim($result['data']);
        $raw = preg_replace('/^\x60{3}(?:json)?\s*/i', '', $raw);
        $raw = preg_replace('/\s*\x60{3}$/i', '', $raw);

        $data = json_decode(trim($raw), true);

        if (!is_array($data) || empty($data['items']) || !is_array($data['items'])) {
            throw new \moodle_exception('infographic_steps_ai_error', 'tiny_studiolms');
        }

        $safetitle = clean_param($data['title'] ?? '', PARAM_TEXT);
        $safeitems = [];
        foreach ($data['items'] as $item) {
            if (!is_array($item) || empty($item['title'])) {
                continue;
            }
            $safeitems[] = [
                'icon'        => self::allowed_icon((string)($item['icon'] ?? '')),
                'title'       => clean_param((string)($item['title'] ?? ''), PARAM_TEXT),
                'description' => clean_param((string)($item['description'] ?? ''), PARAM_TEXT),
            ];
        }

        if (empty($safeitems)) {
            throw new \moodle_exception('infographic_steps_ai_error', 'tiny_studiolms');
        }

        return [
            'title'    => $safetitle,
            'items'    => json_encode($safeitems),
            'provider' => $result['provider'],
        ];
    }

    /**
     * Returns the system prompt for feature cards generation.
     *
     * @return string
     */
    private static function infographic_features_system_prompt(): string {
        $p = 'You are an educational content assistant generating feature card content.' . "\n";
        $p .= 'Given a topic, produce 3–6 feature cards highlighting key benefits or aspects.' . "\n\n";
        $p .= 'Respond ONLY with a valid JSON object — no markdown, no code fences, no explanation.' . "\n\n";
        $p .= 'Schema:' . "\n";
        $p .= '{"title": string, "items": [{"icon": string, "title": string, "description": string}]}' . "\n\n";
        $p .= 'Rules:' . "\n";
        $p .= '- title: short optional heading for the block (may be empty string).' . "\n";
        $p .= '- items: 3–6 objects.' . "\n";
        $p .= '- icon: one of these FA6 class strings (or empty string):'
            . ' ' . self::icon_list_hint() . "\n";
        $p .= '- title (item): 2–5 words, concise feature name.' . "\n";
        $p .= '- description: 1–2 sentences explaining the feature. May be empty string.' . "\n";
        $p .= '- No HTML tags. Plain text only.' . "\n";
        $p .= self::language_instruction() . "\n";
        return $p;
    }

    /**
     * Generates feature cards content via a configured LLM provider.
     *
     * @param string $topic User-supplied topic.
     * @param \context $context Context the request is made in.
     * @return array{title: string, items: string, provider: string}
     */
    public static function generate_infographic_features(string $topic, \context $context): array {
        $result = self::call_providers(
            $topic,
            self::infographic_features_system_prompt(),
            'infographic_features_ai_error',
            get_string('block_infographic_features_title', 'tiny_studiolms'),
            $context
        );

        $raw = trim($result['data']);
        $raw = preg_replace('/^\x60{3}(?:json)?\s*/i', '', $raw);
        $raw = preg_replace('/\s*\x60{3}$/i', '', $raw);

        $data = json_decode(trim($raw), true);

        if (!is_array($data) || empty($data['items']) || !is_array($data['items'])) {
            throw new \moodle_exception('infographic_features_ai_error', 'tiny_studiolms');
        }

        $safetitle = clean_param($data['title'] ?? '', PARAM_TEXT);
        $safeitems = [];
        foreach ($data['items'] as $item) {
            if (!is_array($item) || empty($item['title'])) {
                continue;
            }
            $safeitems[] = [
                'icon'        => self::allowed_icon((string)($item['icon'] ?? '')),
                'title'       => clean_param((string)($item['title'] ?? ''), PARAM_TEXT),
                'description' => clean_param((string)($item['description'] ?? ''), PARAM_TEXT),
            ];
        }

        if (empty($safeitems)) {
            throw new \moodle_exception('infographic_features_ai_error', 'tiny_studiolms');
        }

        return [
            'title'    => $safetitle,
            'items'    => json_encode($safeitems),
            'provider' => $result['provider'],
        ];
    }

    /**
     * Returns the system prompt for timeline generation.
     *
     * @return string
     */
    private static function infographic_timeline_system_prompt(): string {
        $p = 'You are an educational content assistant generating timeline infographics.' . "\n";
        $p .= 'Given a topic, produce a chronological sequence of events or milestones.' . "\n\n";
        $p .= 'Respond ONLY with a valid JSON object — no markdown, no code fences, no explanation.' . "\n\n";
        $p .= 'Schema: {"title": "string", "items": [{"date": "string", "title": "string",'
            . ' "description": "string"}, ...]}' . "\n\n";
        $p .= 'Rules:' . "\n";
        $p .= '- Generate 3 to 6 items' . "\n";
        $p .= '- "date" must always include the year; use a consistent format throughout:'
            . ' year only (e.g. "1822"), month + year (e.g. "Sep 1822"),'
            . ' or year range (e.g. "1808–1822"); never use just a day or month without the year;'
            . ' max 15 chars; may be empty string only if no date is relevant' . "\n";
        $p .= '- "title" is the event or milestone name; max 50 chars' . "\n";
        $p .= '- "description" is an optional brief explanation; max 100 chars; use empty string if not needed' . "\n";
        $p .= '- "title" at the top level should be a short headline for the timeline; max 60 chars;'
            . ' or empty string if not needed' . "\n";
        $p .= '- Items must be in chronological order' . "\n";
        $p .= '- No HTML tags. Plain text only.' . "\n";
        $p .= self::language_instruction() . "\n";
        return $p;
    }

    /**
     * Generates a timeline structure from a topic description.
     *
     * @param string $topic Teacher's topic or subject description.
     * @param \context $context Context the request is made in.
     * @return array{title: string, items: string, provider: string}
     * @throws \moodle_exception If no provider is configured, all calls fail, or response is invalid.
     */
    public static function generate_infographic_timeline(string $topic, \context $context): array {
        $result = self::call_providers(
            $topic,
            self::infographic_timeline_system_prompt(),
            'infographic_timeline_ai_error',
            get_string('block_infographic_timeline_title', 'tiny_studiolms'),
            $context
        );

        $raw = trim($result['data']);
        $raw = preg_replace('/^\x60{3}(?:json)?\s*/i', '', $raw);
        $raw = preg_replace('/\s*\x60{3}$/i', '', $raw);

        $data = json_decode(trim($raw), true);

        if (!is_array($data) || empty($data['items']) || !is_array($data['items'])) {
            throw new \moodle_exception('infographic_timeline_ai_error', 'tiny_studiolms');
        }

        $safetitle = clean_param($data['title'] ?? '', PARAM_TEXT);
        $safeitems = [];
        foreach ($data['items'] as $item) {
            if (!is_array($item) || empty($item['title'])) {
                continue;
            }
            $safeitems[] = [
                'date'        => clean_param((string)($item['date'] ?? ''), PARAM_TEXT),
                'title'       => clean_param((string)($item['title'] ?? ''), PARAM_TEXT),
                'description' => clean_param((string)($item['description'] ?? ''), PARAM_TEXT),
            ];
        }

        if (empty($safeitems)) {
            throw new \moodle_exception('infographic_timeline_ai_error', 'tiny_studiolms');
        }

        return [
            'title'    => $safetitle,
            'items'    => json_encode($safeitems),
            'provider' => $result['provider'],
        ];
    }

    /**
     * Returns the system prompt for comparison infographic generation.
     *
     * @return string
     */
    private static function infographic_comparison_system_prompt(): string {
        $p = 'You are an educational content assistant generating comparison infographics.' . "\n";
        $p .= 'Given a topic, produce a side-by-side comparison of two options or concepts.' . "\n\n";
        $p .= 'Respond ONLY with a valid JSON object — no markdown, no code fences, no explanation.' . "\n\n";
        $p .= 'Schema: {"title": "string", "col1": "string", "col2": "string",' . "\n";
        $p .= '"items": [{"label": "string", "col1": true/false, "col2": true/false}, ...]}' . "\n\n";
        $p .= 'Rules:' . "\n";
        $p .= '- Generate 3 to 6 items' . "\n";
        $p .= '- "col1" and "col2" at the top level are the option names; max 20 chars each' . "\n";
        $p .= '- "title" is an optional short headline; max 60 chars; or empty string if not needed' . "\n";
        $p .= '- Each item "label" is a feature or criterion; max 50 chars' . "\n";
        $p .= '- Each item "col1" and "col2" are booleans: true means the option has that feature,'
            . ' false means it does not; avoid having every item be true for both options' . "\n";
        $p .= '- Items must be varied: show real differences between the two options' . "\n";
        $p .= '- No HTML tags. Plain text only.' . "\n";
        $p .= self::language_instruction() . "\n";
        return $p;
    }

    /**
     * Generates a comparison infographic structure from a topic description.
     *
     * @param string $topic Teacher's topic or subject description.
     * @param \context $context Context the request is made in.
     * @return array{title: string, col1: string, col2: string, items: string, provider: string}
     * @throws \moodle_exception If no provider is configured, all calls fail, or response is invalid.
     */
    public static function generate_infographic_comparison(string $topic, \context $context): array {
        $result = self::call_providers(
            $topic,
            self::infographic_comparison_system_prompt(),
            'infographic_comparison_ai_error',
            get_string('block_infographic_comparison_title', 'tiny_studiolms'),
            $context
        );

        $raw = trim($result['data']);
        $raw = preg_replace('/^\x60{3}(?:json)?\s*/i', '', $raw);
        $raw = preg_replace('/\s*\x60{3}$/i', '', $raw);

        $data = json_decode(trim($raw), true);

        if (!is_array($data) || empty($data['items']) || !is_array($data['items'])) {
            throw new \moodle_exception('infographic_comparison_ai_error', 'tiny_studiolms');
        }

        $safetitle = clean_param($data['title'] ?? '', PARAM_TEXT);
        $safecol1 = clean_param($data['col1'] ?? 'A', PARAM_TEXT);
        $safecol2 = clean_param($data['col2'] ?? 'B', PARAM_TEXT);
        $safeitems = [];
        foreach ($data['items'] as $item) {
            if (!is_array($item) || empty($item['label'])) {
                continue;
            }
            $safeitems[] = [
                'label' => clean_param((string)($item['label'] ?? ''), PARAM_TEXT),
                'col1'  => (bool)($item['col1'] ?? true),
                'col2'  => (bool)($item['col2'] ?? true),
            ];
        }

        if (empty($safeitems)) {
            throw new \moodle_exception('infographic_comparison_ai_error', 'tiny_studiolms');
        }

        return [
            'title'    => $safetitle,
            'col1'     => $safecol1,
            'col2'     => $safecol2,
            'items'    => json_encode($safeitems),
            'provider' => $result['provider'],
        ];
    }

    /**
     * Returns the system prompt for callout content generation.
     *
     * @return string
     */
    private static function callout_system_prompt(): string {
        $p = 'You are an educational content assistant generating callout box content.' . "\n";
        $p .= 'Given a topic or instruction, produce a short icon and rich HTML content for a callout box.' . "\n\n";
        $p .= 'Respond ONLY with a valid JSON object — no markdown, no code fences, no explanation.' . "\n\n";
        $p .= 'Schema: {"icon": "string", "contentHtml": "string"}' . "\n\n";
        $p .= 'Rules:' . "\n";
        $p .= '- "icon" must be a single emoji appropriate for the tone (💡 tip, ⚠️ warning, ✅ success, 📌 note)' . "\n";
        $p .= '- "contentHtml" must use only <p>, <strong>, <ul>, <li> tags; keep it concise (2–5 sentences)' . "\n";
        $p .= self::language_instruction() . "\n";
        $p .= '- Respond ONLY with JSON.' . "\n";
        return $p;
    }

    /**
     * Generates icon and HTML content for a callout block.
     *
     * @param string $topic Teacher's description of the callout content.
     * @param \context $context Context the request is made in.
     * @return array With keys 'icon' (string), 'contenthtml' (string), 'provider' (string).
     * @throws \moodle_exception If no provider is configured, all calls fail, or response is invalid.
     */
    public static function generate_callout(string $topic, \context $context): array {
        $result = self::call_providers(
            $topic,
            self::callout_system_prompt(),
            'callout_ai_error',
            get_string('block_callout_title', 'tiny_studiolms'),
            $context
        );

        $raw = trim($result['data']);
        $raw = preg_replace('/^\x60{3}(?:json)?\s*/i', '', $raw);
        $raw = preg_replace('/\s*\x60{3}$/i', '', $raw);

        $data = json_decode(trim($raw), true);

        if (!is_array($data) || empty($data['contentHtml'])) {
            throw new \moodle_exception('callout_ai_error', 'tiny_studiolms');
        }

        return [
            'icon'        => clean_param((string)($data['icon'] ?? '💡'), PARAM_TEXT),
            'contenthtml' => clean_param((string)$data['contentHtml'], PARAM_CLEANHTML),
            'provider'    => $result['provider'],
        ];
    }

    /**
     * Returns the system prompt for advanced card content generation.
     *
     * @return string
     */
    private static function card_system_prompt(): string {
        $p = 'You are an educational content assistant generating rich card content.' . "\n";
        $p .= 'Given a topic or context, produce HTML content and an optional button label for a card block.' . "\n\n";
        $p .= 'Respond ONLY with a valid JSON object — no markdown, no code fences, no explanation.' . "\n\n";
        $p .= 'Schema: {"content": "string", "btnText": "string"}' . "\n\n";
        $p .= 'Rules:' . "\n";
        $p .= '- "content" must use only <h4>, <p>, <strong>, <ul>, <li> tags; 3–6 sentences' . "\n";
        $p .= '- "btnText" must be a short action label (max 5 words); use empty string if no action fits' . "\n";
        $p .= self::language_instruction() . "\n";
        $p .= '- Respond ONLY with JSON.' . "\n";
        return $p;
    }

    /**
     * Generates HTML content and button text for an advanced card block.
     *
     * @param string $topic Teacher's description of the card content.
     * @param \context $context Context the request is made in.
     * @return array With keys 'content' (string), 'btntext' (string), 'provider' (string).
     * @throws \moodle_exception If no provider is configured, all calls fail, or response is invalid.
     */
    public static function generate_card(string $topic, \context $context): array {
        $result = self::call_providers(
            $topic,
            self::card_system_prompt(),
            'card_ai_error',
            get_string('block_card_title', 'tiny_studiolms'),
            $context
        );

        $raw = trim($result['data']);
        $raw = preg_replace('/^\x60{3}(?:json)?\s*/i', '', $raw);
        $raw = preg_replace('/\s*\x60{3}$/i', '', $raw);

        $data = json_decode(trim($raw), true);

        if (!is_array($data) || empty($data['content'])) {
            throw new \moodle_exception('card_ai_error', 'tiny_studiolms');
        }

        return [
            'content'  => clean_param((string)$data['content'], PARAM_CLEANHTML),
            'btntext'  => clean_param((string)($data['btnText'] ?? ''), PARAM_TEXT),
            'provider' => $result['provider'],
        ];
    }

    /**
     * Returns the system prompt for accordion content generation.
     *
     * @return string
     */
    private static function accordion_system_prompt(): string {
        $p = 'You are an educational content assistant generating accordion section content.' . "\n";
        $p .= 'Given a topic, produce a title and rich HTML body for a collapsible accordion block.' . "\n\n";
        $p .= 'Respond ONLY with a valid JSON object — no markdown, no code fences, no explanation.' . "\n\n";
        $p .= 'Schema: {"title": "string", "content": "string"}' . "\n\n";
        $p .= 'Rules:' . "\n";
        $p .= '- "title" must be a concise section heading (max 60 chars, plain text)' . "\n";
        $p .= '- "content" must use only <p>, <ul>, <li>, <strong> tags; 3–6 sentences' . "\n";
        $p .= self::language_instruction() . "\n";
        $p .= '- Respond ONLY with JSON.' . "\n";
        return $p;
    }

    /**
     * Generates title and HTML content for an accordion block.
     *
     * @param string $topic Teacher's description of the accordion content.
     * @param \context $context Context the request is made in.
     * @return array With keys 'title' (string), 'content' (string), 'provider' (string).
     * @throws \moodle_exception If no provider is configured, all calls fail, or response is invalid.
     */
    public static function generate_accordion(string $topic, \context $context): array {
        $result = self::call_providers(
            $topic,
            self::accordion_system_prompt(),
            'accordion_ai_error',
            get_string('block_accordion_title', 'tiny_studiolms'),
            $context
        );

        $raw = trim($result['data']);
        $raw = preg_replace('/^\x60{3}(?:json)?\s*/i', '', $raw);
        $raw = preg_replace('/\s*\x60{3}$/i', '', $raw);

        $data = json_decode(trim($raw), true);

        if (!is_array($data) || empty($data['content'])) {
            throw new \moodle_exception('accordion_ai_error', 'tiny_studiolms');
        }

        return [
            'title'    => clean_param((string)($data['title'] ?? ''), PARAM_TEXT),
            'content'  => clean_param((string)$data['content'], PARAM_CLEANHTML),
            'provider' => $result['provider'],
        ];
    }

    /**
     * Returns the system prompt for webteca resource list generation.
     *
     * @return string
     */
    private static function webteca_system_prompt(): string {
        $p = 'You are an educational content assistant generating a curated resource list.' . "\n";
        $p .= 'Given a topic, produce a title, short description and a list of learning resources.' . "\n\n";
        $p .= 'Respond ONLY with a valid JSON object — no markdown, no code fences, no explanation.' . "\n\n";
        $p .= 'Schema: {"title": "string", "desc": "string",'
            . ' "resources": [{"type": "link"|"pdf"|"video", "title": "string", "url": "string"}, ...]}' . "\n\n";
        $p .= 'Rules:' . "\n";
        $p .= '- Generate 3 to 5 resources' . "\n";
        $p .= '- "type" must be "link", "pdf" or "video"' . "\n";
        $p .= '- "url" must be "#" (placeholder) because we cannot invent real URLs' . "\n";
        $p .= '- "title" for each resource must be specific and descriptive (max 60 chars)' . "\n";
        $p .= '- "title" (top-level) max 60 chars, "desc" max 120 chars' . "\n";
        $p .= self::language_instruction() . "\n";
        $p .= '- Respond ONLY with JSON.' . "\n";
        return $p;
    }

    /**
     * Generates title, description and resources for a webteca block.
     *
     * @param string $topic Teacher's description of the resource collection.
     * @param \context $context Context the request is made in.
     * @return array With keys 'title' (string), 'desc' (string), 'resources' (JSON string), 'provider' (string).
     * @throws \moodle_exception If no provider is configured, all calls fail, or response is invalid.
     */
    public static function generate_webteca(string $topic, \context $context): array {
        $result = self::call_providers(
            $topic,
            self::webteca_system_prompt(),
            'webteca_ai_error',
            get_string('block_webteca_title', 'tiny_studiolms'),
            $context
        );

        $raw = trim($result['data']);
        $raw = preg_replace('/^\x60{3}(?:json)?\s*/i', '', $raw);
        $raw = preg_replace('/\s*\x60{3}$/i', '', $raw);

        $data = json_decode(trim($raw), true);

        if (!is_array($data) || empty($data['resources']) || !is_array($data['resources'])) {
            throw new \moodle_exception('webteca_ai_error', 'tiny_studiolms');
        }

        $saferesources = [];
        $validtypes = ['link', 'pdf', 'video'];
        foreach ($data['resources'] as $res) {
            if (!is_array($res) || empty($res['title'])) {
                continue;
            }
            $type = in_array($res['type'] ?? '', $validtypes, true) ? $res['type'] : 'link';
            $saferesources[] = [
                'type'  => $type,
                'title' => clean_param((string)$res['title'], PARAM_TEXT),
                'url'   => '#',
            ];
        }

        if (empty($saferesources)) {
            throw new \moodle_exception('webteca_ai_error', 'tiny_studiolms');
        }

        return [
            'title'     => clean_param((string)($data['title'] ?? ''), PARAM_TEXT),
            'desc'      => clean_param((string)($data['desc'] ?? ''), PARAM_TEXT),
            'resources' => json_encode($saferesources),
            'provider'  => $result['provider'],
        ];
    }

    /**
     * Sends a multi-turn conversation through the provider chain and returns the raw text reply.
     *
     * Each entry in $messages must have 'role' (user|assistant) and 'content' (string). The
     * provider chain takes a single system/user pair, so the history is flattened into a
     * transcript — the same shape core_ai always needed.
     *
     * @param string $systemprompt System instruction.
     * @param array  $messages     Conversation history [{role, content}, ...].
     * @param \context $context    Context the request is made in.
     * @return array With keys 'data' (string) and 'provider' (string).
     * @throws \moodle_exception If no AI source is available or the request fails.
     */
    public static function call_chat(string $systemprompt, array $messages, \context $context): array {
        $chatlines = [];
        foreach ($messages as $msg) {
            $role = $msg['role'] === 'assistant' ? 'Assistant' : 'User';
            $chatlines[] = $role . ': ' . $msg['content'];
        }

        $result = self::call_providers(
            implode("\n", $chatlines),
            $systemprompt,
            'ai_chat_error',
            get_string('tab_ai_chat', 'tiny_studiolms'),
            $context
        );

        return ['data' => $result['data'], 'provider' => $result['provider']];
    }

    /**
     * Validates and normalises the raw JSON string returned by the LLM.
     *
     * @param string $content Raw text from the LLM response.
     * @return array With keys 'blocktype' (string) and 'config' (JSON string).
     * @throws \moodle_exception If the content is not a valid block JSON.
     */
    private static function parse_block_json(string $content): array {
        $content = trim($content);
        $content = preg_replace('/^\x60{3}(?:json)?\s*/i', '', $content);
        $content = preg_replace('/\s*\x60{3}$/i', '', $content);

        $block = json_decode(trim($content), true);

        $validtypes = [
            'accordion', 'actionButton', 'advancedCard', 'callout',
            'chart', 'chartBar', 'gauge',
            'gridcards', 'infographic', 'infographicComparison',
            'infographicFeatures', 'infographicSteps', 'infographicTimeline',
            'mindmap', 'profileCard', 'stylizedHeading', 'table', 'webteca',
        ];

        if (
            !is_array($block) ||
            !isset($block['blocktype']) ||
            !in_array($block['blocktype'], $validtypes, true)
        ) {
            throw new \moodle_exception('ai_generator_error', 'tiny_studiolms');
        }

        // Unlike the dedicated generators above, this generic path has no fixed field list to
        // clean_param() per block type — that shape only exists client-side (Blocks registry's
        // defaultData). The config is sanitized there instead, in htmlsanitizer.js, by stripping
        // script-executing constructs from every string value before it reaches a render sink;
        // this is only a transport step.
        $config = isset($block['config']) && is_array($block['config']) ? $block['config'] : [];

        return [
            'blocktype' => $block['blocktype'],
            'config'    => json_encode($config),
        ];
    }

    /**
     * Validates and normalises the raw JSON string for a multi-block preset returned by the LLM.
     *
     * @param string $content Raw text from the LLM response.
     * @return array With keys 'name' (string) and 'blocks' (JSON string).
     * @throws \moodle_exception If the content is not a valid preset JSON.
     */
    private static function parse_preset_json(string $content): array {
        $content = trim($content);
        $content = preg_replace('/^\x60{3}(?:json)?\s*/i', '', $content);
        $content = preg_replace('/\s*\x60{3}$/i', '', $content);

        $preset = json_decode(trim($content), true);

        $validtypes = [
            'accordion', 'actionButton', 'advancedCard', 'callout',
            'chart', 'chartBar', 'gauge',
            'gridcards', 'infographic', 'infographicComparison',
            'infographicFeatures', 'infographicSteps', 'infographicTimeline',
            'mindmap', 'profileCard', 'stylizedHeading', 'table', 'webteca',
        ];

        if (
            !is_array($preset) || empty($preset['name']) || !isset($preset['blocks'])
            || !is_array($preset['blocks']) || empty($preset['blocks'])
        ) {
            throw new \moodle_exception('ai_preset_error', 'tiny_studiolms');
        }

        $blocks = [];
        foreach ($preset['blocks'] as $block) {
            if (
                !is_array($block) || !isset($block['type'])
                || !in_array($block['type'], $validtypes, true)
            ) {
                continue;
            }
            // See the same comment in parse_block_json() above — sanitized client-side instead.
            $config = isset($block['config']) && is_array($block['config']) ? $block['config'] : [];
            $blocks[] = ['type' => $block['type'], 'config' => $config];
        }

        if (empty($blocks)) {
            throw new \moodle_exception('ai_preset_error', 'tiny_studiolms');
        }

        return [
            'name'   => clean_param($preset['name'], PARAM_TEXT),
            'blocks' => json_encode($blocks),
        ];
    }
}
