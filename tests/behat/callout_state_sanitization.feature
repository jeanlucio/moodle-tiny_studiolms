@editor @editor_tiny @tiny @tiny_studiolms @tiny_studiolms_security @javascript
Feature: StudioLMS sanitizes block state before rendering it
  As a site
  I want the StudioLMS canvas to never render a block's own state as raw HTML
  So that markup restored from data-slms-state cannot execute script in an editor session

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
      | activity | name      | course | idnumber | content          | contentformat |
      | page     | Test page | C1     | page1    | <p>Test page</p> | 1             |

  Scenario: Markup typed into the callout icon field never renders as an element in the preview
    Given I log in as "teacher1"
    And I am on the "Test page" "page activity editing" page
    And I open the StudioLMS dialog
    And I click on ".slms-card[data-slms-block-id='callout']" "css_element"
    And I click on ".slms-canvas-block" "css_element"
    And I click on "#tb-callout-design" "css_element"
    When I set the field "pop_callout_icon" to "<img src=x onerror=\"window.__slmsXssFired = true\">"
    Then the StudioLMS canvas preview does not execute injected markup
