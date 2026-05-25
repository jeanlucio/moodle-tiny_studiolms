@editor @editor_tiny @tiny @tiny_studiolms @tiny_studiolms_save_template @javascript
Feature: Save a layout template in StudioLMS
  As a teacher
  I want to open the StudioLMS dialog and navigate its tabs
  So that I can manage my reusable layouts

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
      | activity | name      | course | idnumber | content          |
      | page     | Test page | C1     | page1    | <p>Test page</p> |

  Scenario: Teacher can open the StudioLMS dialog
    Given I log in as "teacher1"
    And I am on the "Test page" "page activity editing" page
    When I open the StudioLMS dialog
    Then the StudioLMS dialog is open

  Scenario: StudioLMS dialog shows all required tab buttons
    Given I log in as "teacher1"
    And I am on the "Test page" "page activity editing" page
    And I open the StudioLMS dialog
    Then the StudioLMS dialog contains the "#slms-tab-components" element
    And the StudioLMS dialog contains the "#slms-tab-mine" element
    And the StudioLMS dialog contains the "#slms-tab-official" element
    And the StudioLMS dialog contains the "#slms-tab-favourites" element

  Scenario: Clicking the My Templates tab activates it
    Given I log in as "teacher1"
    And I am on the "Test page" "page activity editing" page
    And I open the StudioLMS dialog
    When I click on the StudioLMS "mine" tab
    Then the StudioLMS "mine" tab is active

  Scenario: The library grid is visible after clicking a tab
    Given I log in as "teacher1"
    And I am on the "Test page" "page activity editing" page
    And I open the StudioLMS dialog
    When I click on the StudioLMS "mine" tab
    Then the StudioLMS dialog contains the "#slms-library-grid" element
