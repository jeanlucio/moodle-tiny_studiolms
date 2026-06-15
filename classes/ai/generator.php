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
 * Generates StudioLMS block configurations via AI APIs with automatic provider fallback.
 *
 * Provider priority: Gemini → Groq → Custom OpenAI-compatible.
 * User preferences override global admin config for each provider independently.
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
     * Resolves API keys and URLs following the canonical ecosystem ladder, tier by tier:
     *
     *   1. own personal (tiny prefs)
     *   2. hub personal (local_playergames)
     *   3. own site     (tiny config)
     *   4. hub site     (local_playergames)
     *
     * Each tier is resolved as a whole: the first tier that holds any provider key
     * is used exclusively (so an own personal key always wins over a hub key, even
     * for a different provider). core_ai is the institutional default and is
     * consulted by the caller only when no tier holds a key. The hub tiers are
     * skipped when local_playergames is absent; its "openai" provider maps to the
     * custom OpenAI-compatible slot (key/url/model).
     *
     * @return array With keys geminikey, groqkey, customkey, customurl, custommodel.
     */
    private static function resolve_keys(): array {
        $hubinstalled = class_exists(\local_playergames\api_key_helper::class);

        $tiers = [];

        // Tier 1: own personal (tiny user preferences).
        $tiers[] = [
            (string)get_user_preferences('tiny_studiolms_gemini_key', ''),
            (string)get_user_preferences('tiny_studiolms_groq_key', ''),
            (string)get_user_preferences('tiny_studiolms_custom_key', ''),
            (string)get_user_preferences('tiny_studiolms_custom_url', ''),
            (string)get_user_preferences('tiny_studiolms_custom_model', ''),
        ];

        // Tier 2: hub personal.
        if ($hubinstalled) {
            $tiers[] = [
                \local_playergames\api_key_helper::get_personal_key('gemini'),
                \local_playergames\api_key_helper::get_personal_key('groq'),
                \local_playergames\api_key_helper::get_personal_key('openai'),
                \local_playergames\api_key_helper::get_openai_baseurl(),
                \local_playergames\api_key_helper::get_openai_model(),
            ];
        }

        // Tier 3: own site (tiny config).
        $tiers[] = [
            (string)get_config('tiny_studiolms', 'apikey_gemini'),
            (string)get_config('tiny_studiolms', 'apikey_groq'),
            (string)get_config('tiny_studiolms', 'apikey_custom'),
            (string)get_config('tiny_studiolms', 'custom_baseurl'),
            (string)get_config('tiny_studiolms', 'custom_model'),
        ];

        // Tier 4: hub site.
        if ($hubinstalled) {
            $tiers[] = [
                \local_playergames\api_key_helper::get_site_key('gemini'),
                \local_playergames\api_key_helper::get_site_key('groq'),
                \local_playergames\api_key_helper::get_site_key('openai'),
                \local_playergames\api_key_helper::get_openai_baseurl(),
                \local_playergames\api_key_helper::get_openai_model(),
            ];
        }

        // Use the first tier that holds any provider key.
        $geminikey = $groqkey = $customkey = $customurl = $custommodel = '';
        foreach ($tiers as $tier) {
            if ($tier[0] !== '' || $tier[1] !== '' || $tier[2] !== '') {
                [$geminikey, $groqkey, $customkey, $customurl, $custommodel] = $tier;
                break;
            }
        }

        return [
            'geminikey'   => $geminikey,
            'groqkey'     => $groqkey,
            'customkey'   => $customkey,
            'customurl'   => $customurl,
            'custommodel' => $custommodel,
        ];
    }

    /**
     * Tries the configured AI providers following the canonical ladder.
     *
     * The active key level (personal or site, resolved by resolve_keys) is tried
     * first: Gemini → Groq → Custom OpenAI-compatible. Moodle core_ai is the
     * institutional default and is consulted only when no key is configured at any
     * level, so an explicitly set personal or site key always wins.
     *
     * @param string $userprompt  The user-facing prompt text.
     * @param string $sysprompt   The system instruction to send.
     * @param string $errkey      Lang string key used if all providers fail.
     * @return array With keys 'data' (string) and 'provider' (string).
     * @throws \moodle_exception If no provider is configured or all calls fail.
     */
    private static function call_providers(string $userprompt, string $sysprompt, string $errkey): array {
        $keys = self::resolve_keys();

        $nokeys = empty($keys['geminikey']) && empty($keys['groqkey']) && empty($keys['customkey']);
        $result = ['success' => false, 'data' => ''];
        $failures = [];

        if (!empty($keys['geminikey'])) {
            $result = self::call_gemini($userprompt, $keys['geminikey'], $sysprompt);
            if (!$result['success']) {
                $failures[] = 'Gemini: HTTP ' . ($result['httpcode'] ?? '?')
                    . ($result['errmsg'] ? ' — ' . $result['errmsg'] : '');
            }
        }

        if (!$result['success'] && !empty($keys['groqkey'])) {
            $result = self::call_groq($userprompt, $keys['groqkey'], $sysprompt);
            if (!$result['success']) {
                $failures[] = 'Groq: HTTP ' . ($result['httpcode'] ?? '?')
                    . ($result['errmsg'] ? ' — ' . $result['errmsg'] : '');
            }
        }

        if (!$result['success'] && !empty($keys['customkey']) && !empty($keys['customurl'])) {
            $resolvedurl = self::resolve_custom_url((string)$keys['customurl']);
            $result = self::call_openai_compatible(
                $userprompt,
                $keys['customkey'],
                $resolvedurl,
                (string)$keys['custommodel'],
                $sysprompt
            );
            if (!$result['success']) {
                $failures[] = 'Custom: HTTP ' . ($result['httpcode'] ?? '?')
                    . ($result['errmsg'] ? ' — ' . $result['errmsg'] : '');
            }
        }

        // Bottom of the ladder: Moodle core_ai, only when no key is configured.
        if (!$result['success'] && $nokeys && self::has_core_ai_provider()) {
            $result = self::call_core_ai($sysprompt, $userprompt);
        }

        if (!$result['success']) {
            if ($nokeys && empty($failures)) {
                throw new \moodle_exception('ai_generator_no_config', 'tiny_studiolms');
            }
            throw new \moodle_exception($errkey, 'tiny_studiolms', '', null, implode(' | ', $failures));
        }

        return $result;
    }

    /**
     * Generates a block configuration from a plain-text prompt.
     *
     * Tries providers in order: Gemini → Groq → Custom OpenAI-compatible.
     * User preferences override global admin config per provider.
     *
     * @param string $prompt Teacher's content request.
     * @return array With keys 'blocktype' (string), 'config' (JSON string), 'provider' (string).
     * @throws \moodle_exception If no provider is configured or all calls fail.
     */
    public static function generate_block(string $prompt): array {
        $result = self::call_providers($prompt, self::system_prompt(), 'ai_generator_error');
        $block = self::parse_block_json($result['data']);
        $block['provider'] = $result['provider'];
        return $block;
    }

    /**
     * Generates a multi-block layout from a pedagogical context.
     *
     * Tries providers in order: Gemini → Groq → Custom OpenAI-compatible.
     * User preferences override global admin config per provider.
     *
     * @param string $name        Desired layout name.
     * @param string $contexttext Pedagogical context and intent.
     * @param string $blocks      Optional comma-separated block type hints.
     * @param string $palette     Colour palette identifier (blue|green|purple|orange|neutral).
     * @return array With keys 'name' (string), 'blocks' (JSON string), 'provider' (string).
     * @throws \moodle_exception If no provider is configured or all calls fail.
     */
    public static function generate_preset(
        string $name,
        string $contexttext,
        string $blocks,
        string $palette
    ): array {
        $userparts = ['Preset name: ' . $name, 'Pedagogical context: ' . $contexttext];
        if (!empty(trim($blocks))) {
            $userparts[] = 'Preferred block types (use if appropriate): ' . $blocks;
        }
        $userprompt = implode("\n", $userparts);

        $validpalettes = ['blue', 'green', 'purple', 'orange', 'neutral'];
        $safpalette = in_array($palette, $validpalettes, true) ? $palette : 'blue';

        $result = self::call_providers($userprompt, self::preset_system_prompt($safpalette), 'ai_preset_error');
        $preset = self::parse_preset_json($result['data']);
        $preset['provider'] = $result['provider'];
        return $preset;
    }

    /**
     * Generates free-form text from a caller-supplied system prompt and user prompt.
     *
     * Generic entry point that exposes the provider chain (core_ai → Gemini → Groq →
     * Custom OpenAI-compatible) and the personal-first key resolution to other plugins,
     * such as local_studiolms, which build their own prompts and parse the returned
     * content themselves. Unlike the block generators, no schema or language directive
     * is injected here — the caller is responsible for the full system prompt.
     *
     * @param string $systemprompt System instruction text.
     * @param string $userprompt User prompt text.
     * @return string The generated content as returned by the provider.
     * @throws \moodle_exception If no provider is configured or all calls fail.
     */
    public static function generate_text(string $systemprompt, string $userprompt): string {
        $result = self::call_providers($userprompt, $systemprompt, 'ai_generate_text_error');
        return (string)$result['data'];
    }

    /**
     * Calls the Google Gemini API.
     *
     * API key is sent via the x-goog-api-key header instead of the querystring to
     * avoid exposing it in server access logs and HTTP referrer headers.
     *
     * @param string $prompt     User prompt.
     * @param string $key        Gemini API key.
     * @param string $sysprompt  System instruction text.
     * @return array With keys 'success', 'data', 'provider'.
     */
    private static function call_gemini(string $prompt, string $key, string $sysprompt): array {
        $url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent';
        $data = [
            'system_instruction' => ['parts' => [['text' => $sysprompt]]],
            'contents'           => [['parts' => [['text' => $prompt]]]],
            'generationConfig'   => ['responseMimeType' => 'application/json', 'maxOutputTokens' => 2000],
        ];
        return self::curl_request(
            $url,
            json_encode($data),
            ['Content-Type: application/json', 'x-goog-api-key: ' . $key],
            'Gemini'
        );
    }

    /**
     * Calls the Groq API (OpenAI-compatible, fixed endpoint).
     *
     * @param string $prompt     User prompt.
     * @param string $key        Groq API key.
     * @param string $sysprompt  System instruction text.
     * @return array With keys 'success', 'data', 'provider'.
     */
    private static function call_groq(string $prompt, string $key, string $sysprompt): array {
        $url = 'https://api.groq.com/openai/v1/chat/completions';
        $data = [
            'model'           => 'llama-3.3-70b-versatile',
            'messages'        => [
                ['role' => 'system', 'content' => $sysprompt],
                ['role' => 'user', 'content' => $prompt],
            ],
            'response_format' => ['type' => 'json_object'],
            'max_tokens'      => 2000,
            'temperature'     => 0.7,
        ];
        return self::curl_request(
            $url,
            json_encode($data),
            ['Authorization: Bearer ' . $key, 'Content-Type: application/json'],
            'Groq'
        );
    }

    /**
     * Calls a custom OpenAI-compatible endpoint.
     *
     * @param string $prompt     User prompt.
     * @param string $key        API key.
     * @param string $url        Full chat/completions endpoint URL (must be HTTPS, public IP).
     * @param string $model      Model name; empty string uses endpoint default.
     * @param string $sysprompt  System instruction text.
     * @return array With keys 'success', 'data', 'provider'.
     */
    private static function call_openai_compatible(
        string $prompt,
        string $key,
        string $url,
        string $model,
        string $sysprompt
    ): array {
        if (!self::is_safe_url($url)) {
            return ['success' => false, 'data' => '', 'provider' => 'Custom'];
        }
        $data = [
            'model'           => !empty($model) ? $model : 'gpt-4o-mini',
            'messages'        => [
                ['role' => 'system', 'content' => $sysprompt],
                ['role' => 'user', 'content' => $prompt],
            ],
            'response_format' => ['type' => 'json_object'],
            'max_tokens'      => 2000,
            'temperature'     => 0.7,
        ];
        return self::curl_request(
            $url,
            json_encode($data),
            ['Authorization: Bearer ' . $key, 'Content-Type: application/json'],
            'Custom'
        );
    }

    /**
     * Performs the HTTP POST and normalises the response into a common structure.
     *
     * @param string   $url     Full endpoint URL.
     * @param string   $payload JSON request body.
     * @param string[] $headers HTTP headers.
     * @param string   $source  Provider label used in logs and return value.
     * @return array With keys 'success' (bool), 'data' (string), 'provider' (string).
     */
    private static function curl_request(
        string $url,
        string $payload,
        array $headers,
        string $source
    ): array {
        global $CFG;
        require_once($CFG->libdir . '/filelib.php');
        $curl = new \curl();
        $curl->setopt(['CURLOPT_TIMEOUT' => 30]);
        $curl->setHeader($headers);

        $response = $curl->post($url, $payload);
        $info = $curl->get_info();
        $code = isset($info['http_code']) ? (int)$info['http_code'] : 0;

        if ($code < 200 || $code >= 300 || empty($response)) {
            $errmsg = substr((string)$response, 0, 200);
            debugging(
                'StudioLMS AI [' . $source . ']: HTTP ' . $code
                . ' | curl_error: ' . $curl->get_errno()
                . ' | response: ' . $errmsg,
                DEBUG_DEVELOPER
            );
            return ['success' => false, 'data' => '', 'provider' => $source, 'httpcode' => $code, 'errmsg' => $errmsg];
        }

        $decoded = json_decode($response, true);
        if (!is_array($decoded)) {
            $errmsg = 'JSON decode failed: ' . substr($response, 0, 200);
            debugging('StudioLMS AI [' . $source . ']: ' . $errmsg, DEBUG_DEVELOPER);
            return ['success' => false, 'data' => '', 'provider' => $source, 'httpcode' => $code, 'errmsg' => $errmsg];
        }

        if ($source === 'Gemini') {
            $content = $decoded['candidates'][0]['content']['parts'][0]['text'] ?? '';
            if (empty($content)) {
                $blocked = $decoded['candidates'][0]['finishReason'] ?? ($decoded['promptFeedback']['blockReason'] ?? '');
                $errmsg = 'empty content. finishReason/blockReason: ' . $blocked
                    . ' | keys: ' . implode(',', array_keys($decoded));
                debugging('StudioLMS AI [Gemini]: ' . $errmsg, DEBUG_DEVELOPER);
                return [
                    'success' => false, 'data' => '', 'provider' => $source, 'httpcode' => $code, 'errmsg' => $errmsg,
                ];
            }
        } else {
            $content = $decoded['choices'][0]['message']['content'] ?? '';
            if (empty($content)) {
                $errmsg = 'empty content. keys: ' . implode(',', array_keys($decoded));
                debugging('StudioLMS AI [' . $source . ']: ' . $errmsg, DEBUG_DEVELOPER);
                return [
                    'success' => false, 'data' => '', 'provider' => $source, 'httpcode' => $code, 'errmsg' => $errmsg,
                ];
            }
        }

        return ['success' => true, 'data' => $content, 'provider' => $source, 'httpcode' => $code, 'errmsg' => ''];
    }

    /**
     * Returns true only if the URL is safe to use as an external AI endpoint.
     *
     * Enforces HTTPS and blocks loopback, link-local, and RFC-1918 private addresses
     * to prevent Server-Side Request Forgery (SSRF) via teacher-configured endpoints.
     * Resolves all A and AAAA DNS records to guard against DNS rebinding attacks where
     * a public hostname temporarily resolves to an internal IP.
     *
     * @param string $url The URL to validate.
     * @return bool True if safe; false otherwise.
     */
    private static function is_safe_url(string $url): bool {
        $parsed = parse_url($url);
        if (!$parsed || ($parsed['scheme'] ?? '') !== 'https') {
            return false;
        }
        $host = $parsed['host'] ?? '';
        if (empty($host)) {
            return false;
        }
        if (in_array(strtolower($host), ['localhost', '127.0.0.1', '::1'], true)) {
            return false;
        }
        $ip = filter_var($host, FILTER_VALIDATE_IP);
        if ($ip !== false) {
            // Literal IP address in the URL — check directly.
            $ispublic = filter_var(
                $ip,
                FILTER_VALIDATE_IP,
                FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE
            );
            if ($ispublic === false) {
                return false;
            }
        } else {
            // Hostname: resolve all A/AAAA records and re-apply the private/reserved check
            // to prevent DNS rebinding attacks where a public domain resolves to an internal IP.
            $resolvedips = [];
            $arecords = dns_get_record($host, DNS_A);
            if (is_array($arecords)) {
                foreach ($arecords as $r) {
                    if (!empty($r['ip'])) {
                        $resolvedips[] = $r['ip'];
                    }
                }
            }
            $aaaarecords = dns_get_record($host, DNS_AAAA);
            if (is_array($aaaarecords)) {
                foreach ($aaaarecords as $r) {
                    if (!empty($r['ipv6'])) {
                        $resolvedips[] = $r['ipv6'];
                    }
                }
            }
            foreach ($resolvedips as $resolvedip) {
                $ispublic = filter_var(
                    $resolvedip,
                    FILTER_VALIDATE_IP,
                    FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE
                );
                if ($ispublic === false) {
                    return false;
                }
            }
        }
        return true;
    }

    /**
     * Ensures the custom AI URL ends with /chat/completions.
     *
     * Providers that follow the OpenAI-compatible standard always expose this path.
     * Users who supply only a base URL (e.g. https://integrate.api.nvidia.com/v1)
     * get the suffix appended automatically; users who already include it are unaffected.
     *
     * @param string $url The configured endpoint URL.
     * @return string URL guaranteed to end with /chat/completions.
     */
    private static function resolve_custom_url(string $url): string {
        if (!str_ends_with($url, '/chat/completions')) {
            $url = rtrim($url, '/') . '/chat/completions';
        }
        return $url;
    }

    /**
     * Returns true when Moodle core_ai has at least one provider configured for text generation.
     *
     * Compatible with Moodle 4.5 (static API) and 5.x (instance API with DB injection).
     * Uses get_providers_for_actions as the reflection anchor — the same method used in
     * call_core_ai — so staticness detection is consistent across both methods.
     *
     * @return bool
     */
    private static function has_core_ai_provider(): bool {
        global $DB;
        if (
            !class_exists(\core_ai\manager::class)
            || !class_exists(\core_ai\aiactions\generate_text::class)
        ) {
            return false;
        }
        try {
            $actionclass = \core_ai\aiactions\generate_text::class;
            $reflection = new \ReflectionMethod(\core_ai\manager::class, 'get_providers_for_actions');
            if ($reflection->isStatic()) {
                $providers = \core_ai\manager::get_providers_for_actions([$actionclass], true);
            } else {
                $providers = (new \core_ai\manager($DB))->get_providers_for_actions([$actionclass], true);
            }
            return !empty($providers[$actionclass]);
        } catch (\Throwable $e) {
            return false;
        }
    }

    /**
     * Generates text via the Moodle core_ai subsystem.
     *
     * Combines system and user prompt parts into a single string (core_ai accepts only
     * one prompttext field). Compatible with Moodle 4.5 and 5.x via reflection.
     *
     * @param string $sysprompt  System instruction text.
     * @param string $userprompt User-facing prompt text.
     * @return array Result with keys: success (bool), data (string), provider (string).
     */
    private static function call_core_ai(string $sysprompt, string $userprompt): array {
        global $DB, $USER;
        try {
            $fullprompt = trim($sysprompt . "\n\n" . $userprompt);
            $actionclass = \core_ai\aiactions\generate_text::class;
            $reflection = new \ReflectionMethod(\core_ai\manager::class, 'get_providers_for_actions');
            if ($reflection->isStatic()) {
                $manager = new \core_ai\manager();
            } else {
                $manager = new \core_ai\manager($DB);
            }
            $providers = $manager->get_providers_for_actions([$actionclass], true);
            if (empty($providers[$actionclass])) {
                return ['success' => false, 'data' => '', 'provider' => 'Moodle AI'];
            }
            $action = new \core_ai\aiactions\generate_text(
                contextid: \context_system::instance()->id,
                userid: (int) $USER->id,
                prompttext: $fullprompt,
            );
            $response = $manager->process_action($action);
            if (!$response->get_success()) {
                return ['success' => false, 'data' => '', 'provider' => 'Moodle AI'];
            }
            $data = $response->get_response_data();
            $content = (string) ($data['generatedcontent'] ?? '');
            if ($content === '') {
                return ['success' => false, 'data' => '', 'provider' => 'Moodle AI'];
            }
            return ['success' => true, 'data' => $content, 'provider' => 'Moodle AI'];
        } catch (\Throwable $e) {
            return ['success' => false, 'data' => '', 'provider' => 'Moodle AI'];
        }
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
     * @return array With keys 'topic' (string), 'branches' (JSON string), 'provider' (string).
     * @throws \moodle_exception If no provider is configured, all calls fail, or the response is invalid.
     */
    public static function generate_mindmap(string $topic): array {
        $result = self::call_providers($topic, self::mindmap_system_prompt(), 'mindmap_ai_error');

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

    /**
     * Returns the curated FA6 icon list hint shared across all infographic AI prompts.
     *
     * Must stay in sync with ICON_UNICODE in amd/src/blocks/infographic_shared.js.
     *
     * @return string
     */
    private static function icon_list_hint(): string {
        return 'fa-solid fa-users, fa-solid fa-chart-line, fa-solid fa-chart-bar,'
            . ' fa-solid fa-book-open, fa-solid fa-book, fa-solid fa-graduation-cap,'
            . ' fa-solid fa-trophy, fa-solid fa-medal, fa-solid fa-star,'
            . ' fa-solid fa-circle-check, fa-solid fa-clock, fa-solid fa-calendar,'
            . ' fa-solid fa-lightbulb, fa-solid fa-brain, fa-solid fa-bullseye,'
            . ' fa-solid fa-fire, fa-solid fa-heart, fa-solid fa-percent,'
            . ' fa-solid fa-arrow-up, fa-solid fa-globe, fa-solid fa-bolt,'
            . ' fa-solid fa-rocket, fa-solid fa-laptop, fa-solid fa-flask,'
            . ' fa-solid fa-code, fa-solid fa-database, fa-solid fa-user,'
            . ' fa-solid fa-gear, fa-solid fa-key, fa-solid fa-lock,'
            . ' fa-solid fa-envelope, fa-solid fa-flag, fa-solid fa-magnifying-glass,'
            . ' fa-solid fa-play, fa-solid fa-check, fa-solid fa-download,'
            . ' fa-solid fa-upload, fa-solid fa-arrow-right, fa-solid fa-pen,'
            . ' fa-solid fa-file';
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
     * @return array With keys 'title' (string), 'items' (JSON string), 'provider' (string).
     * @throws \moodle_exception If no provider is configured, all calls fail, or response is invalid.
     */
    public static function generate_infographic(string $topic): array {
        $result = self::call_providers($topic, self::infographic_system_prompt(), 'infographic_ai_error');

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
                'icon'  => clean_param((string)($item['icon'] ?? 'fa-solid fa-circle-info'), PARAM_TEXT),
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
     * @return array With keys 'title' (string), 'items' (JSON string), 'provider' (string).
     * @throws \moodle_exception If no provider is configured, all calls fail, or response is invalid.
     */
    public static function generate_infographic_steps(string $topic): array {
        $result = self::call_providers(
            $topic,
            self::infographic_steps_system_prompt(),
            'infographic_steps_ai_error'
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
                'icon'        => clean_param((string)($item['icon'] ?? ''), PARAM_TEXT),
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
     * @return array{title: string, items: string, provider: string}
     */
    public static function generate_infographic_features(string $topic): array {
        $result = self::call_providers(
            $topic,
            self::infographic_features_system_prompt(),
            'infographic_features_ai_error'
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
                'icon'        => clean_param((string)($item['icon'] ?? ''), PARAM_TEXT),
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
     * @return array{title: string, items: string, provider: string}
     * @throws \moodle_exception If no provider is configured, all calls fail, or response is invalid.
     */
    public static function generate_infographic_timeline(string $topic): array {
        $result = self::call_providers(
            $topic,
            self::infographic_timeline_system_prompt(),
            'infographic_timeline_ai_error'
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
     * @return array{title: string, col1: string, col2: string, items: string, provider: string}
     * @throws \moodle_exception If no provider is configured, all calls fail, or response is invalid.
     */
    public static function generate_infographic_comparison(string $topic): array {
        $result = self::call_providers(
            $topic,
            self::infographic_comparison_system_prompt(),
            'infographic_comparison_ai_error'
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
     * @return array With keys 'icon' (string), 'contenthtml' (string), 'provider' (string).
     * @throws \moodle_exception If no provider is configured, all calls fail, or response is invalid.
     */
    public static function generate_callout(string $topic): array {
        $result = self::call_providers($topic, self::callout_system_prompt(), 'callout_ai_error');

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
     * @return array With keys 'content' (string), 'btntext' (string), 'provider' (string).
     * @throws \moodle_exception If no provider is configured, all calls fail, or response is invalid.
     */
    public static function generate_card(string $topic): array {
        $result = self::call_providers($topic, self::card_system_prompt(), 'card_ai_error');

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
     * @return array With keys 'title' (string), 'content' (string), 'provider' (string).
     * @throws \moodle_exception If no provider is configured, all calls fail, or response is invalid.
     */
    public static function generate_accordion(string $topic): array {
        $result = self::call_providers($topic, self::accordion_system_prompt(), 'accordion_ai_error');

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
     * @return array With keys 'title' (string), 'desc' (string), 'resources' (JSON string), 'provider' (string).
     * @throws \moodle_exception If no provider is configured, all calls fail, or response is invalid.
     */
    public static function generate_webteca(string $topic): array {
        $result = self::call_providers($topic, self::webteca_system_prompt(), 'webteca_ai_error');

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
     * Sends a multi-turn conversation to the AI provider chain and returns the raw text reply.
     *
     * Each entry in $messages must have 'role' (user|assistant) and 'content' (string).
     * The caller is responsible for building the system prompt via chat::build_system_prompt().
     *
     * When personal keys are configured:
     *   Gemini (personal) → Groq (personal) → Custom (personal)
     *
     * When only institution keys are available:
     *   core_ai → Gemini (institution) → Groq (institution) → Custom (institution)
     *
     * @param string $systemprompt System instruction sent to all providers.
     * @param array  $messages     Conversation history [{role, content}, ...].
     * @return array With keys 'data' (string) and 'provider' (string).
     * @throws \moodle_exception If no provider is configured or all calls fail.
     */
    public static function call_chat(string $systemprompt, array $messages): array {
        $keys = self::resolve_keys();

        $nokeys = empty($keys['geminikey']) && empty($keys['groqkey']) && empty($keys['customkey']);
        $result = ['success' => false, 'data' => ''];
        $failures = [];

        if (!empty($keys['geminikey'])) {
            $contents = [];
            foreach ($messages as $msg) {
                $role = $msg['role'] === 'assistant' ? 'model' : 'user';
                $contents[] = ['role' => $role, 'parts' => [['text' => $msg['content']]]];
            }
            $url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent';
            $data = [
                'system_instruction' => ['parts' => [['text' => $systemprompt]]],
                'contents'           => $contents,
                'generationConfig'   => [
                    'responseMimeType' => 'application/json',
                    'maxOutputTokens'  => 1500,
                ],
            ];
            $result = self::curl_request(
                $url,
                json_encode($data),
                ['Content-Type: application/json', 'x-goog-api-key: ' . $keys['geminikey']],
                'Gemini'
            );
            if (!$result['success']) {
                $failures[] = 'Gemini: HTTP ' . ($result['httpcode'] ?? '?')
                    . ($result['errmsg'] ? ' — ' . $result['errmsg'] : '');
            }
        }

        if (!$result['success'] && !empty($keys['groqkey'])) {
            $msgs = [['role' => 'system', 'content' => $systemprompt]];
            foreach ($messages as $msg) {
                $msgs[] = ['role' => $msg['role'], 'content' => $msg['content']];
            }
            $data = [
                'model'           => 'llama-3.3-70b-versatile',
                'messages'        => $msgs,
                'response_format' => ['type' => 'json_object'],
                'max_tokens'      => 1500,
                'temperature'     => 0.7,
            ];
            $result = self::curl_request(
                'https://api.groq.com/openai/v1/chat/completions',
                json_encode($data),
                ['Authorization: Bearer ' . $keys['groqkey'], 'Content-Type: application/json'],
                'Groq'
            );
            if (!$result['success']) {
                $failures[] = 'Groq: HTTP ' . ($result['httpcode'] ?? '?')
                    . ($result['errmsg'] ? ' — ' . $result['errmsg'] : '');
            }
        }

        if (!$result['success'] && !empty($keys['customkey']) && !empty($keys['customurl'])) {
            $resolvedurl = self::resolve_custom_url((string)$keys['customurl']);
            if (self::is_safe_url($resolvedurl)) {
                $msgs = [['role' => 'system', 'content' => $systemprompt]];
                foreach ($messages as $msg) {
                    $msgs[] = ['role' => $msg['role'], 'content' => $msg['content']];
                }
                $model = !empty($keys['custommodel']) ? (string)$keys['custommodel'] : 'gpt-4o-mini';
                $data = [
                    'model'           => $model,
                    'messages'        => $msgs,
                    'response_format' => ['type' => 'json_object'],
                    'max_tokens'      => 1500,
                    'temperature'     => 0.7,
                ];
                $result = self::curl_request(
                    $resolvedurl,
                    json_encode($data),
                    ['Authorization: Bearer ' . $keys['customkey'], 'Content-Type: application/json'],
                    'Custom'
                );
                if (!$result['success']) {
                    $failures[] = 'Custom: HTTP ' . ($result['httpcode'] ?? '?')
                        . ($result['errmsg'] ? ' — ' . $result['errmsg'] : '');
                }
            } else {
                $failures[] = 'Custom: unsafe URL';
            }
        }

        // Bottom of the ladder: Moodle core_ai, only when no key is configured.
        // core_ai has no native multi-turn API, so the history is flattened.
        if (!$result['success'] && $nokeys && self::has_core_ai_provider()) {
            $chatlines = [];
            foreach ($messages as $msg) {
                $role = $msg['role'] === 'assistant' ? 'Assistant' : 'User';
                $chatlines[] = $role . ': ' . $msg['content'];
            }
            $result = self::call_core_ai($systemprompt, implode("\n", $chatlines));
        }

        if (!$result['success']) {
            if ($nokeys && empty($failures)) {
                throw new \moodle_exception('ai_generator_no_config', 'tiny_studiolms');
            }
            throw new \moodle_exception('ai_chat_error', 'tiny_studiolms', '', null, implode(' | ', $failures));
        }

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
