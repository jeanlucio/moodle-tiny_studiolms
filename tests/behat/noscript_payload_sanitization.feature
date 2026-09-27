@editor @editor_tiny @tiny @tiny_studiolms @tiny_studiolms_security @javascript
Feature: StudioLMS removes markup that a browser re-parses into live elements
  As a site
  I want raw-text wrappers such as noscript and HTML comments stripped from loaded templates
  So that markup inert to the sanitizer cannot come back to life in the live page

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
    And a malicious global StudioLMS template with a noscript payload exists

  Scenario: Loading a template with a noscript-wrapped payload does not execute it
    Given I log in as "teacher1"
    And I am on the "Test page" "page activity editing" page
    And I open the StudioLMS dialog
    And I click on the StudioLMS "global" tab
    When I click on ".slms-tpl-insert[aria-label='Malicious Noscript Template']" "css_element"
    Then the StudioLMS canvas preview did not execute the template's payload
