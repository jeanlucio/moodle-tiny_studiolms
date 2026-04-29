// This file is part of Moodle - http://moodle.org/
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
// along with Moodle.  If not, see <http://www.gnu.org/licenses/>.

/**
 * Student-facing frontend engine for StudioLMS blocks.
 *
 * Loaded on course/module pages. Handles runtime block behaviours
 * (accordion initial state) that need JavaScript on the student view.
 *
 * @module     tiny_studiolms/frontend
 * @copyright  2026 Jean Lúcio <jeanlucio@gmail.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

const SELECTORS = {
    ACCORDION: 'details.studiolms-accordion',
    WEBTECA: 'details.studiolms-webteca',
    ANY_BLOCK: '.studiolms-accordion, .studiolms-webteca, .studiolms-card, .studiolms-callout-wrap',
};

/**
 * Synthesise a short sound using the Web Audio API.
 *
 * @param {string} type - One of: click, chime, pop.
 */
const playSound = (type) => {
    if (!type || type === 'none') {
        return;
    }
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();

        if (type === 'click') {
            const bufLen = Math.floor(ctx.sampleRate * 0.06);
            const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
            const data = buf.getChannelData(0);
            for (let i = 0; i < bufLen; i++) {
                data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufLen * 0.25));
            }
            const src = ctx.createBufferSource();
            src.buffer = buf;
            const filter = ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.value = 900;
            const gain = ctx.createGain();
            gain.gain.value = 0.35;
            src.connect(filter);
            filter.connect(gain);
            gain.connect(ctx.destination);
            src.start();
        } else if (type === 'chime') {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.value = 880;
            gain.gain.setValueAtTime(0.4, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.5);
        } else if (type === 'pop') {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(220, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(55, ctx.currentTime + 0.09);
            gain.gain.setValueAtTime(0.45, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.1);
        }
    } catch (e) {
        // Web Audio API unavailable — silent fail.
    }
};

/**
 * Remove the `open` attribute from details elements whose initial state is "closed".
 * The mustache templates render all details as open so the HTML is valid and
 * predictable; this function applies the author-configured state on page load.
 */
const applyInitialStates = () => {
    const selector =
        `${SELECTORS.ACCORDION}[data-initial-state="closed"],` +
        `${SELECTORS.WEBTECA}[data-initial-state="closed"]`;

    document.querySelectorAll(selector).forEach(details => {
        details.removeAttribute('open');
    });
};

/**
 * Attach click-sound handlers to buttons and open-sound handlers to accordions.
 * Only wires up elements that carry a data-slms-sound attribute with a non-"none" value.
 */
const initSounds = () => {
    document.querySelectorAll('a.studiolms-btn[data-slms-sound]').forEach(el => {
        const sound = el.dataset.slmsSound;
        if (sound && sound !== 'none') {
            el.addEventListener('click', () => playSound(sound));
        }
    });

    const detailsSelector =
        `${SELECTORS.ACCORDION}[data-slms-sound], ${SELECTORS.WEBTECA}[data-slms-sound]`;
    document.querySelectorAll(detailsSelector).forEach(el => {
        const sound = el.dataset.slmsSound;
        if (sound && sound !== 'none') {
            el.addEventListener('toggle', () => {
                if (el.open) {
                    playSound(sound);
                }
            });
        }
    });
};

/**
 * Remove contenteditable from any button <a> elements saved before the
 * block_button.mustache was updated to use contenteditable="false" on the anchor.
 * Without this, legacy buttons remain non-clickable for students.
 */
const fixLegacyButtons = () => {
    document.querySelectorAll('a.studiolms-btn[contenteditable]').forEach(btn => {
        btn.removeAttribute('contenteditable');
    });
};

/**
 * Initialise the StudioLMS frontend engine.
 * Exits immediately if no StudioLMS blocks are present on the page.
 */
export const init = () => {
    if (!document.querySelector(SELECTORS.ANY_BLOCK)) {
        return;
    }
    applyInitialStates();
    fixLegacyButtons();
    initSounds();
};
