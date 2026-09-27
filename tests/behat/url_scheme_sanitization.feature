@editor @editor_tiny @tiny @tiny_studiolms @tiny_studiolms_security @javascript
Feature: StudioLMS keeps only safe URL schemes in loaded templates
  As a site
  I want script URLs stripped however they are obfuscated
  So that a link in a loaded template cannot run script when a teacher clicks it

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
    And a malicious global StudioLMS template with obfuscated script URLs exists

  Scenario: Loading a template with obfuscated script URLs keeps only the safe link
    Given I log in as "teacher1"
    And I am on the "Test page" "page activity editing" page
    And I open the StudioLMS dialog
    And I click on the StudioLMS "global" tab
    When I click on ".slms-tpl-insert[aria-label='Malicious Obfuscated URL Template']" "css_element"
    Then the StudioLMS canvas preview keeps only safe link URLs
