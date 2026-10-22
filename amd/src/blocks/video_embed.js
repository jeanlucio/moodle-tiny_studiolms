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
 * Turns the link an author pastes into the address of a video player they can embed.
 *
 * Plain ES module with no core/* import, so Node can load it for the headless tests.
 *
 * @module     tiny_studiolms/blocks/video_embed
 * @copyright  2026 Jean Lúcio
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

const YOUTUBE_HOSTS = ['youtube.com', 'youtube-nocookie.com'];
const YOUTUBE_ID = /^[\w-]{11}$/;
const YOUTUBE_PATHS = ['embed', 'shorts', 'live', 'v'];
const VIMEO_ID = /^\d{6,}$/;
const VIMEO_HASH = /^[\da-f]{6,}$/i;

/**
 * Removes a leading "www." or "m." so one comparison covers a service's hosts.
 *
 * @param {string} hostname
 * @returns {string}
 */
const bareHost = (hostname) => hostname.toLowerCase().replace(/^(?:www|m|music)\./, '');

/**
 * Recognises a YouTube link.
 *
 * @param {URL} url
 * @returns {string|null} The embed address, or null.
 */
const youtubeEmbed = (url) => {
    const host = bareHost(url.hostname);
    const [, first, second] = url.pathname.split('/');
    let id = null;

    if (host === 'youtu.be') {
        id = first;
    } else if (YOUTUBE_HOSTS.includes(host) && first === 'watch') {
        id = url.searchParams.get('v');
    } else if (YOUTUBE_HOSTS.includes(host) && YOUTUBE_PATHS.includes(first)) {
        id = second;
    }
    return YOUTUBE_ID.test(id ?? '') ? `https://www.youtube.com/embed/${id}` : null;
};

/**
 * Recognises a Vimeo link, public or unlisted (the private hash after the id).
 *
 * @param {URL} url
 * @returns {string|null} The embed address, or null.
 */
const vimeoEmbed = (url) => {
    const host = bareHost(url.hostname);
    if (host !== 'vimeo.com' && host !== 'player.vimeo.com') {
        return null;
    }
    const parts = url.pathname.split('/').filter(Boolean);
    if (host === 'player.vimeo.com') {
        // The player link is /video/<id>, with the hash in the query string.
        parts.shift();
    }
    const [id, hash] = parts;
    if (!VIMEO_ID.test(id ?? '')) {
        return null;
    }
    const privateHash = [hash, url.searchParams.get('h')].find((candidate) => VIMEO_HASH.test(candidate ?? ''));
    return `https://player.vimeo.com/video/${id}${privateHash ? `?h=${privateHash}` : ''}`;
};

/**
 * Works out which player a pasted link belongs to.
 *
 * Only http(s) links to YouTube or Vimeo are accepted, whatever else the link contains.
 *
 * @param {string} value What the author typed or pasted.
 * @returns {{provider: string, embedUrl: string}|null} Null when the link is not a video the block can embed.
 */
export const parseVideoUrl = (value) => {
    let url;
    try {
        url = new URL(String(value ?? '').trim());
    } catch {
        return null;
    }
    if (url.protocol !== 'https:' && url.protocol !== 'http:') {
        return null;
    }
    const youtube = youtubeEmbed(url);
    if (youtube) {
        return {provider: 'youtube', embedUrl: youtube};
    }
    const vimeo = vimeoEmbed(url);
    return vimeo ? {provider: 'vimeo', embedUrl: vimeo} : null;
};
