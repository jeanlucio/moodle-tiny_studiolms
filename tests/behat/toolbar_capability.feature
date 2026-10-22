@editor @editor_tiny @tiny @tiny_studiolms @tiny_studiolms_capability @javascript
Feature: StudioLMS toolbar button follows the tiny/studiolms:use capability
  As a site administrator
  I want the StudioLMS button to appear only where the capability is held in the course
  So that students and restricted teachers cannot reach the component library

  Background:
    Given the following "users" exist:
      | username | firstname | lastname | email                |
      | teacher1 | Teacher   | One      | teacher1@example.com |
      | student1 | Student   | One      | student1@example.com |
    And the following "courses" exist:
      | fullname | shortname |
      | Course 1 | C1        |
      | Course 2 | C2        |
    And the following "course enrolments" exist:
      | user     | course | role           |
      | teacher1 | C1     | editingteacher |
      | teacher1 | C2     | editingteacher |
      | student1 | C1     | student        |
    And the following "activities" exist:
      | activity | name        | course | idnumber | content   | contentformat |
      | page     | Test page 1 | C1     | page1    | <p>Hi</p> | 1             |
      | page     | Test page 2 | C2     | page2    | <p>Hi</p> | 1             |

  Scenario: A teacher holding the capability gets the button in the page content editor
    Given I log in as "teacher1"
    When I am on the "Test page 1" "page activity editing" page
    Then "StudioLMS" button should exist in the "Page content" TinyMCE editor

  Scenario: A student has the editor but not the StudioLMS button
    Given I log in as "student1"
    When I open my profile in edit mode
    Then "StudioLMS" button should not exist in the "Description" TinyMCE editor

  Scenario: A teacher denied the capability in a course loses the button there
    Given the following "permission overrides" exist:
      | capability         | permission | role           | contextlevel | reference |
      | tiny/studiolms:use | Prohibit   | editingteacher | Course       | C1        |
    And I log in as "teacher1"
    When I am on the "Test page 1" "page activity editing" page
    Then "StudioLMS" button should not exist in the "Page content" TinyMCE editor

  Scenario: The same denial does not hide the button in another course
    Given the following "permission overrides" exist:
      | capability         | permission | role           | contextlevel | reference |
      | tiny/studiolms:use | Prohibit   | editingteacher | Course       | C1        |
    And I log in as "teacher1"
    When I am on the "Test page 2" "page activity editing" page
    Then "StudioLMS" button should exist in the "Page content" TinyMCE editor
