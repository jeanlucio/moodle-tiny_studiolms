@editor @editor_tiny @tiny @tiny_studiolms @tiny_studiolms_student_view @javascript
Feature: Blocks without a script of their own are read-only on the course page
  As a student
  I want a heading and a button a teacher saved to be plain content
  So that I cannot type into them even when the page has no accordion, card or callout

  Background:
    Given the following "users" exist:
      | username | firstname | lastname | email                |
      | teacher1 | Teacher   | One      | teacher1@example.com |
      | student1 | Student   | One      | student1@example.com |
    And the following "courses" exist:
      | fullname | shortname |
      | Course 1 | C1        |
    And the following "course enrolments" exist:
      | user     | course | role           |
      | teacher1 | C1     | editingteacher |
      | student1 | C1     | student        |
    And the following "activities" exist:
      | activity | name      | course | idnumber | content   | contentformat |
      | page     | Test page | C1     | page1    | <p>Hi</p> | 1             |
    And I log in as "teacher1"
    And I am on the "Test page" "page activity editing" page
    And I click on the "StudioLMS" button for the "Page content" TinyMCE editor
    And I add the StudioLMS "stylizedHeading" block to the canvas
    And I add the StudioLMS "actionButton" block to the canvas
    And I insert the StudioLMS canvas into the editor
    And I press "Save and display"
    And I log out

  Scenario: A page with only a heading and a button carries no editing attributes
    Given I log in as "student1"
    When I am on the "Test page" "page activity" page
    Then the StudioLMS "stylizedHeading" block is shown on the page
    And the StudioLMS "actionButton" block is shown on the page
    And the StudioLMS blocks on the page have no editor-only attributes
