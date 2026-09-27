@editor @editor_tiny @tiny @tiny_studiolms @tiny_studiolms_security @javascript
Feature: StudioLMS never restores a rich-text field from an untrusted data-slms-state
  As a site
  I want a block's rich-text field to always come from the sanitized DOM, never from state
  So that a data-slms-state whose visible markup has no matching DOM child cannot still smuggle
    a script-executing payload back into the canvas preview

  Background:
    Given the following "users" exist:
      | username | firstname | lastname | email                |
      | teacher1 | Teacher   | One      | teacher1@example.com |
    And the following "courses" exist:
      | fullname | shortname |
      | Course 1 | C1        |
    And the following "course enrolments" exist:
      | user     | course | role           |
      | teacher1 | C1     | editingteacher |
    And the following "activities" exist:
      | activity | name      | course | idnumber | content          | contentformat |
      | page     | Test page | C1     | page1    | <p>Test page</p> | 1             |
    And a malicious global StudioLMS template with a state-only payload exists

  Scenario: Loading a template whose block has no matching DOM child for its rich field does not execute the state payload
    Given I log in as "teacher1"
    And I am on the "Test page" "page activity editing" page
    And I open the StudioLMS dialog
    And I click on the StudioLMS "global" tab
    When I click on ".slms-tpl-insert[aria-label='Malicious State-Only Template']" "css_element"
    Then the StudioLMS canvas preview does not execute injected markup
