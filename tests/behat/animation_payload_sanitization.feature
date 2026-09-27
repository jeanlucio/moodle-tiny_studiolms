@editor @editor_tiny @tiny @tiny_studiolms @tiny_studiolms_security @javascript
Feature: StudioLMS strips event handler attributes itself, not via TinyMCE's own serializer
  As a site
  I want on* attributes on <p>/<i> tags stripped by the plugin's own sanitizer
  So that a payload the editor's serializer would otherwise keep intact cannot execute script

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
    And a malicious global StudioLMS template with an animation-triggered payload exists

  Scenario: Loading a template with an animation-triggered handler on a <p> tag does not execute it
    Given I log in as "teacher1"
    And I am on the "Test page" "page activity editing" page
    And I open the StudioLMS dialog
    And I click on the StudioLMS "global" tab
    When I click on ".slms-tpl-insert[aria-label='Malicious Animation Payload Template']" "css_element"
    Then the StudioLMS canvas preview did not execute the template's payload
