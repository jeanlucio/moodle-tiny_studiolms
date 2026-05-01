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
     * Tries providers in order: Gemini → Groq → Custom OpenAI-compatible.
     * User preferences override global admin config per provider.
     *
     * @param string $prompt Teacher's content request.
     * @return array With keys 'blocktype' (string), 'config' (JSON string), 'provider' (string).
     * @throws \moodle_exception If no provider is configured or all calls fail.
     */
    public static function generate_block(string $prompt): array {
        $geminikey = get_user_preferences('tiny_studiolms_gemini_key', '')
            ?: get_config('tiny_studiolms', 'apikey_gemini');
        $groqkey = get_user_preferences('tiny_studiolms_groq_key', '')
            ?: get_config('tiny_studiolms', 'apikey_groq');
        $customkey = get_user_preferences('tiny_studiolms_custom_key', '')
            ?: get_config('tiny_studiolms', 'apikey_custom');
        $customurl = get_user_preferences('tiny_studiolms_custom_url', '')
            ?: get_config('tiny_studiolms', 'custom_baseurl');
        $custommodel = get_user_preferences('tiny_studiolms_custom_model', '')
            ?: get_config('tiny_studiolms', 'custom_model');

        if (empty($geminikey) && empty($groqkey) && empty($customkey)) {
            throw new \moodle_exception('ai_generator_no_config', 'tiny_studiolms');
        }

        $result = ['success' => false, 'data' => ''];
        $failures = [];

        if (!empty($geminikey)) {
            $result = self::call_gemini($prompt, $geminikey);
            if (!$result['success']) {
                $failures[] = 'Gemini: HTTP ' . ($result['httpcode'] ?? '?')
                    . ($result['errmsg'] ? ' — ' . $result['errmsg'] : '');
            }
        }

        if (!$result['success'] && !empty($groqkey)) {
            $result = self::call_groq($prompt, $groqkey);
            if (!$result['success']) {
                $failures[] = 'Groq: HTTP ' . ($result['httpcode'] ?? '?')
                    . ($result['errmsg'] ? ' — ' . $result['errmsg'] : '');
            }
        }

        if (!$result['success'] && !empty($customkey) && !empty($customurl)) {
            $result = self::call_openai_compatible($prompt, $customkey, $customurl, (string)$custommodel);
            if (!$result['success']) {
                $failures[] = 'Custom: HTTP ' . ($result['httpcode'] ?? '?')
                    . ($result['errmsg'] ? ' — ' . $result['errmsg'] : '');
            }
        }

        if (!$result['success']) {
            $debuginfo = implode(' | ', $failures);
            throw new \moodle_exception('ai_generator_error', 'tiny_studiolms', '', null, $debuginfo);
        }

        $block = self::parse_block_json($result['data']);
        $block['provider'] = $result['provider'];

        return $block;
    }

    /**
     * Calls the Google Gemini API.
     *
     * @param string $prompt User prompt.
     * @param string $key    Gemini API key.
     * @return array With keys 'success', 'data', 'provider'.
     */
    private static function call_gemini(string $prompt, string $key): array {
        $url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=' . $key;
        $systemprompt = self::system_prompt();
        $data = [
            'system_instruction' => ['parts' => [['text' => $systemprompt]]],
            'contents' => [['parts' => [['text' => $prompt]]]],
            'generationConfig' => ['responseMimeType' => 'application/json', 'maxOutputTokens' => 1000],
        ];
        return self::curl_request($url, json_encode($data), ['Content-Type: application/json'], 'Gemini');
    }

    /**
     * Calls the Groq API (OpenAI-compatible, fixed endpoint).
     *
     * @param string $prompt User prompt.
     * @param string $key    Groq API key.
     * @return array With keys 'success', 'data', 'provider'.
     */
    private static function call_groq(string $prompt, string $key): array {
        $url = 'https://api.groq.com/openai/v1/chat/completions';
        $data = [
            'model'           => 'llama-3.3-70b-versatile',
            'messages'        => [
                ['role' => 'system', 'content' => self::system_prompt()],
                ['role' => 'user', 'content' => $prompt],
            ],
            'response_format' => ['type' => 'json_object'],
            'max_tokens'      => 1000,
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
     * @param string $prompt User prompt.
     * @param string $key    API key.
     * @param string $url    Full chat/completions endpoint URL (must be HTTPS, public IP).
     * @param string $model  Model name; empty string uses endpoint default.
     * @return array With keys 'success', 'data', 'provider'.
     */
    private static function call_openai_compatible(
        string $prompt,
        string $key,
        string $url,
        string $model
    ): array {
        if (!self::is_safe_url($url)) {
            return ['success' => false, 'data' => '', 'provider' => 'Custom'];
        }
        $data = [
            'model'           => !empty($model) ? $model : 'gpt-4o-mini',
            'messages'        => [
                ['role' => 'system', 'content' => self::system_prompt()],
                ['role' => 'user', 'content' => $prompt],
            ],
            'response_format' => ['type' => 'json_object'],
            'max_tokens'      => 1000,
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
     * Validates that a URL is safe to call: HTTPS only, public IP, no private/localhost ranges.
     *
     * @param string $url URL to validate.
     * @return bool
     */
    private static function is_safe_url(string $url): bool {
        $parsed = parse_url($url);
        if (!$parsed || ($parsed['scheme'] ?? '') !== 'https') {
            return false;
        }
        $host = strtolower($parsed['host'] ?? '');
        if (in_array($host, ['localhost', '127.0.0.1', '::1'], true)) {
            return false;
        }
        $ip = gethostbyname($host);
        if ($ip !== false) {
            $ispublic = filter_var(
                $ip,
                FILTER_VALIDATE_IP,
                FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE
            );
            if ($ispublic === false) {
                return false;
            }
        }
        return true;
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
