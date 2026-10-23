@editor @editor_tiny @tiny @tiny_studiolms @tiny_studiolms_templates @javascript
Feature: Manage personal and official layout templates in StudioLMS
  As a teacher
  I want to save, favourite, reuse and delete my layouts
  So that I can build lessons from layouts I already trust

  Background:
    Given the following "users" exist:
      | username | firstname | lastname | email                |
      | teacher1 | Teacher   | One      | teacher1@example.com |
      | teacher2 | Teacher   | Two      | teacher2@example.com |
    And the following "courses" exist:
      | fullname | shortname |
      | Course 1 | C1        |
    And the following "course enrolments" exist:
      | user     | course | role           |
      | teacher1 | C1     | editingteacher |
      | teacher2 | C1     | editingteacher |
    And the following "activities" exist:
      | activity | name      | course | idnumber | content   | contentformat |
      | page     | Test page | C1     | page1    | <p>Hi</p> | 1             |
    And the following "tiny_studiolms > templates" exist:
      | name            | user     | isglobal |
      | Weekly layout   | teacher1 | 0        |
      | Other layout    | teacher2 | 0        |
      | Official layout | admin    | 1        |

  Scenario: A template saved from the canvas is listed under My templates
    Given I log in as "teacher1"
    And I am on the "Test page" "page activity editing" page
    And I click on the "StudioLMS" button for the "Page content" TinyMCE editor
    And I add the StudioLMS "callout" block to the canvas
    When I save the StudioLMS canvas as a template named "Saved from canvas"
    Then the StudioLMS "mine" tab is active
    And the StudioLMS library shows the template "Saved from canvas"
    And the StudioLMS feedback says "tpl_saved"

  Scenario: A template saved as official from the canvas marks the Official tab as the selected one
    Given I log in as "admin"
    And I am on the "Test page" "page activity editing" page
    And I click on the "StudioLMS" button for the "Page content" TinyMCE editor
    And I add the StudioLMS "callout" block to the canvas
    When I save the StudioLMS canvas as an official template named "Saved as official"
    Then only the StudioLMS "global" tab is marked as selected
    And I should see "Saved as official" in the "#slms-library-grid" "css_element"

  Scenario: My templates lists only the templates of the current teacher
    Given I log in as "teacher1"
    And I am on the "Test page" "page activity editing" page
    And I click on the "StudioLMS" button for the "Page content" TinyMCE editor
    When I click on the StudioLMS "mine" tab
    Then the StudioLMS library shows the template "Weekly layout"
    And the StudioLMS library does not show the template "Other layout"
    And the StudioLMS library does not show the template "Official layout"

  Scenario: Official templates are listed for a teacher who cannot delete them
    Given I log in as "teacher1"
    And I am on the "Test page" "page activity editing" page
    And I click on the "StudioLMS" button for the "Page content" TinyMCE editor
    When I click on the StudioLMS "global" tab
    Then the StudioLMS library shows the template "Official layout"
    And the StudioLMS dialog does not contain the ".slms-btn-tpl-delete" element

  Scenario: Marking a template as a favourite lists it under Favourites
    Given I log in as "teacher1"
    And I am on the "Test page" "page activity editing" page
    And I click on the "StudioLMS" button for the "Page content" TinyMCE editor
    And I click on the StudioLMS "mine" tab
    When I toggle the StudioLMS favourite star of the template "Weekly layout"
    Then the StudioLMS feedback says "fav_added"
    And I click on the StudioLMS "favourites" tab
    And the StudioLMS library shows the template "Weekly layout"

  Scenario: Removing a favourite takes the template off the Favourites tab
    Given I log in as "teacher1"
    And I am on the "Test page" "page activity editing" page
    And I click on the "StudioLMS" button for the "Page content" TinyMCE editor
    And I click on the StudioLMS "mine" tab
    And I toggle the StudioLMS favourite star of the template "Weekly layout"
    And the StudioLMS feedback says "fav_added"
    When I toggle the StudioLMS favourite star of the template "Weekly layout"
    And I click on the StudioLMS "favourites" tab
    Then the StudioLMS library does not show the template "Weekly layout"

  Scenario: Deleting a template removes it after confirmation
    Given I log in as "teacher1"
    And I am on the "Test page" "page activity editing" page
    And I click on the "StudioLMS" button for the "Page content" TinyMCE editor
    And I click on the StudioLMS "mine" tab
    When I click the StudioLMS delete button of the template "Weekly layout"
    And I click on "Yes" "button" in the "Confirm" "dialogue"
    Then the StudioLMS library does not show the template "Weekly layout"
    And the StudioLMS feedback says "tpl_deleted"

  Scenario: A saved template can be loaded onto the canvas and inserted into the page
    Given I log in as "teacher1"
    And I am on the "Test page" "page activity editing" page
    And I click on the "StudioLMS" button for the "Page content" TinyMCE editor
    And I click on the StudioLMS "mine" tab
    When I load the StudioLMS template "Weekly layout" onto the canvas
    And I insert the StudioLMS canvas into the editor
    Then the "Page content" TinyMCE editor contains a StudioLMS "callout" block
