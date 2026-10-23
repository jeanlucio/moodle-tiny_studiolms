@editor @editor_tiny @tiny @tiny_studiolms @tiny_studiolms_blocks @javascript
Feature: Build content with every StudioLMS block
  As a teacher
  I want to add each block type from the library and put it into my page content
  So that every block can be authored and saved with its state for later editing

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

  Scenario Outline: Each block can be added to the canvas and inserted into the page content
    Given I log in as "teacher1"
    And I am on the "Test page" "page activity editing" page
    And I click on the "StudioLMS" button for the "Page content" TinyMCE editor
    And the StudioLMS dialog is open
    When I add the StudioLMS "<block>" block to the canvas
    And I insert the StudioLMS canvas into the editor
    Then the "Page content" TinyMCE editor contains a StudioLMS "<block>" block

    Examples:
      | block                 |
      | stylizedHeading       |
      | actionButton          |
      | advancedCard          |
      | accordion             |
      | resources             |
      | gridcards             |
      | callout               |
      | table                 |
      | profileCard           |
      | chart                 |
      | chartBar              |
      | gauge                 |
      | mindmap               |
      | infographic           |
      | infographicFeatures   |
      | infographicSteps      |
      | infographicTimeline   |
      | infographicComparison |

  Scenario: Every block opens settings panels that have editable fields
    Given I log in as "teacher1"
    And I am on the "Test page" "page activity editing" page
    And I click on the "StudioLMS" button for the "Page content" TinyMCE editor
    When the StudioLMS dialog is open
    Then every StudioLMS block opens settings panels with editable fields

  Scenario Outline: A new block shows its example texts in the site language
    Given I log in as "teacher1"
    And I am on the "Test page" "page activity editing" page
    And I click on the "StudioLMS" button for the "Page content" TinyMCE editor
    When I add the StudioLMS "<block>" block to the canvas
    Then I should see "<text>" in the ".slms-canvas-block-preview" "css_element"

    Examples:
      | block                 | text              |
      | chart                 | In progress       |
      | chartBar              | In progress       |
      | gauge                 | Approval          |
      | mindmap               | Concept A         |
      | infographic           | Modules completed |
      | infographicSteps      | Step 2            |
      | infographicTimeline   | Event 3           |
      | infographicFeatures   | Feature 2         |
      | infographicComparison | Option B          |
