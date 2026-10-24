@editor @editor_tiny @tiny @tiny_studiolms @tiny_studiolms_canvas @javascript
Feature: Close the icon picker of an infographic with the keyboard
  As a teacher
  I want the Escape key to close the icon picker and nothing else
  So that I do not lose the layout I am building by dismissing a small menu

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
      | activity | name      | course | idnumber | content   | contentformat |
      | page     | Test page | C1     | page1    | <p>Hi</p> | 1             |

  Scenario: Escape closes the icon picker but keeps the composer and its blocks
    Given I log in as "teacher1"
    And I am on the "Test page" "page activity editing" page
    And I click on the "StudioLMS" button for the "Page content" TinyMCE editor
    And I add the StudioLMS "infographic" block to the canvas
    And I open the StudioLMS icon picker
    When I press Escape in the StudioLMS composer
    Then the StudioLMS icon picker is closed
    And the StudioLMS dialog is open
    And the StudioLMS canvas holds "1" blocks
