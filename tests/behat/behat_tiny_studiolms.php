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

// NOTE: no MOODLE_INTERNAL test here, this file may be required by behat before including /config.php.
require_once(__DIR__ . '/../../../../tests/behat/editor_tiny_helpers.php');

/**
 * Custom Behat step definitions for the StudioLMS TinyMCE plugin.
 *
 * @package    tiny_studiolms
 * @category   test
 * @copyright  2026 Jean Lúcio
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class behat_tiny_studiolms extends behat_base {
    use editor_tiny_helpers;

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
     * Asserts that no element matching the selector exists inside the StudioLMS dialog.
     *
     * Only meaningful once something else in the dialog has been waited for: an absence can be
     * asserted before the dialog has rendered anything at all.
     *
     * @Then the StudioLMS dialog does not contain the :selector element
     * @param string $selector CSS selector relative to #studiolms-app.
     */
    public function studiolms_dialog_does_not_contain_element(string $selector): void {
        $this->execute('behat_general::should_not_exist', [
            '#studiolms-app ' . $selector,
            'css_element',
        ]);
    }

    /**
     * Asserts that the AI tab currently shown carries the "no AI is available" notice.
     *
     * The tab content is rendered asynchronously, so this waits for the notice to appear.
     *
     * @Then the StudioLMS AI panel says no AI is available
     */
    public function studiolms_ai_panel_says_no_ai_is_available(): void {
        $this->execute('behat_general::assert_element_contains_text', [
            get_string('ai_generator_no_config', 'tiny_studiolms'),
            '#studiolms-app .alert-warning',
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
     * Adds a block of the given type to the canvas by clicking its card in the Components tab.
     *
     * A card only carries data-slms-block-id once its click listener is attached, so waiting for
     * that attribute is what makes a single click safe (a retry loop would add the block twice).
     * Then waits until the block's preview has rendered.
     *
     * @When I add the StudioLMS :blocktype block to the canvas
     * @param string $blocktype The block id, for example callout or infographicSteps.
     */
    public function i_add_the_studiolms_block_to_the_canvas(string $blocktype): void {
        $this->execute('behat_general::i_click_on', [
            '.slms-card[data-slms-block-id="' . $blocktype . '"]',
            'css_element',
        ]);
        $this->wait_for_canvas_preview();
    }

    /**
     * Waits until at least one canvas block has rendered its preview.
     */
    private function wait_for_canvas_preview(): void {
        $this->spin(function () {
            $rendered = $this->evaluate_script(
                'return document.querySelectorAll("#slms-canvas-blocks .slms-canvas-block-preview *").length > 0;'
            );
            if (!$rendered) {
                throw new \Behat\Mink\Exception\ExpectationException(
                    'The StudioLMS canvas has no rendered block preview.',
                    $this->getSession()
                );
            }
            return true;
        });
    }

    /**
     * Clicks Insert and waits for the dialog to close, so the editor holds the canvas blocks.
     *
     * @When I insert the StudioLMS canvas into the editor
     */
    public function i_insert_the_studiolms_canvas_into_the_editor(): void {
        $this->execute('behat_general::i_click_on', ['#slms-btn-insert', 'css_element']);

        $this->spin(function () {
            if ($this->getSession()->getPage()->find('css', '#studiolms-app')) {
                throw new \Behat\Mink\Exception\ExpectationException(
                    'The StudioLMS dialog is still open after inserting.',
                    $this->getSession()
                );
            }
            return true;
        });
    }

    /**
     * Asserts that the content of a TinyMCE editor holds a StudioLMS block of the given type,
     * carrying the state attribute the plugin needs to reopen it for editing.
     *
     * @Then the :field TinyMCE editor contains a StudioLMS :blocktype block
     * @param string $field The Moodle field locator of the editor, for example Page content.
     * @param string $blocktype The block id, for example callout.
     */
    public function the_editor_contains_a_studiolms_block(string $field, string $blocktype): void {
        $this->require_tiny_tags();
        $editorid = $this->get_textarea_for_locator($field)->getAttribute('id');

        $this->spin(function () use ($editorid, $blocktype) {
            $html = (string) $this->evaluate_javascript_for_editor($editorid, 'resolve(instance.getContent());');
            $hastype = strpos($html, 'data-slms-block-type="' . $blocktype . '"') !== false;
            if (!$hastype || !preg_match('/data-slms-state="[^"]+"/', $html)) {
                throw new \Behat\Mink\Exception\ExpectationException(
                    "The '{$field}' editor has no StudioLMS '{$blocktype}' block with a saved state.",
                    $this->getSession()
                );
            }
            return true;
        });
    }

    /**
     * Adds every block type in turn and opens each of its settings panels, asserting that every
     * panel renders at least one editable field. A block is removed again before the next one so
     * a single canvas block is ever selected. Not a plain assertion: it drives the canvas to
     * reach each block, which keeps the whole sweep in one browser session.
     *
     * @Then every StudioLMS block opens settings panels with editable fields
     */
    public function every_studiolms_block_opens_settings_panels(): void {
        foreach ($this->library_block_types() as $blocktype) {
            $this->i_add_the_studiolms_block_to_the_canvas($blocktype);
            $this->open_every_settings_panel($blocktype);
            $this->remove_the_selected_canvas_block();
        }
    }

    /**
     * Types a script-carrying payload into every text field of every block's settings panels and
     * asserts that nothing ran and no event-handler attribute reached the canvas preview.
     *
     * Covers the typed-input path, which the template and state regression scenarios do not: the
     * design popups copy what is typed straight into the block config, and several blocks render
     * parts of it unescaped. URL fields are not asserted here: a javascript: address typed into one
     * is inert in the preview (links are not focusable or clickable there), TinyMCE drops it when
     * the block is inserted, and sanitizeUrlFields() neutralises it when the block is loaded again.
     *
     * @Then no StudioLMS block runs markup typed into its settings fields
     */
    public function no_studiolms_block_runs_markup_typed_into_its_settings(): void {
        foreach ($this->library_block_types() as $blocktype) {
            $this->execute_script('window.__slmsXssFired = false;');
            $this->i_add_the_studiolms_block_to_the_canvas($blocktype);
            $this->open_every_settings_panel($blocktype, function () {
                $this->type_payload_into_the_visible_settings_fields();
            });

            // The payloads fire asynchronously (an image request failing), so absence can only be
            // asserted after a fixed window.
            $this->getSession()->wait(1000);
            $this->assert_canvas_ran_no_script("typing markup into the '{$blocktype}' settings");
            $this->remove_the_selected_canvas_block();
        }
    }

    /**
     * Loads a hostile global template for every block onto the canvas, one after the other, and
     * asserts that none of them ran script or left an unsafe attribute in the preview.
     *
     * The templates (see tests/fixtures/hostile_blocks.json) are the markup each block really
     * produces with a payload in every rich-text region and in every string of its saved state, URL
     * fields included. Also fails when a block exists in the library without a fixture, so a new
     * block cannot be added without being covered.
     *
     * @Then loading a hostile template of every StudioLMS block runs no script
     */
    public function loading_a_hostile_template_of_every_block_runs_no_script(): void {
        // The block list only exists in the Components tab; the hostile templates are in the Official one.
        $this->i_click_on_studiolms_tab('components');
        $blocktypes = $this->library_block_types();
        $this->i_click_on_studiolms_tab('global');
        $fixtures = array_keys($this->hostile_block_fixtures());
        $missing = array_diff($blocktypes, $fixtures);
        if (!empty($missing)) {
            throw new \Behat\Mink\Exception\ExpectationException(
                'No hostile template fixture for: ' . implode(', ', $missing) . '.',
                $this->getSession()
            );
        }

        foreach ($fixtures as $blocktype) {
            $this->execute_script('window.__slmsXssFired = false;');
            // The thumbnail is clicked rather than the name: a tall preview overlaps the name row, and
            // the plugin wires the thumbnail to the same handler.
            $this->execute('behat_general::i_click_on', [
                $this->template_card_xpath('Hostile ' . $blocktype) . '//div[contains(@class, "slms-tpl-thumb")]',
                'xpath_element',
            ]);
            $this->wait_for_canvas_preview();

            $this->getSession()->wait(1000);
            $this->assert_canvas_ran_no_script("loading the hostile '{$blocktype}' template", true);
            $this->remove_the_selected_canvas_block();
        }
    }

    /**
     * Stores one global template per block, each holding the hostile markup of that block.
     *
     * @Given a malicious global StudioLMS template exists for every block
     */
    public function a_malicious_global_studiolms_template_exists_for_every_block(): void {
        $generator = testing_util::get_data_generator()->get_plugin_generator('tiny_studiolms');

        foreach ($this->hostile_block_fixtures() as $blocktype => $content) {
            $generator->create_template([
                'name' => 'Hostile ' . $blocktype,
                'content' => $content,
                'isglobal' => 1,
            ]);
        }
    }

    /**
     * Reads the hostile template markup keyed by block id.
     *
     * @return string[]
     */
    private function hostile_block_fixtures(): array {
        global $CFG;

        $file = $CFG->dirroot . '/lib/editor/tiny/plugins/studiolms/tests/fixtures/hostile_blocks.json';
        $fixtures = json_decode(file_get_contents($file), true);
        if (!is_array($fixtures) || empty($fixtures)) {
            throw new \Behat\Mink\Exception\ExpectationException(
                'The hostile block fixture is missing or not valid JSON.',
                $this->getSession()
            );
        }
        return $fixtures;
    }

    /**
     * Returns the ids of every block in the Components tab, once the whole list has loaded.
     *
     * Cards are appended at once but only get their data-slms-block-id after a lang string
     * resolves, so the list is complete only when every card carries it.
     *
     * @return string[]
     */
    private function library_block_types(): array {
        return $this->spin(function () {
            $ids = $this->evaluate_script(
                'return (function () {' .
                'var cards = document.querySelectorAll("#slms-library-grid .slms-card");' .
                'var ready = document.querySelectorAll("#slms-library-grid .slms-card[data-slms-block-id]");' .
                'if (cards.length === 0 || cards.length !== ready.length) { return []; }' .
                'return Array.prototype.map.call(ready, function (c) { return c.dataset.slmsBlockId; });' .
                '})();'
            );
            if (empty($ids)) {
                throw new \Behat\Mink\Exception\ExpectationException(
                    'The StudioLMS library has not finished listing its blocks.',
                    $this->getSession()
                );
            }
            return $ids;
        });
    }

    /**
     * Removes the only block on the canvas and waits until the canvas is empty again.
     */
    private function remove_the_selected_canvas_block(): void {
        $this->execute('behat_general::i_click_on', ['.slms-btn-block-remove', 'css_element']);
        $this->spin(function () {
            if ($this->getSession()->getPage()->find('css', '#slms-canvas-blocks .slms-canvas-block')) {
                throw new \Behat\Mink\Exception\ExpectationException(
                    'The StudioLMS block was not removed from the canvas.',
                    $this->getSession()
                );
            }
            return true;
        });
    }

    /**
     * Puts an <img onerror> payload into every text field of the settings panel on screen and
     * fires the events the plugin listens to, as typing would.
     */
    private function type_payload_into_the_visible_settings_fields(): void {
        $this->execute_script(
            '(function () {' .
            'var payload = \'<img src=x onerror="window.__slmsXssFired = true">\';' .
            'var selector = "#slms-properties-content input, #slms-properties-content textarea";' .
            'var types = ["text", "url", "search", "email", "tel", "textarea"];' .
            'Array.prototype.forEach.call(document.querySelectorAll(selector), function (field) {' .
            'if (types.indexOf(field.type) === -1) { return; }' .
            'var proto = field.tagName === "TEXTAREA" ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;' .
            'Object.getOwnPropertyDescriptor(proto, "value").set.call(field, payload);' .
            'field.dispatchEvent(new Event("input", {bubbles: true}));' .
            'field.dispatchEvent(new Event("change", {bubbles: true}));' .
            '});' .
            '})();'
        );
    }

    /**
     * Fails when a payload ran, or when a block in the canvas carries an event-handler attribute.
     *
     * With $checkurls it also fails on a link or image address whose scheme is not http(s), mailto
     * or tel, which is what loading a stored block must never leave behind.
     *
     * @param string $action What was just done, for the failure message.
     * @param bool $checkurls Whether unsafe URL schemes count as a failure.
     */
    private function assert_canvas_ran_no_script(string $action, bool $checkurls = false): void {
        if ($this->evaluate_script('return window.__slmsXssFired === true;')) {
            throw new \Behat\Mink\Exception\ExpectationException(
                "A payload ran in the StudioLMS canvas after {$action}.",
                $this->getSession()
            );
        }

        $problems = $this->evaluate_script(
            'return (function () {' .
            'var found = [];' .
            'var checkurls = ' . ($checkurls ? 'true' : 'false') . ';' .
            'var root = document.getElementById("slms-canvas-blocks");' .
            'Array.prototype.forEach.call(root.querySelectorAll("*"), function (el) {' .
            'Array.prototype.forEach.call(el.attributes, function (a) {' .
            'var name = a.name.toLowerCase();' .
            'if (name.indexOf("on") === 0) { found.push(el.tagName + "[" + name + "]"); return; }' .
            'if (!checkurls || ["href", "xlink:href", "src"].indexOf(name) === -1) { return; }' .
            'var value = a.value.replace(/[\\u0000-\\u0020]/g, "").toLowerCase();' .
            'if (/^[a-z][a-z0-9+.-]*:/.test(value) && !/^(https?|mailto|tel):/.test(value)) {' .
            'found.push(el.tagName + "[" + name + "=" + value.slice(0, 20) + "]"); }' .
            '});' .
            '});' .
            'return found;' .
            '})();'
        );
        if (!empty($problems)) {
            throw new \Behat\Mink\Exception\ExpectationException(
                "Unsafe markup in the StudioLMS canvas after {$action}: " . implode(', ', $problems),
                $this->getSession()
            );
        }
    }

    /**
     * Clicks each toolbar button of the selected block and waits for its panel to show fields.
     *
     * A panel counts as shown once its own button is marked active (the plugin does that after
     * rendering), so a panel left over from the previous button cannot satisfy the check.
     *
     * @param string $blocktype The block id, used in the failure message.
     * @param callable|null $afterpanel Called each time a panel is shown.
     */
    private function open_every_settings_panel(string $blocktype, ?callable $afterpanel = null): void {
        $selector = '#slms-top-toolbar .slms-toolbar-btn';
        // The toolbar is built after the block is selected, so the buttons are waited for rather
        // than counted once: a count of zero taken too early would end the loop below silently.
        $count = $this->spin(function () use ($selector, $blocktype) {
            $found = count($this->getSession()->getPage()->findAll('css', $selector));
            if ($found === 0) {
                throw new \Behat\Mink\Exception\ExpectationException(
                    "The '{$blocktype}' block has no settings buttons in the toolbar.",
                    $this->getSession()
                );
            }
            return $found;
        });

        for ($index = 0; $index < $count; $index++) {
            // Looked up again each time: the toolbar may be rebuilt while a panel renders.
            $button = $this->getSession()->getPage()->findAll('css', $selector)[$index];
            $this->execute('behat_general::i_click_on', [$button, 'NodeElement']);

            $this->spin(function () use ($index, $blocktype) {
                $shown = $this->evaluate_script(
                    'return (function () {' .
                    'var button = document.querySelectorAll("#slms-top-toolbar .slms-toolbar-btn")[' . $index . '];' .
                    'var panel = document.getElementById("slms-properties-panel");' .
                    'return !!button && button.classList.contains("active") && !panel.classList.contains("d-none")' .
                    ' && panel.querySelectorAll("input, select, textarea").length > 0;' .
                    '})();'
                );
                if (!$shown) {
                    throw new \Behat\Mink\Exception\ExpectationException(
                        "Settings panel " . ($index + 1) . " of the '{$blocktype}' block shows no editable fields.",
                        $this->getSession()
                    );
                }
                return true;
            });

            if ($afterpanel !== null) {
                $afterpanel();
            }
        }
    }

    /**
     * Saves the canvas as a personal template through the footer form.
     *
     * @When I save the StudioLMS canvas as a template named :name
     * @param string $name The template name.
     */
    public function i_save_the_studiolms_canvas_as_a_template(string $name): void {
        $this->execute('behat_general::i_click_on', ['#slms-btn-save-template', 'css_element']);
        // Located by its placeholder: Behat's field locator matches id, name, label and placeholder,
        // not aria-label.
        $this->execute('behat_forms::i_set_the_field_to', [
            get_string('placeholder_tpl_name', 'tiny_studiolms'),
            $name,
        ]);
        $this->execute('behat_general::i_click_on', ['#slms-save-tpl-form .btn-primary', 'css_element']);
    }

    /**
     * Asserts that the template library currently lists a template with the given name.
     *
     * @Then the StudioLMS library shows the template :name
     * @param string $name The template name.
     */
    public function the_studiolms_library_shows_the_template(string $name): void {
        $this->execute('behat_general::assert_element_contains_text', [
            $name,
            '#slms-library-grid .slms-tpl-card',
            'css_element',
        ]);
    }

    /**
     * Asserts that the template library no longer lists a template with the given name.
     *
     * @Then the StudioLMS library does not show the template :name
     * @param string $name The template name.
     */
    public function the_studiolms_library_does_not_show_the_template(string $name): void {
        $this->execute('behat_general::assert_element_not_contains_text', [
            $name,
            '#slms-library-grid',
            'css_element',
        ]);
    }

    /**
     * Asserts that the feedback line under the tabs shows the given lang string of the plugin.
     *
     * @Then the StudioLMS feedback says :stringkey
     * @param string $stringkey Key of a tiny_studiolms lang string, for example tpl_saved.
     */
    public function the_studiolms_feedback_says(string $stringkey): void {
        $this->execute('behat_general::assert_element_contains_text', [
            get_string($stringkey, 'tiny_studiolms'),
            '#slms-feedback-area',
            'css_element',
        ]);
    }

    /**
     * Clicks the favourite star of the named template card.
     *
     * @When I toggle the StudioLMS favourite star of the template :name
     * @param string $name The template name.
     */
    public function i_toggle_the_favourite_star_of_the_template(string $name): void {
        $this->execute('behat_general::i_click_on', [
            $this->template_card_xpath($name) . '//button[contains(@class, "slms-btn-fav")]',
            'xpath_element',
        ]);
    }

    /**
     * Clicks the delete button of the named template card (the confirmation is a separate step).
     *
     * @When I click the StudioLMS delete button of the template :name
     * @param string $name The template name.
     */
    public function i_click_the_delete_button_of_the_template(string $name): void {
        $this->execute('behat_general::i_click_on', [
            $this->template_card_xpath($name) . '//button[contains(@class, "slms-btn-tpl-delete")]',
            'xpath_element',
        ]);
    }

    /**
     * Loads the named template onto the canvas by clicking its card.
     *
     * @When I load the StudioLMS template :name onto the canvas
     * @param string $name The template name.
     */
    public function i_load_the_template_onto_the_canvas(string $name): void {
        $this->execute('behat_general::i_click_on', [
            $this->template_card_xpath($name) . '//div[contains(@class, "slms-tpl-insert")]',
            'xpath_element',
        ]);
        $this->wait_for_canvas_preview();
    }

    /**
     * Builds the XPath of the library card whose name matches exactly.
     *
     * @param string $name The template name.
     * @return string
     */
    private function template_card_xpath(string $name): string {
        $literal = behat_context_helper::escape($name);
        return '//div[contains(@class, "slms-tpl-card")]'
            . '[.//div[contains(@class, "slms-tpl-name")][normalize-space(.) = ' . $literal . ']]';
    }

    /**
     * Asserts that a StudioLMS block of the given type is on the page being viewed.
     *
     * @Then the StudioLMS :blocktype block is shown on the page
     * @param string $blocktype The block id, for example accordion.
     */
    public function the_studiolms_block_is_shown_on_the_page(string $blocktype): void {
        $this->execute('behat_general::should_exist', [
            '[data-slms-block-type="' . $blocktype . '"]',
            'css_element',
        ]);
    }

    /**
     * Asserts that the page being viewed no longer carries editor-only attributes on its blocks.
     *
     * The editor marks blocks (and their rich-text parts) contenteditable; a visitor must not be
     * able to type into them. The attribute is removed by the front-end module once the page has
     * loaded, so this waits for it to be gone instead of reading the markup once.
     *
     * @Then the StudioLMS blocks on the page have no editor-only attributes
     */
    public function the_studiolms_blocks_have_no_editor_only_attributes(): void {
        $this->spin(function () {
            $editable = $this->evaluate_script(
                'return document.querySelectorAll("[data-slms-block-type] [contenteditable], ' .
                '[data-slms-block-type][contenteditable]").length;'
            );
            if ((int) $editable !== 0) {
                throw new \Behat\Mink\Exception\ExpectationException(
                    $editable . ' StudioLMS element(s) on the page are still contenteditable.',
                    $this->getSession()
                );
            }
            return true;
        });
    }

    /**
     * Clicks the header of a collapsible StudioLMS block (accordion or resources list).
     *
     * @When I toggle the StudioLMS :blocktype block
     * @param string $blocktype Either accordion or resources.
     */
    public function i_toggle_the_studiolms_block(string $blocktype): void {
        $this->execute('behat_general::i_click_on', [
            $this->collapsible_header_selector($blocktype),
            'css_element',
        ]);
    }

    /**
     * Asserts that a collapsible StudioLMS block is open or closed, as exposed to assistive tech.
     *
     * Reads aria-expanded on the block header, which the front-end module sets when the page
     * loads and flips on every toggle, so it also proves the module ran.
     *
     * @Then the StudioLMS :blocktype block is :state
     * @param string $blocktype Either accordion or resources.
     * @param string $state Either expanded or collapsed.
     */
    public function the_studiolms_block_is_expanded_or_collapsed(string $blocktype, string $state): void {
        if (!in_array($state, ['expanded', 'collapsed'], true)) {
            throw new \Behat\Mink\Exception\ExpectationException(
                "Unknown state '{$state}': expected expanded or collapsed.",
                $this->getSession()
            );
        }
        $expected = $state === 'expanded' ? 'true' : 'false';
        $selector = $this->collapsible_header_selector($blocktype);

        $this->spin(function () use ($selector, $expected, $blocktype, $state) {
            $header = $this->getSession()->getPage()->find('css', $selector);
            if (!$header || $header->getAttribute('aria-expanded') !== $expected) {
                throw new \Behat\Mink\Exception\ExpectationException(
                    "The StudioLMS '{$blocktype}' block is not {$state}.",
                    $this->getSession()
                );
            }
            return true;
        });
    }

    /**
     * Returns the CSS selector of the clickable header of a collapsible block.
     *
     * @param string $blocktype Either accordion or resources.
     * @return string
     */
    private function collapsible_header_selector(string $blocktype): string {
        $headers = [
            'accordion' => '.studiolms-accordion-summary',
            'resources' => '.studiolms-resources-summary',
        ];
        if (!isset($headers[$blocktype])) {
            throw new \Behat\Mink\Exception\ExpectationException(
                "The StudioLMS '{$blocktype}' block is not collapsible.",
                $this->getSession()
            );
        }
        return $headers[$blocktype];
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

    /**
     * Asserts how many blocks the StudioLMS canvas holds, waiting for the count to settle because
     * a block is added to the list before its preview is drawn.
     *
     * @Then the StudioLMS canvas holds :count blocks
     * @param string $count The expected number of blocks.
     */
    public function the_studiolms_canvas_holds_blocks(string $count): void {
        $this->spin(function () use ($count) {
            $actual = (int) $this->evaluate_script(
                'return document.querySelectorAll("#slms-canvas-blocks .slms-canvas-block").length;'
            );
            if ($actual !== (int) $count) {
                throw new \Behat\Mink\Exception\ExpectationException(
                    "The StudioLMS canvas holds {$actual} block(s), expected {$count}.",
                    $this->getSession()
                );
            }
            return true;
        });
    }

    /** @var bool|null Whether the last click on a StudioLMS button in the editor had its default action cancelled. */
    private ?bool $buttonclickprevented = null;

    /**
     * Clicks the text of the first StudioLMS action button inside a TinyMCE editor and records
     * whether the editor cancelled the click, which is what stops the browser from following the link.
     *
     * @When I click the text of the StudioLMS button in the :field TinyMCE editor
     * @param string $field The Moodle field locator of the editor, for example Page content.
     */
    public function i_click_the_text_of_the_studiolms_button(string $field): void {
        $this->require_tiny_tags();
        $editorid = $this->get_textarea_for_locator($field)->getAttribute('id');

        $this->buttonclickprevented = (bool) $this->evaluate_javascript_for_editor($editorid, <<<'JS'
            const anchor = instance.getBody().querySelector('a.studiolms-btn');
            const target = anchor.querySelector('span') || anchor;
            const click = new MouseEvent('click', {bubbles: true, cancelable: true, button: 0});
            target.dispatchEvent(click);
            resolve(click.defaultPrevented);
JS);
    }

    /**
     * Asserts that the last click on a StudioLMS button in the editor had its default action cancelled.
     *
     * @Then following the link of that StudioLMS button was prevented
     */
    public function following_the_link_of_that_studiolms_button_was_prevented(): void {
        if ($this->buttonclickprevented !== true) {
            throw new \Behat\Mink\Exception\ExpectationException(
                'Clicking the text of the StudioLMS button in the editor would have followed its link.',
                $this->getSession()
            );
        }
    }

    /**
     * Puts the cursor in the first StudioLMS action button of a TinyMCE editor and runs the link
     * commands the editor toolbar offers: remove the link, then insert or edit one.
     *
     * @When I remove the link of the StudioLMS button in the :field TinyMCE editor
     * @param string $field The Moodle field locator of the editor, for example Page content.
     */
    public function i_remove_the_link_of_the_studiolms_button(string $field): void {
        $this->require_tiny_tags();
        $editorid = $this->get_textarea_for_locator($field)->getAttribute('id');

        $this->evaluate_javascript_for_editor($editorid, <<<'JS'
            const text = instance.getBody().querySelector('a.studiolms-btn span').firstChild;
            instance.selection.setCursorLocation(text, 1);
            instance.execCommand('unlink');
            instance.execCommand('mceLink');
            resolve(true);
JS);
    }

    /**
     * Asserts that the content of a TinyMCE editor still holds a StudioLMS action button as a link.
     *
     * @Then the :field TinyMCE editor still has the link of the StudioLMS button
     * @param string $field The Moodle field locator of the editor, for example Page content.
     */
    public function the_editor_still_has_the_link_of_the_studiolms_button(string $field): void {
        $this->require_tiny_tags();
        $editorid = $this->get_textarea_for_locator($field)->getAttribute('id');

        $this->spin(function () use ($editorid, $field) {
            $html = (string) $this->evaluate_javascript_for_editor($editorid, 'resolve(instance.getContent());');
            $classfirst = preg_match('/<a [^>]*class="[^"]*studiolms-btn[^"]*"[^>]*href="/', $html);
            $hreffirst = preg_match('/<a [^>]*href="[^"]*"[^>]*class="[^"]*studiolms-btn/', $html);
            if (!$classfirst && !$hreffirst) {
                throw new \Behat\Mink\Exception\ExpectationException(
                    "The '{$field}' editor no longer has the StudioLMS button as a link.",
                    $this->getSession()
                );
            }
            return true;
        });
    }
}
