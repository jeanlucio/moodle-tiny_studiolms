@editor @editor_tiny @tiny_studiolms @tiny_studiolms_manage_templates @javascript
Feature: Manage layout templates in StudioLMS
  As a teacher or manager
  I want the StudioLMS toolbar button to be visible in TinyMCE
  So that I can access the StudioLMS component library

  Background:
    Given the following "users" exist:
      | username | firstname | lastname | email                |
      | teacher1 | Teacher   | One      | teacher1@example.com |
      | manager1 | Manager   | One      | manager1@example.com |
    And the following "system role assigns" exist:
      | user     | role    | contextlevel |
      | manager1 | manager | System       |
    And the following "courses" exist:
      | fullname | shortname |
      | Course 1 | C1        |
    And the following "course enrolments" exist:
      | user     | course | role           |
      | teacher1 | C1     | editingteacher |
    And the following "activities" exist:
      | activity | name      | course | idnumber | content  |
      | page     | Test page | C1     | page1    | <p>Hi</p> |

  Scenario: Teacher sees the StudioLMS toolbar button in TinyMCE
    Given I log in as "teacher1"
    When I am on the "Test page" "page" activity editing page
    Then the StudioLMS toolbar button is visible

  Scenario: Manager also sees the StudioLMS toolbar button
    Given I log in as "manager1"
    And I am on "Course 1" course homepage with editing mode on
    And the following "activities" exist:
      | activity | name        | course | idnumber | content   |
      | page     | Manager page | C1    | mpage1   | <p>Hi</p> |
    When I am on the "Manager page" "page" activity editing page
    Then the StudioLMS toolbar button is visible

  Scenario: Switching between tabs works correctly
    Given I log in as "teacher1"
    And I am on the "Test page" "page" activity editing page
    And I open the StudioLMS dialog
    When I click on the StudioLMS "global" tab
    Then the StudioLMS "global" tab is active
    When I click on the StudioLMS "mine" tab
    Then the StudioLMS "mine" tab is active
    When I click on the StudioLMS "components" tab
    Then the StudioLMS "components" tab is active

  Scenario: All six tabs exist in the dialog
    Given I log in as "teacher1"
    And I am on the "Test page" "page" activity editing page
    And I open the StudioLMS dialog
    Then the StudioLMS dialog contains the "#slms-tab-components" element
    And the StudioLMS dialog contains the "#slms-tab-official" element
    And the StudioLMS dialog contains the "#slms-tab-mine" element
    And the StudioLMS dialog contains the "#slms-tab-favourites" element
    And the StudioLMS dialog contains the "#slms-tab-ai-block" element
    And the StudioLMS dialog contains the "#slms-tab-ai-model" element
