@editor @editor_tiny @tiny @tiny_studiolms @tiny_studiolms_button @javascript
Feature: The link of a StudioLMS action button is not changed from the editor
  As a teacher
  I want the button of a block to stay a button while I edit its text in the editor
  So that a stray click or the link tools cannot open its address or turn it into plain text

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

  Scenario: Clicking the text of a button in the editor does not follow its link
    Given I log in as "teacher1"
    And I am on the "Test page" "page activity editing" page
    And I click on the "StudioLMS" button for the "Page content" TinyMCE editor
    And I add the StudioLMS "actionButton" block to the canvas
    And I insert the StudioLMS canvas into the editor
    When I click the text of the StudioLMS button in the "Page content" TinyMCE editor
    Then following the link of that StudioLMS button was prevented

  Scenario: The link tools do not remove the link of a button
    Given I log in as "teacher1"
    And I am on the "Test page" "page activity editing" page
    And I click on the "StudioLMS" button for the "Page content" TinyMCE editor
    And I add the StudioLMS "actionButton" block to the canvas
    And I insert the StudioLMS canvas into the editor
    When I remove the link of the StudioLMS button in the "Page content" TinyMCE editor
    Then the "Page content" TinyMCE editor still has the link of the StudioLMS button
    And I should see "The button link is changed in the StudioLMS block panel"
