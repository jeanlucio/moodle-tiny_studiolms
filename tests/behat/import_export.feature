@editor @editor_tiny @tiny @tiny_studiolms @tiny_studiolms_import_export @javascript
Feature: Import and export controls are present in StudioLMS
  As a teacher
  I want to see the Import, Export and Save as Template buttons in the My Templates tab
  So that I can manage my template library

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
    And I click on the StudioLMS "mine" tab

  Scenario: The Export button is present in the My Templates tab
    Then the StudioLMS dialog contains the "#slms-btn-export" element

  Scenario: The Import button is present in the My Templates tab
    Then the StudioLMS dialog contains the "#slms-btn-import" element

  Scenario: The Save as Template button is present in the My Templates tab
    Then the StudioLMS dialog contains the "#slms-btn-save-template" element

  Scenario: All three action buttons are present together
    Then the StudioLMS dialog contains the "#slms-btn-export" element
    And the StudioLMS dialog contains the "#slms-btn-import" element
    And the StudioLMS dialog contains the "#slms-btn-save-template" element
