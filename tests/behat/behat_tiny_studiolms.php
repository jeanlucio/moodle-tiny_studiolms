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

// phpcs:disable moodle.Files.RequireLogin.Missing

/**
 * Custom Behat step definitions for the StudioLMS TinyMCE plugin.
 *
 * @package    tiny_studiolms
 * @category   test
 * @copyright  2026 Jean Lúcio
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class behat_tiny_studiolms extends behat_base {
    /**
     * Opens the StudioLMS dialog by clicking the toolbar button.
     *
     * The toolbar button has aria-label equal to the `button_tooltip` lang string
     * ("StudioLMS"). Uses behat_general::i_click_on with spin retry, so
     * it waits for TinyMCE to finish initialising before clicking.
     *
     * @When I open the StudioLMS dialog
     */
    public function i_open_the_studiolms_dialog(): void {
        $this->execute('behat_general::i_click_on', [
            '[aria-label="StudioLMS"]',
            'css_element',
        ]);

        $this->execute('behat_general::should_exist', [
            '#studiolms-app',
            'css_element',
        ]);
    }

    /**
     * Clicks a StudioLMS tab button by its data-slms-tab attribute value.
     *
     * Uses a spin loop: clicks via Selenium and immediately verifies the tab
     * is active. This ensures the click lands after setupTabs() has attached
     * its event listeners (which run inside a setTimeout in app.js).
     *
     * Tab values: components, global, mine, favourites, ai-block, ai-model.
     *
     * @When I click on the StudioLMS :tab tab
     * @param string $tab The data-slms-tab attribute value.
     */
    public function i_click_on_studiolms_tab(string $tab): void {
        $this->spin(function () use ($tab) {
            $this->execute('behat_general::i_click_on', [
                '[data-slms-tab="' . $tab . '"]',
                'css_element',
            ]);

            $nodes = $this->getSession()->getPage()->findAll(
                'css',
                '[data-slms-tab="' . $tab . '"].active'
            );

            if (empty($nodes)) {
                throw new \Behat\Mink\Exception\ExpectationException(
                    "StudioLMS tab '{$tab}' is not active after click.",
                    $this->getSession()
                );
            }

            return true;
        });
    }

    /**
     * Asserts that the StudioLMS dialog is present in the DOM.
     *
     * @Then the StudioLMS dialog is open
     */
    public function the_studiolms_dialog_is_open(): void {
        $this->execute('behat_general::should_exist', [
            '#studiolms-app',
            'css_element',
        ]);
    }

    /**
     * Asserts that a specific CSS element exists inside the StudioLMS dialog.
     *
     * @Then the StudioLMS dialog contains the :selector element
     * @param string $selector CSS selector relative to #studiolms-app.
     */
    public function studiolms_dialog_contains_element(string $selector): void {
        $this->execute('behat_general::should_exist', [
            '#studiolms-app ' . $selector,
            'css_element',
        ]);
    }

    /**
     * Asserts that the StudioLMS tab with the given data-slms-tab value is active.
     *
     * @Then the StudioLMS :tab tab is active
     * @param string $tab The data-slms-tab attribute value.
     */
    public function studiolms_tab_is_active(string $tab): void {
        $this->spin(function () use ($tab) {
            $nodes = $this->getSession()->getPage()->findAll(
                'css',
                '[data-slms-tab="' . $tab . '"].active'
            );

            if (empty($nodes)) {
                throw new \Behat\Mink\Exception\ExpectationException(
                    "StudioLMS tab '{$tab}' is not active.",
                    $this->getSession()
                );
            }

            return true;
        });
    }

    /**
     * Asserts that the StudioLMS toolbar button is present in the TinyMCE toolbar.
     *
     * @Then the StudioLMS toolbar button is visible
     */
    public function studiolms_toolbar_button_is_visible(): void {
        $this->execute('behat_general::should_exist', [
            '[aria-label="StudioLMS"]',
            'css_element',
        ]);
    }

    /**
     * Asserts that no markup restored from a block's own state (e.g. typed into a design popup
     * field) executed as script, and that no raw tag from it survived into the canvas preview.
     *
     * Regression test for the data-slms-state XSS: that attribute is decoded outside of
     * TinyMCE's own HTML filter, so every block field must be sanitized/escaped before it
     * reaches a template's triple-mustache/innerHTML sink. Uses a spin because the preview
     * re-render triggered by the field's input listener is asynchronous.
     *
     * @Then the StudioLMS canvas preview does not execute injected markup
     */
    public function studiolms_canvas_preview_is_sanitized(): void {
        $session = $this->getSession();

        $this->spin(function () use ($session) {
            $fired = $session->evaluateScript('return window.__slmsXssFired === true;');
            if ($fired) {
                throw new \Behat\Mink\Exception\ExpectationException(
                    'Injected markup executed inside the StudioLMS canvas preview.',
                    $session
                );
            }

            // Mink only auto-prefixes "return " when the script does not already start with it,
            // so a multi-statement script (needing its own "var") must be wrapped in an IIFE.
            $html = $session->evaluateScript(
                'return (function () {' .
                'var el = document.querySelector(".slms-canvas-block-preview");' .
                'return el ? el.innerHTML : "";' .
                '})();'
            );
            if (strpos($html, '<img') !== false) {
                throw new \Behat\Mink\Exception\ExpectationException(
                    'Raw <img> markup survived into the StudioLMS canvas preview.',
                    $session
                );
            }

            return true;
        });
    }

    /**
     * Asserts that a stored template's own content did not execute script when loaded into the
     * canvas. Unlike the state-restore regression test above, a template's rich-text field may
     * legitimately still contain a sanitized <img> tag afterward (TinyMCE's schema strips the
     * event handler attribute, not the element itself) — this only checks the handler could not
     * fire, not that no tag survived.
     *
     * Regression test for the global-template XSS: save_template/import_templates never went
     * through TinyMCE's own typing-time filtering, so a rich-text field recovered from stored
     * template HTML must be re-sanitized before it reaches a render sink.
     *
     * @Then the StudioLMS canvas preview did not execute the template's payload
     */
    public function studiolms_canvas_preview_did_not_execute_template_payload(): void {
        $session = $this->getSession();

        // An absence can only be asserted once there is something to be absent from: wait for the
        // template's block to render first.
        $this->spin(function () use ($session) {
            if (!$session->evaluateScript('return !!document.querySelector(".slms-canvas-block-preview");')) {
                throw new \Behat\Mink\Exception\ExpectationException('No StudioLMS canvas preview yet.', $session);
            }
            return true;
        });

        // Payloads such as <img onerror> fire asynchronously, once the image request fails (about 60 ms
        // after render when measured against a live site), so a single immediate check could pass before
        // the handler ever ran. A fixed one-second window is the only way to assert something did not happen.
        $session->wait(1000);

        if ($session->evaluateScript('return window.__slmsXssFired === true;')) {
            throw new \Behat\Mink\Exception\ExpectationException(
                'The template payload executed inside the StudioLMS canvas preview.',
                $session
            );
        }
    }

    /**
     * Asserts that no link or SVG animation in the canvas previews can still run script once clicked
     * or reached by keyboard, and that the action button's target fell back to a known value, while
     * an ordinary https link in the same template survives (so the check saw real content).
     *
     * Regression test for the URL-scheme bypass: sanitizeUntrustedHtml() used to test a raw
     * /^\s*javascript:/ pattern on the entity-decoded value, which a tab inside the scheme
     * (java&#x09;script:) or a leading control character slips past, and never looked at SVG
     * xlink:href or <set>/<animate>, which can rewrite href after sanitization. A URL field saved in
     * data-slms-state (the button's btnUrl) is plain text that no HTML sanitizer inspects, and the
     * preview's pointer-events: none never kept its links out of the keyboard tab order.
     *
     * @Then the StudioLMS canvas preview keeps only safe link URLs
     */
    public function studiolms_canvas_preview_keeps_only_safe_link_urls(): void {
        $session = $this->getSession();

        $this->spin(function () use ($session) {
            $result = $session->evaluateScript(
                'return (function () {' .
                'var root = document.getElementById("slms-canvas-blocks");' .
                'if (!root || root.querySelectorAll(".slms-canvas-block-preview").length < 2) { return "missing"; }' .
                'if (root.querySelector("set, animate, animateTransform, animateMotion")) { return "animation"; }' .
                'if (root.querySelector(".slms-canvas-block-preview a[href]:not([tabindex=\'-1\'])")) {' .
                'return "focusable-link"; }' .
                'var button = root.querySelector(".slms-canvas-block-preview a.studiolms-btn");' .
                'if (!button || button.getAttribute("target") !== "_blank") { return "bad-target"; }' .
                'var bad = Array.prototype.some.call(root.querySelectorAll("*"), function (el) {' .
                'return Array.prototype.some.call(el.attributes, function (a) {' .
                'if (["href", "xlink:href", "src"].indexOf(a.name) === -1) { return false; }' .
                'var v = a.value.replace(/[\\u0000-\\u0020]/g, "").toLowerCase();' .
                'return /^[a-z][a-z0-9+.-]*:/.test(v) && !/^(https?|mailto|tel):/.test(v);' .
                '});' .
                '});' .
                'if (bad) { return "unsafe-url"; }' .
                'return root.querySelector("a[href=\'https://moodle.org/\']") ? "ok" : "no-safe-link";' .
                '})();'
            );
            if ($result !== 'ok') {
                throw new \Behat\Mink\Exception\ExpectationException(
                    'StudioLMS canvas preview URL check failed: ' . $result,
                    $session
                );
            }

            return true;
        });
    }

    /**
     * Asserts that the StudioLMS toolbar button is NOT present in the TinyMCE toolbar.
     *
     * @Then the StudioLMS toolbar button is not visible
     */
    public function studiolms_toolbar_button_is_not_visible(): void {
        $this->execute('behat_general::should_not_exist', [
            '[aria-label="StudioLMS"]',
            'css_element',
        ]);
    }

    /**
     * Inserts a global template whose callout content carries a script-executing payload,
     * mirroring how a direct save_template/import_templates call (bypassing TinyMCE's own
     * typing-time filtering entirely) could produce one.
     *
     * Regression test for the global-template XSS: the payload sets window.__slmsXssFired,
     * checked by "the StudioLMS canvas preview does not execute injected markup" (shared with
     * the data-slms-state XSS regression test).
     *
     * @Given a malicious global StudioLMS template exists
     */
    public function a_malicious_global_studiolms_template_exists(): void {
        global $DB;

        $admin = get_admin();
        $content = '<div class="studiolms-callout-wrap mceNonEditable" data-slms-hover="none" '
            . 'data-slms-block-type="callout" data-slms-state="">'
            . '<div class="slms-callout-icon" aria-hidden="true">⚠️</div>'
            . '<div class="slms-callout-content mceEditable">'
            . '<img src="x" onerror="window.__slmsXssFired = true">Aviso</div></div>';

        $now = time();
        $DB->insert_record('tiny_studiolms_templates', (object) [
            'name'         => 'Malicious Global Template',
            'content'      => $content,
            'userid'       => $admin->id,
            'usermodified' => $admin->id,
            'isglobal'     => 1,
            'timecreated'  => $now,
            'timemodified' => $now,
        ]);
    }

    /**
     * Inserts a global template whose block carries the script-executing payload only inside
     * data-slms-state (not in the visible child markup), and whose visible markup deliberately
     * has no .slms-callout-content child for extractDOM to read instead.
     *
     * Regression test for the excludeFromState XSS: StateManager.restore() must reset a rich-text
     * field (declared in the block's excludeFromState) back to its default, never keep whatever
     * the untrusted state blob carried, regardless of whether extractDOM finds a matching DOM
     * child to overwrite it with. The state encoding mirrors StateManager.encode()/decode() in
     * amd/src/app.js: JSON, then percent-encoding (encodeURIComponent), then base64 (btoa).
     *
     * @Given a malicious global StudioLMS template with a state-only payload exists
     */
    public function a_malicious_global_studiolms_template_with_state_only_payload_exists(): void {
        global $DB;

        $admin = get_admin();
        $payload = ['contentHtml' => '<img src=x onerror="window.__slmsXssFired = true">'];
        $state = base64_encode(rawurlencode(json_encode($payload)));

        $content = '<div class="studiolms-callout-wrap mceNonEditable" data-slms-hover="none" '
            . 'data-slms-block-type="callout" data-slms-state="' . $state . '">'
            . '<p>No .slms-callout-content child here on purpose.</p></div>';

        $now = time();
        $DB->insert_record('tiny_studiolms_templates', (object) [
            'name'         => 'Malicious State-Only Template',
            'content'      => $content,
            'userid'       => $admin->id,
            'usermodified' => $admin->id,
            'isglobal'     => 1,
            'timecreated'  => $now,
            'timemodified' => $now,
        ]);
    }

    /**
     * Inserts a global template whose callout content carries an animation-triggered handler
     * instead of an <img onerror>, on tags (<p>) that TinyMCE's own schema would keep intact.
     *
     * Regression test for the fake-sanitizer XSS: sanitizeUntrustedHtml() (htmlsanitizer.js) must
     * strip on* attributes itself rather than relying on the editor's serializer.serialize(), which
     * keeps event handler attributes on <p>/<i> under Moodle's default xss_sanitization:false +
     * p[*]/i[*] wildcard schema. Uses onanimationstart (no click needed) exactly like the real
     * finding's proof of concept, so the payload fires as soon as the element renders if the
     * attribute survives.
     *
     * @Given a malicious global StudioLMS template with an animation-triggered payload exists
     */
    public function a_malicious_global_studiolms_template_with_animation_payload_exists(): void {
        global $DB;

        $admin = get_admin();
        $content = '<div class="studiolms-callout-wrap mceNonEditable" data-slms-hover="none" '
            . 'data-slms-block-type="callout" data-slms-state="">'
            . '<div class="slms-callout-icon" aria-hidden="true">⚠️</div>'
            . '<div class="slms-callout-content mceEditable">'
            . '<p style="animation:spin 1s" onanimationstart="window.__slmsXssFired = true">Aviso</p>'
            . '</div></div>';

        $now = time();
        $DB->insert_record('tiny_studiolms_templates', (object) [
            'name'         => 'Malicious Animation Payload Template',
            'content'      => $content,
            'userid'       => $admin->id,
            'usermodified' => $admin->id,
            'isglobal'     => 1,
            'timecreated'  => $now,
            'timemodified' => $now,
        ]);
    }

    /**
     * Inserts a global template whose callout content hides script URLs behind every obfuscation the
     * old sanitizer missed, next to one legitimate https link, followed by an action button whose
     * saved state carries a script URL and an unknown link target.
     *
     * @Given a malicious global StudioLMS template with obfuscated script URLs exists
     */
    public function a_malicious_global_studiolms_template_with_obfuscated_urls_exists(): void {
        global $DB;

        $admin = get_admin();
        $content = '<div class="studiolms-callout-wrap mceNonEditable" data-slms-hover="none" '
            . 'data-slms-block-type="callout" data-slms-state="">'
            . '<div class="slms-callout-icon" aria-hidden="true">⚠️</div>'
            . '<div class="slms-callout-content mceEditable">'
            . '<p><a href="https://moodle.org/">Moodle</a> '
            . '<a href="java&#x09;script:window.__slmsXssFired = true">Tab</a> '
            . '<a href="&#x01;javascript:window.__slmsXssFired = true">Control</a></p>'
            . '<svg><a xlink:href="javascript:window.__slmsXssFired = true"><text y="20">Xlink</text></a>'
            . '<a href="#"><set attributeName="href" to="javascript:window.__slmsXssFired = true"/>'
            . '<text y="40">Set</text></a></svg>'
            . '</div></div>';
        // A plain-text URL field travels inside data-slms-state, where no HTML sanitizer can see it.
        $state = base64_encode(rawurlencode(json_encode([
            'btnText' => 'Button',
            'btnUrl' => 'javascript:window.__slmsXssFired = true',
            'target' => 'evilframe',
        ])));
        $content .= '<div class="studiolms-btn-wrap" data-slms-block-type="actionButton" '
            . 'data-slms-state="' . $state . '"><a href="#" class="studiolms-btn"><span>Button</span></a></div>';

        $now = time();
        $DB->insert_record('tiny_studiolms_templates', (object) [
            'name'         => 'Malicious Obfuscated URL Template',
            'content'      => $content,
            'userid'       => $admin->id,
            'usermodified' => $admin->id,
            'isglobal'     => 1,
            'timecreated'  => $now,
            'timemodified' => $now,
        ]);
    }

    /**
     * Inserts a global template whose callout content hides an <img onerror> inside a comment in a
     * <noscript>, preceded by text so the element lands in <body> rather than <head>.
     *
     * Regression test for the <noscript> mutation XSS: sanitizeUntrustedHtml() parses with DOMParser,
     * where scripting is disabled and <noscript> content is ordinary markup (here, just a comment),
     * so nothing was removed; the live page parses <noscript> as raw text, the hidden </noscript>
     * closes it, and the <img onerror> fires on render, with no click.
     *
     * @Given a malicious global StudioLMS template with a noscript payload exists
     */
    public function a_malicious_global_studiolms_template_with_noscript_payload_exists(): void {
        global $DB;

        $admin = get_admin();
        $content = '<div class="studiolms-callout-wrap mceNonEditable" data-slms-hover="none" '
            . 'data-slms-block-type="callout" data-slms-state="">'
            . '<div class="slms-callout-icon" aria-hidden="true">⚠️</div>'
            . '<div class="slms-callout-content mceEditable">'
            . 'Aviso <noscript><!--</noscript><img src="x" onerror="window.__slmsXssFired = true">--></noscript>'
            . '</div></div>';

        $now = time();
        $DB->insert_record('tiny_studiolms_templates', (object) [
            'name'         => 'Malicious Noscript Template',
            'content'      => $content,
            'userid'       => $admin->id,
            'usermodified' => $admin->id,
            'isglobal'     => 1,
            'timecreated'  => $now,
            'timemodified' => $now,
        ]);
    }
}
