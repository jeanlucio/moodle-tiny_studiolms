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
 * Tests of the markers of the widget blocks and of the wiring of the Widgets tab, run via `node --test`.
 *
 * The markers are the contract with the StudioLMS widgets filter (filter_studiolms, widgets::CONTRACT): what this
 * module writes, the filter has to read. The wiring checks keep the tab, the option that feeds it and the blocks in step.
 *
 * @package    tiny_studiolms
 * @copyright  2026 Jean Lúcio
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

// Located through a source file, so the test works from any working directory.
const read = (file) => fs.readFileSync(require.resolve(`../../${file}`), 'utf8');

let markers;

test.before(async() => {
    // The module imports nothing, so Node can load it as it stands.
    markers = await import(require.resolve('../../amd/src/blocks/widget_markers.js'));
});

test('the simple marker of each widget is just its name in brackets', () => {
    assert.equal(markers.buildMarker('forumstats'), '[FORUMSTATS]');
    assert.equal(markers.buildMarker('coursemap'), '[COURSEMAP]');
    assert.equal(markers.buildMarker('quizinfo'), '[QUIZINFO]');
    assert.equal(markers.buildMarker('classpanel'), '');
    assert.equal(markers.buildMarker('__proto__'), '');
});

test('the map writes only the options that are not the default', () => {
    assert.equal(markers.buildMarker('coursemap', {current: 'date', style: 'auto'}), '[COURSEMAP]');
    assert.equal(markers.buildMarker('coursemap', {current: 'progress'}), '[COURSEMAP current=progress]');
    assert.equal(markers.buildMarker('coursemap', {style: 'tiles'}), '[COURSEMAP style=tiles]');
    assert.equal(
        markers.buildMarker('coursemap', {current: 'progress', style: 'steps'}),
        '[COURSEMAP current=progress style=steps]'
    );
});

test('an option that is not known is the default, so nothing odd is written into the marker', () => {
    assert.equal(markers.buildMarker('coursemap', {current: 'x" onclick="y', style: '<b>'}), '[COURSEMAP]');
    assert.equal(markers.normalizeCurrent(undefined), 'date');
    assert.equal(markers.normalizeStyle(null), 'auto');
    assert.equal(markers.buildMarker('forumstats', {current: 'progress'}), '[FORUMSTATS]');
});

test('what the map writes it reads back, and a marker that says nothing gives the defaults', () => {
    [
        {current: 'date', style: 'auto'},
        {current: 'progress', style: 'auto'},
        {current: 'date', style: 'tiles'},
        {current: 'progress', style: 'steps'},
    ].forEach((options) => {
        assert.deepEqual(markers.parseCourseMapOptions(markers.buildMarker('coursemap', options)), options);
    });
    assert.deepEqual(markers.parseCourseMapOptions(''), {current: 'date', style: 'auto'});
    assert.deepEqual(markers.parseCourseMapOptions('[COURSEMAP current=bogus]'), {current: 'date', style: 'auto'});
});

test('the contract and the marker names are the ones of the filter', () => {
    assert.equal(markers.CONTRACT, 1);
    assert.deepEqual(markers.MARKERS, {forumstats: 'FORUMSTATS', coursemap: 'COURSEMAP', quizinfo: 'QUIZINFO'});
    assert.match(read('classes/plugininfo.php'), /private const WIDGETS_CONTRACT = 1;/);
});

test('the widget blocks are not components: they are offered by their own tab, and only for the widgets that are on', () => {
    const registry = read('amd/src/blocks/registry.js');
    const widgets = read('amd/src/blocks/widgets.js');

    assert.ok(!/^\s+widget[A-Z]\w*,$/m.test(registry), 'a widget block is in the Blocks list of the components');
    assert.match(registry, /export const widgetBlocks = \(enabled\) => Object\.values\(Widgets\)\.filter/);
    assert.match(registry, /return Object\.hasOwn\(Widgets, id\) \? Widgets\[id\] : undefined;/);
    ['widgetForumStats', 'widgetCourseMap', 'widgetQuizInfo'].forEach((id) => assert.match(widgets, new RegExp(`'${id}'`), id));
});

test('the tab is wired from the server to the Studio and is removed when there is no widget to offer', () => {
    const app = read('amd/src/app.js');

    assert.match(read('amd/src/plugin.js'), /getPluginOptionName\(pluginName, 'widgets'\)/);
    assert.match(read('amd/src/plugin.js'), /presetNotice, widgets, widgetsActive/);
    assert.match(app, /widgetBlocks\(widgetsEnabled\)\.length === 0/);
    assert.match(app, /getElementById\('slms-tab-widgets'\)\?\.closest\('li'\)\?\.remove\(\);/);
    assert.match(app, /if \(tabName === 'widgets'\) \{\s+await renderWidgetsTab\(\);\s+return true;/);
    assert.match(app, /if \(await showBlockTab\(tabName\)\) \{/);
    assert.match(app, /'widgets': 'tab_widgets',/);
    assert.match(read('templates/modal.mustache'), /id="slms-tab-widgets"/);
    assert.match(read('classes/plugininfo.php'), /'widgets'\s+=> self::get_widgets\(\),/);
});

test('the marker is hidden on a page and drawn in the editor, the canvas and the card', () => {
    ['styles.css', 'editor_styles.css'].forEach((file) => {
        const css = read(file);

        assert.match(css, /\.slms-widget-marker \{\s+display: none;/, file);
        assert.match(
            css,
            new RegExp('\\.mce-content-body \\.slms-widget-marker,\\s+\\.slms-canvas-block-preview \\.slms-widget-marker,'
                + '\\s+\\.slms-card-thumb-content \\.slms-widget-marker \\{\\s+display: block;'),
            file
        );
    });
    // The block holds only the marker, in the wrapper the filter keeps: no text of its own that would stay on a page.
    const template = read('templates/block_widget.mustache').replace(/\{\{!.*?\}\}/gs, '');
    assert.match(
        template,
        new RegExp('<div class="slms-block slms-widget-block slms-widget-\\{\\{widget\\}\\}">'
            + '<span class="slms-widget-marker">\\{\\{marker\\}\\}</span></div>')
    );
});

['en', 'pt_br'].forEach((lang) => {
    test(`${lang}: the strings of the Widgets tab are there, in order`, () => {
        const source = read(`lang/${lang}/tiny_studiolms.php`);
        const needed = [
            'tab_widgets', 'widgets_intro', 'widgets_inactive', 'toolbar_widget_options',
            'block_widget_forumstats_title', 'block_widget_coursemap_title', 'block_widget_quizinfo_title',
            'widget_forumstats_note', 'widget_coursemap_note', 'widget_quizinfo_note',
            'widget_current_label', 'widget_current_date', 'widget_current_progress', 'widget_current_hint',
            'widget_style_label', 'widget_style_auto', 'widget_style_steps', 'widget_style_tiles', 'widget_style_hint',
        ];
        needed.forEach((key) => assert.ok(source.includes(`$string['${key}'] = `), key));
        const keys = source.split('\n').map((line) => line.match(/^\$string\['([^']+)'\]/)?.[1]).filter(Boolean);
        assert.deepEqual(keys, [...keys].sort());
    });
});
