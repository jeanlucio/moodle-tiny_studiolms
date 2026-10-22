@editor @editor_tiny @tiny @tiny_studiolms @tiny_studiolms_student_view @javascript
Feature: Students see and use the StudioLMS blocks a teacher saved
  As a student
  I want the blocks in a page to appear and respond as the teacher built them
  So that I can read and expand the content without any editing tools

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
    And I add the StudioLMS "accordion" block to the canvas
    And I add the StudioLMS "resources" block to the canvas
    And I add the StudioLMS "callout" block to the canvas
    And I insert the StudioLMS canvas into the editor
    And I press "Save and display"
    And I log out

  Scenario: The blocks a teacher saved reach a student without editing attributes
    Given I log in as "student1"
    When I am on the "Test page" "page activity" page
    Then the StudioLMS "accordion" block is shown on the page
    And the StudioLMS "resources" block is shown on the page
    And the StudioLMS "callout" block is shown on the page
    And the StudioLMS blocks on the page have no editor-only attributes

  Scenario: A student can open and close an accordion
    Given I log in as "student1"
    And I am on the "Test page" "page activity" page
    And the StudioLMS "accordion" block is collapsed
    When I toggle the StudioLMS "accordion" block
    Then the StudioLMS "accordion" block is expanded
    And I toggle the StudioLMS "accordion" block
    And the StudioLMS "accordion" block is collapsed

  Scenario: A student can collapse and reopen the resources list
    Given I log in as "student1"
    And I am on the "Test page" "page activity" page
    And the StudioLMS "resources" block is expanded
    When I toggle the StudioLMS "resources" block
    Then the StudioLMS "resources" block is collapsed
    And I toggle the StudioLMS "resources" block
    And the StudioLMS "resources" block is expanded
