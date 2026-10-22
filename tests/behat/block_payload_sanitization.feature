@editor @editor_tiny @tiny @tiny_studiolms @tiny_studiolms_security @javascript
Feature: No StudioLMS block runs hostile markup, whichever way it arrives
  As a site
  I want markup typed into a block, or stored in a template, to stay inert in every block type
  So that a payload that is harmless in the callout cannot work in another block

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
    And a malicious global StudioLMS template exists for every block

  Scenario: Markup typed into the settings of any block never runs in the preview
    Given I log in as "teacher1"
    And I am on the "Test page" "page activity editing" page
    When I click on the "StudioLMS" button for the "Page content" TinyMCE editor
    Then no StudioLMS block runs markup typed into its settings fields

  Scenario: A hostile template of any block runs nothing when it is loaded
    Given I log in as "teacher1"
    And I am on the "Test page" "page activity editing" page
    And I click on the "StudioLMS" button for the "Page content" TinyMCE editor
    When I click on the StudioLMS "global" tab
    Then loading a hostile template of every StudioLMS block runs no script
