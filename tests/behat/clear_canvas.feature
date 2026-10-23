@editor @editor_tiny @tiny @tiny_studiolms @tiny_studiolms_canvas @javascript
Feature: Empty the StudioLMS canvas in one step
  As a teacher
  I want to remove every block I put on the canvas at once
  So that I can start a new layout without deleting the blocks one by one

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

  Scenario: The Clear canvas button appears only when the canvas holds two or more blocks
    Given I log in as "teacher1"
    And I am on the "Test page" "page activity editing" page
    And I click on the "StudioLMS" button for the "Page content" TinyMCE editor
    And I add the StudioLMS "callout" block to the canvas
    And the StudioLMS canvas holds "1" blocks
    And "#slms-btn-clear-canvas" "css_element" should not be visible
    When I add the StudioLMS "actionButton" block to the canvas
    And the StudioLMS canvas holds "2" blocks
    Then "#slms-btn-clear-canvas" "css_element" should be visible

  Scenario: Confirming Clear canvas removes every block from the canvas
    Given I log in as "teacher1"
    And I am on the "Test page" "page activity editing" page
    And I click on the "StudioLMS" button for the "Page content" TinyMCE editor
    And I add the StudioLMS "callout" block to the canvas
    And I add the StudioLMS "actionButton" block to the canvas
    And the StudioLMS canvas holds "2" blocks
    When I click on "Clear canvas" "button" in the "#slms-footer-left" "css_element"
    And I click on "Yes" "button" in the "Clear canvas" "dialogue"
    Then the StudioLMS canvas holds "0" blocks
    And "#slms-btn-clear-canvas" "css_element" should not be visible

  Scenario: Cancelling Clear canvas keeps the blocks
    Given I log in as "teacher1"
    And I am on the "Test page" "page activity editing" page
    And I click on the "StudioLMS" button for the "Page content" TinyMCE editor
    And I add the StudioLMS "callout" block to the canvas
    And I add the StudioLMS "actionButton" block to the canvas
    And the StudioLMS canvas holds "2" blocks
    When I click on "Clear canvas" "button" in the "#slms-footer-left" "css_element"
    And I click on "Cancel" "button" in the "Clear canvas" "dialogue"
    Then the StudioLMS canvas holds "2" blocks
