@editor @editor_tiny @tiny @tiny_studiolms @tiny_studiolms_favourites @javascript
Feature: Favourites tab is accessible in StudioLMS
  As a teacher
  I want to navigate to the Favourites tab in the StudioLMS dialog
  So that I can find templates I have marked as favourite

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
      | activity | name      | course | idnumber | content  |
      | page     | Test page | C1     | page1    | <p>Hi</p> |
    And I log in as "teacher1"
    And I am on the "Test page" "page activity editing" page
    And I open the StudioLMS dialog

  Scenario: Favourites tab button exists in the dialog
    Then the StudioLMS dialog contains the "#slms-tab-favourites" element

  Scenario: Clicking the Favourites tab activates it
    When I click on the StudioLMS "favourites" tab
    Then the StudioLMS "favourites" tab is active

  Scenario: Library grid is rendered when Favourites tab is active
    When I click on the StudioLMS "favourites" tab
    Then the StudioLMS dialog contains the "#slms-library-grid" element

  Scenario: Switching from Favourites back to Components reactivates Components
    When I click on the StudioLMS "favourites" tab
    And I click on the StudioLMS "components" tab
    Then the StudioLMS "components" tab is active
