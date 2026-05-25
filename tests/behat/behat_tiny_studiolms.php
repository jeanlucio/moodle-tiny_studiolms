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
     * ("StudioLMS Library"). Uses behat_general::i_click_on with spin retry, so
     * it waits for TinyMCE to finish initialising before clicking.
     *
     * @When I open the StudioLMS dialog
     */
    public function i_open_the_studiolms_dialog(): void {
        $this->execute('behat_general::i_click_on', [
            '[aria-label="StudioLMS Library"]',
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

            $js = "
                const btn = document.querySelector('[data-slms-tab=\"{$tab}\"]');
                return btn && (btn.classList.contains('active') || btn.getAttribute('aria-selected') === 'true');
            ";

            if (!$this->getSession()->evaluateScript($js)) {
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
