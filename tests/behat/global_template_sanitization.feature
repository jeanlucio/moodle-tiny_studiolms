@editor @editor_tiny @tiny @tiny_studiolms @tiny_studiolms_security @javascript
Feature: StudioLMS sanitizes global template content before rendering it
  As a site
  I want the StudioLMS canvas to never execute script from a stored template's own content
  So that a template saved outside TinyMCE's own filter cannot execute script in an editor session

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
    And a malicious global StudioLMS template exists

  Scenario: Loading a malicious global template into the canvas does not execute its payload
    Given I log in as "teacher1"
    And I am on the "Test page" "page activity editing" page
    And I open the StudioLMS dialog
    And I click on the StudioLMS "global" tab
    When I click on ".slms-tpl-insert[aria-label='Malicious Global Template']" "css_element"
    Then the StudioLMS canvas preview did not execute the template's payload
