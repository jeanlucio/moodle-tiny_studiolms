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
 * Generates StudioLMS block configurations via a configured LLM API.
 *
 * @package    tiny_studiolms
 * @copyright  2026 Jean Lúcio
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class generator {

    /**
     * Returns the system prompt describing supported block types and their config schemas.
     *
     * @return string
     */
    private static function system_prompt(): string {
        $prompt = 'You are a Moodle LMS content creation assistant. Your task is to generate';
        $prompt .= ' StudioLMS block configurations based on the teacher\'s request.' . "\n\n";
        $prompt .= 'Respond ONLY with a valid JSON object — no markdown, no code fences, no explanation.' . "\n\n";
        $prompt .= 'Schema: {"blocktype": "TYPE", "config": {BLOCK_CONFIG_OBJECT}}' . "\n\n";
        $prompt .= 'Available block types:' . "\n\n";

        $prompt .= '1. callout — A highlighted notice box with a colored left border.' . "\n";
        $prompt .= '   config keys:' . "\n";
        $prompt .= '   - icon: string (one emoji, e.g. "💡", "⚠️", "✅", "📌")' . "\n";
        $prompt .= '   - backgroundColor: string (hex, e.g. "#fef9c3")' . "\n";
        $prompt .= '   - textColor: string (hex, e.g. "#854d0e")' . "\n";
        $prompt .= '   - borderColor: string (hex, e.g. "#eab308")' . "\n";
        $prompt .= '   - borderLeftWidth: number (2 to 8)' . "\n";
        $prompt .= '   - borderRadius: number (0 to 16)' . "\n";
        $prompt .= '   - contentHtml: string (HTML; use <p>, <strong>, <ul>, <li>)' . "\n\n";

        $prompt .= '2. accordion — A collapsible content section.' . "\n";
        $prompt .= '   config keys:' . "\n";
        $prompt .= '   - title: string (topic title, plain text)' . "\n";
        $prompt .= '   - color: string (hex for header background, e.g. "#3b82f6")' . "\n";
        $prompt .= '   - bg: string (hex for body background, e.g. "#ffffff")' . "\n";
        $prompt .= '   - icon: string (one emoji for toggle indicator)' . "\n";
        $prompt .= '   - state: "open" or "closed"' . "\n";
        $prompt .= '   - content: string (HTML; use <p>, <ul>, <li>, <strong>)' . "\n\n";

        $prompt .= '3. actionButton — A styled call-to-action button.' . "\n";
        $prompt .= '   config keys:' . "\n";
        $prompt .= '   - btnText: string (button label, keep short)' . "\n";
        $prompt .= '   - btnUrl: string (URL; use "#" if not specified)' . "\n";
        $prompt .= '   - btnBg: string (hex background color)' . "\n";
        $prompt .= '   - btnTextCol: string (hex text color)' . "\n";
        $prompt .= '   - radius: number (0 to 50, border-radius in px)' . "\n";
        $prompt .= '   - align: "left", "center", "right", or "full"' . "\n\n";

        $prompt .= '4. advancedCard — A rich content card with optional button.' . "\n";
        $prompt .= '   config keys:' . "\n";
        $prompt .= '   - bg: string (hex background)' . "\n";
        $prompt .= '   - text: string (hex text color)' . "\n";
        $prompt .= '   - border: string (hex accent border color)' . "\n";
        $prompt .= '   - radius: number (4 to 20)' . "\n";
        $prompt .= '   - shadow: "none", "sm", "md", or "lg"' . "\n";
        $prompt .= '   - content: string (HTML; use <h4>, <p>, <ul>, <li>)' . "\n";
        $prompt .= '   - btnText: string (button label; use "" for no button)' . "\n";
        $prompt .= '   - btnUrl: string (URL; use "#" if not specified)' . "\n\n";

        $prompt .= '5. stylizedHeading — A styled section heading with emoji icon.' . "\n";
        $prompt .= '   config keys:' . "\n";
        $prompt .= '   - text: string (heading text, plain text)' . "\n";
        $prompt .= '   - level: "h3" or "h4"' . "\n";
        $prompt .= '   - icon: string (one emoji)' . "\n";
        $prompt .= '   - bgColor: string (hex background for the heading band)' . "\n";
        $prompt .= '   - textColor: string (hex text color)' . "\n\n";

        $prompt .= 'Choose the most appropriate block type for the request. Respond ONLY with JSON.';

        return $prompt;
    }

    /**
     * Generates a block configuration from a plain-text prompt.
     *
     * @param string $prompt Teacher's content request.
     * @return array Associative array with keys 'blocktype' (string) and 'config' (JSON string).
     * @throws \moodle_exception If AI is not configured or the API call fails.
     */
    public static function generate_block(string $prompt): array {
        $provider = get_config('tiny_studiolms', 'ai_provider');
        $apikey   = get_config('tiny_studiolms', 'ai_apikey');
        $model    = get_config('tiny_studiolms', 'ai_model') ?: '';

        if (empty($provider) || empty($apikey)) {
            throw new \moodle_exception('ai_generator_no_config', 'tiny_studiolms');
        }

        if ($provider === 'anthropic') {
            return self::call_anthropic($prompt, $apikey, $model);
        }

        return self::call_openai_compatible($provider, $prompt, $apikey, $model);
    }

    /**
     * Calls an OpenAI-compatible endpoint (OpenAI or Groq).
     *
     * @param string $provider Either 'openai' or 'groq'.
     * @param string $prompt   User prompt.
     * @param string $apikey   API key.
     * @param string $model    Model name; empty string for provider default.
     * @return array
     * @throws \moodle_exception
     */
    private static function call_openai_compatible(
        string $provider,
        string $prompt,
        string $apikey,
        string $model
    ): array {
        $baseurl = $provider === 'groq'
            ? 'https://api.groq.com/openai/v1'
            : 'https://api.openai.com/v1';

        if (empty($model)) {
            $model = $provider === 'groq' ? 'llama-3.1-8b-instant' : 'gpt-4o-mini';
        }

        $payload = [
            'model'           => $model,
            'messages'        => [
                ['role' => 'system', 'content' => self::system_prompt()],
                ['role' => 'user', 'content' => $prompt],
            ],
            'response_format' => ['type' => 'json_object'],
            'max_tokens'      => 1000,
            'temperature'     => 0.7,
        ];

        $curl = new \curl();
        $curl->setopt(['CURLOPT_TIMEOUT' => 30]);
        $curl->setHeader([
            'Authorization: Bearer ' . $apikey,
            'Content-Type: application/json',
        ]);

        $response = $curl->post($baseurl . '/chat/completions', json_encode($payload));

        return self::parse_openai_response($response);
    }

    /**
     * Calls the Anthropic Messages API.
     *
     * @param string $prompt  User prompt.
     * @param string $apikey  Anthropic API key.
     * @param string $model   Model name; empty string for default.
     * @return array
     * @throws \moodle_exception
     */
    private static function call_anthropic(string $prompt, string $apikey, string $model): array {
        if (empty($model)) {
            $model = 'claude-haiku-4-5-20251001';
        }

        $payload = [
            'model'      => $model,
            'max_tokens' => 1000,
            'system'     => self::system_prompt(),
            'messages'   => [
                ['role' => 'user', 'content' => $prompt],
            ],
        ];

        $curl = new \curl();
        $curl->setopt(['CURLOPT_TIMEOUT' => 30]);
        $curl->setHeader([
            'x-api-key: ' . $apikey,
            'anthropic-version: 2023-06-01',
            'Content-Type: application/json',
        ]);

        $response = $curl->post('https://api.anthropic.com/v1/messages', json_encode($payload));

        return self::parse_anthropic_response($response);
    }

    /**
     * Extracts the text content from an OpenAI-compatible chat completions response.
     *
     * @param string $response Raw JSON response body.
     * @return array
     * @throws \moodle_exception
     */
    private static function parse_openai_response(string $response): array {
        $data = json_decode($response, true);

        if (!is_array($data) || !isset($data['choices'][0]['message']['content'])) {
            throw new \moodle_exception('ai_generator_error', 'tiny_studiolms');
        }

        return self::parse_block_json($data['choices'][0]['message']['content']);
    }

    /**
     * Extracts the text content from an Anthropic Messages response.
     *
     * @param string $response Raw JSON response body.
     * @return array
     * @throws \moodle_exception
     */
    private static function parse_anthropic_response(string $response): array {
        $data = json_decode($response, true);

        if (!is_array($data) || !isset($data['content'][0]['text'])) {
            throw new \moodle_exception('ai_generator_error', 'tiny_studiolms');
        }

        return self::parse_block_json($data['content'][0]['text']);
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

        // Strip markdown code fences that some models add despite instructions.
        $content = preg_replace('/^```(?:json)?\s*/i', '', $content);
        $content = preg_replace('/\s*```$/i', '', $content);

        $block = json_decode(trim($content), true);

        $validtypes = ['callout', 'accordion', 'actionButton', 'advancedCard', 'stylizedHeading'];

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
}
