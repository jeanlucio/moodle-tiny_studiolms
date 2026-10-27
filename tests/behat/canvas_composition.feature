@editor @editor_tiny @tiny @tiny_studiolms @tiny_studiolms_canvas @javascript
Feature: Compose a page on the StudioLMS canvas
  As a teacher
  I want to reorder the blocks and start from a ready-made layout
  So that the page I insert is the one I planned

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

  Scenario: The selected block moves up and down the canvas
    Given I log in as "teacher1"
    And I am on the "Test page" "page activity editing" page
    And I click on the "StudioLMS" button for the "Page content" TinyMCE editor
    And I add the StudioLMS "callout" block to the canvas
    And I add the StudioLMS "actionButton" block to the canvas
    And the StudioLMS canvas lists the blocks "studiolms-callout-wrap,studiolms-btn-wrap" in this order
    When I move the selected StudioLMS canvas block up
    Then the StudioLMS canvas lists the blocks "studiolms-btn-wrap,studiolms-callout-wrap" in this order
    And I move the selected StudioLMS canvas block down
    And the StudioLMS canvas lists the blocks "studiolms-callout-wrap,studiolms-btn-wrap" in this order

  Scenario: Every ready-made layout loads onto the canvas and runs nothing
    Given I log in as "teacher1"
    And I am on the "Test page" "page activity editing" page
    And I click on the "StudioLMS" button for the "Page content" TinyMCE editor
    When I click on the StudioLMS "presets" tab
    Then loading every ready-made StudioLMS layout runs no script
