<?php
// This file is part of Moodle - https://moodle.org/
//
// Moodle is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// Moodle is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with Moodle.  If not, see <https://www.gnu.org/licenses/>.

/**
 * PHPUnit tests for tiny_studiolms\event\template_deleted.
 *
 * @package    tiny_studiolms
 * @copyright  2026 Jean Lúcio
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace tiny_studiolms\event;

use advanced_testcase;

/**
 * Tests for the template_deleted event.
 *
 * @covers \tiny_studiolms\event\template_deleted
 */
final class template_deleted_test extends advanced_testcase {
    #[\Override]
    protected function setUp(): void {
        parent::setUp();
        $this->resetAfterTest();
    }

    /**
     * The description includes the template name when one is supplied via 'other'.
     */
    public function test_description_includes_template_name_when_supplied(): void {
        $user = $this->getDataGenerator()->create_user();
        $this->setUser($user);

        $event = template_deleted::create([
            'objectid' => 7,
            'context'  => \context_system::instance(),
            'other'    => ['name' => 'My Layout'],
        ]);

        $this->assertStringContainsString('My Layout', $event->get_description());
        $this->assertStringContainsString('7', $event->get_description());
    }

    /**
     * The description degrades gracefully when no template name is supplied.
     */
    public function test_description_omits_name_when_not_supplied(): void {
        $user = $this->getDataGenerator()->create_user();
        $this->setUser($user);

        $event = template_deleted::create([
            'objectid' => 7,
            'context'  => \context_system::instance(),
        ]);

        $this->assertStringNotContainsString("('", $event->get_description());
    }

    /**
     * The event can be triggered and observed like any other Moodle event.
     */
    public function test_event_can_be_triggered_and_observed(): void {
        $user = $this->getDataGenerator()->create_user();
        $this->setUser($user);

        $sink = $this->redirectEvents();

        $event = template_deleted::create([
            'objectid' => 7,
            'context'  => \context_system::instance(),
            'other'    => ['name' => 'My Layout'],
        ]);
        $event->trigger();

        $events = $sink->get_events();
        $sink->close();

        $this->assertCount(1, $events);
        $this->assertInstanceOf(template_deleted::class, $events[0]);
        $this->assertInstanceOf(\moodle_url::class, $events[0]->get_url());
    }

    /**
     * get_name() returns a non-empty translated string.
     */
    public function test_get_name_returns_translated_string(): void {
        $this->assertNotEmpty(template_deleted::get_name());
    }

    /**
     * The template id is declared as not remapped when course logs are restored.
     *
     * Templates belong to the site, not to a course, so a restored log must not point at whatever
     * template happens to have the same id in the target site. Without the declaration the core
     * reports a debugging message for every restored record of this event.
     */
    public function test_objectid_is_not_remapped_on_restore(): void {
        $mapping = template_deleted::get_objectid_mapping();

        $this->assertSame('tiny_studiolms_templates', $mapping['db']);
        $this->assertSame(\core\event\base::NOT_MAPPED, $mapping['restore']);
        $this->assertDebuggingNotCalled();
    }

    /**
     * The only value in other is the template name, a text, so nothing in it is remapped on restore.
     */
    public function test_other_data_is_not_remapped(): void {
        $this->assertFalse(template_deleted::get_other_mapping());
    }
}
