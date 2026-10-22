@editor @editor_tiny @tiny @tiny_studiolms @tiny_studiolms_ai @javascript
Feature: StudioLMS AI tabs when no AI is available
  As a teacher on a site where no AI source is set up
  I want the AI tabs to say that no AI is available
  So that I am not shown a form that can never produce anything

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

  Scenario Outline: Each AI tab shows the unavailable notice instead of its form
    Given I log in as "teacher1"
    And I am on the "Test page" "page activity editing" page
    And I open the StudioLMS dialog
    When I click on the StudioLMS "<tab>" tab
    Then the StudioLMS AI panel says no AI is available
    And the StudioLMS dialog does not contain the "<form>" element

    Examples:
      | tab      | form                 |
      | ai-block | #slms-ai-prompt      |
      | ai-model | #slms-ai-preset-name |
      | ai-chat  | #slms-chat-input     |

  Scenario: The non-AI tabs keep working when no AI is available
    Given I log in as "teacher1"
    And I am on the "Test page" "page activity editing" page
    And I open the StudioLMS dialog
    When I click on the StudioLMS "ai-block" tab
    And I click on the StudioLMS "components" tab
    Then the StudioLMS dialog contains the ".slms-card[data-slms-block-id='callout']" element
    And the StudioLMS dialog does not contain the ".alert-warning" element
