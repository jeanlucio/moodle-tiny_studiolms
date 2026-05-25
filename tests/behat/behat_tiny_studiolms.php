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
     * Opens the StudioLMS dialog by clicking the toolbar button via JavaScript.
     *
     * The toolbar button has aria-label equal to the `button_tooltip` lang string
     * ("StudioLMS Library"). Using JS avoids needing to know which TinyMCE editor
     * field label to pass to the behat_editor_tiny step.
     *
     * @When I open the StudioLMS dialog
     */
    public function i_open_the_studiolms_dialog(): void {
        $this->spin(function (): bool {
            return (bool) $this->getSession()->evaluateScript(
                'return document.querySelector(\'[aria-label="StudioLMS Library"]\') !== null;'
            );
        }, false, 20);

        $this->getSession()->executeScript(
            'document.querySelector(\'[aria-label="StudioLMS Library"]\').click();'
        );

        $this->spin(function (): bool {
            return (bool) $this->getSession()->evaluateScript(
                "return document.querySelector('#studiolms-app') !== null;"
            );
        }, false, 10);
    }

    /**
     * Clicks a StudioLMS tab button by its data-slms-tab attribute value.
     *
     * Tab values: components, global, mine, favourites, ai-block, ai-model.
     *
     * @When I click on the StudioLMS :tab tab
     * @param string $tab The data-slms-tab attribute value.
     */
    public function i_click_on_studiolms_tab(string $tab): void {
        $js = "document.querySelector('[data-slms-tab=\"{$tab}\"]').click();";
        $this->getSession()->executeScript($js);

        $this->getSession()->wait(500);
    }

    /**
     * Asserts that the StudioLMS dialog is present in the DOM.
     *
     * @Then the StudioLMS dialog is open
     */
    public function the_studiolms_dialog_is_open(): void {
        $found = $this->getSession()->evaluateScript(
            "return document.querySelector('#studiolms-app') !== null;"
        );

        if (!$found) {
            throw new \Behat\Mink\Exception\ExpectationException(
                'The StudioLMS dialog (#studiolms-app) was not found in the DOM.',
                $this->getSession()
            );
        }
    }

    /**
     * Asserts that a specific CSS element exists inside the StudioLMS dialog.
     *
     * @Then the StudioLMS dialog contains the :selector element
     * @param string $selector CSS selector relative to #studiolms-app.
     */
    public function studiolms_dialog_contains_element(string $selector): void {
        $js = "return document.querySelector('#studiolms-app " . addslashes($selector) . "') !== null;";
        $found = $this->getSession()->evaluateScript($js);

        if (!$found) {
            throw new \Behat\Mink\Exception\ExpectationException(
                "Element '{$selector}' was not found inside the StudioLMS dialog.",
                $this->getSession()
            );
        }
    }

    /**
     * Asserts that the StudioLMS tab with the given data-slms-tab value is active.
     *
     * @Then the StudioLMS :tab tab is active
     * @param string $tab The data-slms-tab attribute value.
     */
    public function studiolms_tab_is_active(string $tab): void {
        $js = "
            const btn = document.querySelector('[data-slms-tab=\"{$tab}\"]');
            return btn && (btn.classList.contains('active') || btn.getAttribute('aria-selected') === 'true');
        ";
        $active = $this->getSession()->evaluateScript($js);

        if (!$active) {
            throw new \Behat\Mink\Exception\ExpectationException(
                "StudioLMS tab '{$tab}' is not active.",
                $this->getSession()
            );
        }
    }

    /**
     * Asserts that the StudioLMS toolbar button is present in the TinyMCE toolbar.
     *
     * @Then the StudioLMS toolbar button is visible
     */
    public function studiolms_toolbar_button_is_visible(): void {
        $this->execute('behat_general::should_exist', [
            '[aria-label="StudioLMS Library"]',
            'css_element',
        ]);
    }

    /**
     * Asserts that the StudioLMS toolbar button is NOT present in the TinyMCE toolbar.
     *
     * @Then the StudioLMS toolbar button is not visible
     */
    public function studiolms_toolbar_button_is_not_visible(): void {
        $this->execute('behat_general::should_not_exist', [
            '[aria-label="StudioLMS Library"]',
            'css_element',
        ]);
    }
}
