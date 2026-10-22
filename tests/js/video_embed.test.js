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
 * Headless tests for the video link parser, run via `node --test`.
 *
 * @package    tiny_studiolms
 * @copyright  2026 Jean Lúcio
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

'use strict';

const {test} = require('node:test');
const assert = require('node:assert/strict');

const parsePromise = import('../../amd/src/blocks/video_embed.js').then((module) => module.parseVideoUrl);

const YOUTUBE = 'https://www.youtube.com/embed/dQw4w9WgXcQ';

test('every usual form of a YouTube link gives the same embed address', async() => {
    const parse = await parsePromise;
    [
        'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        'https://youtube.com/watch?v=dQw4w9WgXcQ&t=42s',
        'https://m.youtube.com/watch?v=dQw4w9WgXcQ',
        'https://youtu.be/dQw4w9WgXcQ?si=abc',
        'https://www.youtube.com/embed/dQw4w9WgXcQ',
        'https://www.youtube.com/shorts/dQw4w9WgXcQ',
        'https://www.youtube.com/live/dQw4w9WgXcQ',
        'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
        'http://www.youtube.com/watch?v=dQw4w9WgXcQ',
        '  https://youtu.be/dQw4w9WgXcQ  ',
    ].forEach((link) => {
        assert.deepEqual(parse(link), {provider: 'youtube', embedUrl: YOUTUBE}, link);
    });
});

test('a Vimeo link gives the player address, keeping the hash of an unlisted video', async() => {
    const parse = await parsePromise;
    const plain = {provider: 'vimeo', embedUrl: 'https://player.vimeo.com/video/76979871'};
    const unlisted = {provider: 'vimeo', embedUrl: 'https://player.vimeo.com/video/76979871?h=a1b2c3d4e5'};

    assert.deepEqual(parse('https://vimeo.com/76979871'), plain);
    assert.deepEqual(parse('https://www.vimeo.com/76979871'), plain);
    assert.deepEqual(parse('https://player.vimeo.com/video/76979871'), plain);
    assert.deepEqual(parse('https://vimeo.com/76979871/a1b2c3d4e5'), unlisted);
    assert.deepEqual(parse('https://player.vimeo.com/video/76979871?h=a1b2c3d4e5&title=0'), unlisted);
});

test('a link to any other site is refused, even when its path looks like a video', async() => {
    const parse = await parsePromise;
    [
        'https://example.com/embed/dQw4w9WgXcQ',
        'https://example.com/v/dQw4w9WgXcQ',
        'https://example.com/watch?v=dQw4w9WgXcQ',
        'https://evil-youtube.com/watch?v=dQw4w9WgXcQ',
        'https://youtube.com.evil.example/watch?v=dQw4w9WgXcQ',
        'https://notvimeo.com/76979871',
        'https://vimeo.com.evil.example/76979871',
    ].forEach((link) => {
        assert.equal(parse(link), null, link);
    });
});

test('anything that is not a complete http(s) video link is refused', async() => {
    const parse = await parsePromise;
    [
        '',
        '   ',
        null,
        undefined,
        'dQw4w9WgXcQ',
        'youtube.com/watch?v=dQw4w9WgXcQ',
        // Built in two pieces so the linter does not take the string for a script URL.
        ['java', 'script:alert(1)'].join(''),
        'data:text/html,<p>x</p>',
        'https://www.youtube.com/watch',
        'https://www.youtube.com/watch?v=short',
        'https://www.youtube.com/',
        'https://vimeo.com/',
        'https://vimeo.com/channels/staffpicks',
        '[URL_DO_VIDEO]',
    ].forEach((link) => {
        assert.equal(parse(link), null, String(link));
    });
});
