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
 * AI chat assistant for tiny_studiolms.
 *
 * @package    tiny_studiolms
 * @copyright  2026 Jean Lúcio
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace tiny_studiolms\ai;

/**
 * Handles multi-turn AI conversations and parses action suggestions from responses.
 *
 * @package    tiny_studiolms
 * @copyright  2026 Jean Lúcio
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class chat {
    /** @var int Maximum messages kept in history per request. */
    public const MAX_HISTORY = 30;

    /**
     * Sends the conversation history to the AI and returns a reply with an optional action.
     *
     * @param array  $messages       Conversation history [{role: user|assistant, content: string}, ...].
     * @param string $presetscontext JSON string listing available preset names for the system prompt.
     * @return array With keys 'reply' (string), 'action' (string|null), 'provider' (string).
     * @throws \moodle_exception If no provider is configured or all calls fail.
     */
    public static function send(array $messages, string $presetscontext): array {
        $limited = array_slice($messages, -self::MAX_HISTORY);
        $systemprompt = self::build_system_prompt($presetscontext);
        $result = generator::call_chat($systemprompt, $limited);
        return self::parse_response($result['data'], $result['provider']);
    }

    /**
     * Builds the system prompt including available presets and block types.
     *
     * @param string $presetscontext JSON-encoded array of preset name strings.
     * @return string
     */
    public static function build_system_prompt(string $presetscontext): string {
        $presetnames = [];
        if (!empty($presetscontext)) {
            $decoded = json_decode($presetscontext, true);
            if (is_array($decoded)) {
                $presetnames = $decoded;
            }
        }

        $prompt = 'You are StudioLMS Assistant, the AI helper embedded in the StudioLMS plugin for Moodle.' . "\n";
        $prompt .= 'StudioLMS was created by Jean Lúcio (jeanlucio@gmail.com).' . "\n";
        $prompt .= 'The plugin lets teachers build rich visual content blocks directly inside the Moodle TinyMCE editor.' . "\n";
        $prompt .= 'Your role is to help teachers create and choose visual content blocks for their courses.' . "\n\n";

        $prompt .= 'DECISION RULES — follow in order:' . "\n";
        $prompt .= '1. If the content is a list of links, URLs, files, or mixed resources (videos, PDFs,' . "\n";
        $prompt .= '   articles, websites) → DO NOT generate yet. Ask the teacher which layout they prefer:' . "\n";
        $prompt .= '   "Grid de cards" (visual grid) or "Webteca" (collapsible resource list).' . "\n";
        $prompt .= '   Use the "action" key only AFTER the teacher answers with their choice.' . "\n";
        $prompt .= '2. If the teacher pastes or describes structured course content (syllabus, activity' . "\n";
        $prompt .= '   list, schedule, objectives, topics, lesson plan, etc.) that is NOT a resource list' . "\n";
        $prompt .= '   → IMMEDIATELY trigger generate_template with that content.' . "\n";
        $prompt .= '   Do NOT ask for confirmation or say you will do it — just do it.' . "\n";
        $prompt .= '3. If the teacher explicitly names or asks for a specific preset → use apply_preset.' . "\n";
        $prompt .= '4. If the teacher asks a general question or the intent is unclear → reply' . "\n";
        $prompt .= '   conversationally and omit the "action" key.' . "\n\n";

        if (!empty($presetnames)) {
            $prompt .= 'Available presets (use apply_preset ONLY when the teacher explicitly requests one):' . "\n";
            foreach ($presetnames as $name) {
                $prompt .= '  - ' . $name . "\n";
            }
            $prompt .= "\n";
        }

        $prompt .= 'Available block types for generate_template (all 18):' . "\n";
        $prompt .= '  Text & layout: stylizedHeading, callout, accordion, actionButton,' . "\n";
        $prompt .= '    advancedCard, webteca, gridcards, table, profileCard' . "\n";
        $prompt .= '  Charts & data: chart (pie/donut), chartBar (horizontal/vertical bars),' . "\n";
        $prompt .= '    gauge (speedometer, 1–3 side-by-side)' . "\n";
        $prompt .= '  Infographics: infographic (stats/metrics), infographicSteps (numbered flow),' . "\n";
        $prompt .= '    infographicFeatures (icon+title+text grid), infographicTimeline (vertical),' . "\n";
        $prompt .= '    infographicComparison (side-by-side columns with checkmarks)' . "\n";
        $prompt .= '  Conceptual: mindmap (radial SVG diagram)' . "\n\n";

        $prompt .= 'Available colour palettes: blue, green, purple, orange, neutral' . "\n\n";

        $prompt .= 'RESPONSE FORMAT — always respond with a JSON object:' . "\n";
        $prompt .= '{"reply": "your explanation in the user\'s language", "action": {...}}' . "\n\n";

        $prompt .= 'Action types:' . "\n";
        $prompt .= '  apply_preset  → {"type": "apply_preset", "preset_name": "exact name from list above"}' . "\n";
        $prompt .= '  generate_template → {' . "\n";
        $prompt .= '    "type": "generate_template",' . "\n";
        $prompt .= '    "name": "descriptive template name",' . "\n";
        $prompt .= '    "contexttext": "IMPORTANT: copy the FULL relevant content the teacher shared verbatim' . "\n";
        $prompt .= '      (syllabus text, activity list, lesson plan, etc.) — this is used to populate the' . "\n";
        $prompt .= '      blocks with real content, NOT a summary or generic placeholder",' . "\n";
        $prompt .= '    "blocks": "comma-separated block types",' . "\n";
        $prompt .= '    "palette": "blue|green|purple|orange|neutral"' . "\n";
        $prompt .= '  }' . "\n\n";

        $prompt .= 'If no action is appropriate (e.g. clarifying question, general conversation),' . "\n";
        $prompt .= 'omit the "action" key entirely.' . "\n\n";

        $prompt .= 'Rules:' . "\n";
        $prompt .= '- Respond ONLY with valid JSON — no markdown, no code fences.' . "\n";
        $prompt .= '- Always match the language of the teacher\'s message.' . "\n";
        $prompt .= '- Default action is generate_template whenever educational content is present.' . "\n";
        $prompt .= '- Never ask the teacher if they want you to generate — just generate.' . "\n";
        $prompt .= '- When using generate_template, the "contexttext" field MUST contain the actual' . "\n";
        $prompt .= '  content provided by the teacher (activities, schedule, topics, objectives, etc.).' . "\n";
        $prompt .= '  Never put generic placeholders — the content will be used to fill the blocks with' . "\n";
        $prompt .= '  real data from what the teacher shared.' . "\n";

        return $prompt;
    }

    /**
     * Parses the raw JSON text from the AI into reply and optional action.
     *
     * Strips markdown code fences if present. Falls back to treating the entire
     * text as a plain reply when JSON decoding fails.
     *
     * @param string $text     Raw text returned by the LLM.
     * @param string $provider Provider label (Gemini, Groq, Custom).
     * @return array With keys 'reply' (string), 'action' (string|null), 'provider' (string).
     */
    private static function parse_response(string $text, string $provider): array {
        $cleaned = trim($text);
        $cleaned = preg_replace('/^\x60{3}(?:json)?\s*/i', '', $cleaned);
        $cleaned = preg_replace('/\s*\x60{3}$/i', '', $cleaned);

        $decoded = json_decode(trim($cleaned), true);

        if (!is_array($decoded) || empty($decoded['reply'])) {
            return [
                'reply'    => trim($text),
                'action'   => null,
                'provider' => $provider,
            ];
        }

        $action = null;
        if (!empty($decoded['action']) && is_array($decoded['action'])) {
            $allowed = ['apply_preset', 'generate_template'];
            $type = $decoded['action']['type'] ?? '';
            if (in_array($type, $allowed, true)) {
                $action = json_encode($decoded['action']);
            }
        }

        return [
            'reply'    => clean_param($decoded['reply'], PARAM_TEXT),
            'action'   => $action,
            'provider' => $provider,
        ];
    }
}
