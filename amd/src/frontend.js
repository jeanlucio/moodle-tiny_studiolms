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
 * Student-facing frontend engine for StudioLMS blocks.
 *
 * Loaded on course/module pages. Handles runtime block behaviours
 * (accordion toggle, sounds, hover effects) that need JavaScript.
 *
 * Templates use <div> instead of <details>/<summary> because Moodle's
 * HTMLPurifier (XHTML 1.0 Transitional) strips those HTML5 elements.
 * State is encoded via the .slms-closed CSS class; sounds via .slms-snd-*;
 * hover effects via .slms-hov-* — all class-based to survive purification.
 *
 * @module     tiny_studiolms/frontend
 * @copyright  2026 Jean Lúcio
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import {eventTypes as filterEventTypes} from 'core_filters/events';
import {splitEmoji, hasTextBesidesEmoji} from './emoji_text';

const SELECTORS = {
    ACCORDION_SUMMARY: '.studiolms-accordion-summary',
    RESOURCES_SUMMARY: '.studiolms-resources-summary',
    // Every block root carries data-slms-block-type, so this also matches the blocks that need no script
    // of their own (heading, table, charts): the page still has to be cleaned of editing attributes.
    ANY_BLOCK: '[data-slms-block-type]',
};

/**
 * Every element under a root that matches a selector, the root itself included.
 *
 * A node handed over by filterContentUpdated can be a block itself, which querySelectorAll() on it would skip.
 *
 * @param {Element|Document} root Where to look.
 * @param {string} selector CSS selector.
 * @returns {Element[]}
 */
const within = (root, selector) => {
    const found = [...root.querySelectorAll(selector)];
    return root.matches?.(selector) ? [root, ...found] : found;
};

// Counter for unique IDs assigned to accordion/resources toggle pairs.
let toggleCounter = 0;

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
 * Remove contenteditable from all StudioLMS block elements and their descendants.
 *
 * contenteditable is required inside TinyMCE for inline editing, and HTMLPurifier
 * allows it, so it survives into the student-facing page. Screen readers (NVDA, JAWS,
 * VoiceOver) announce contenteditable="true" regions as "editable area" or "text",
 * which confuses students reading course content that should be read-only.
 *
 * @param {Element|Document} root The page, or a piece of content that has just entered it.
 */
const stripEditorAttributes = (root) => {
    // Every block root carries data-slms-block-type: the blocks inside root, and the ones that are root itself.
    within(root, '[data-slms-block-type]').forEach((block) => {
        within(block, '[contenteditable]').forEach(el => el.removeAttribute('contenteditable'));
    });
};

/**
 * Read the configured sound from the .slms-snd-* class on an element.
 *
 * @param {Element} el
 * @returns {string} Sound type, or 'none'.
 */
const getSoundClass = (el) => {
    const match = [...el.classList].find(c => c.startsWith('slms-snd-'));
    return match ? match.replace('slms-snd-', '') : 'none';
};

/**
 * Wire up click and keyboard toggle handlers for all accordion and resources
 * summary divs. Each toggle flips the .slms-closed class on the container
 * and plays the configured open sound.
 *
 * Each summary/panel pair receives unique IDs so that aria-controls can
 * associate the button with its controlled panel, following the WAI-ARIA
 * Accordion pattern (APG).
 *
 * @param {Element|Document} root The page, or a piece of content that has just entered it.
 */
const initToggles = (root) => {
    const summarySelector = `${SELECTORS.ACCORDION_SUMMARY}, ${SELECTORS.RESOURCES_SUMMARY}`;
    within(root, summarySelector).forEach(summary => {
        // A summary already wired must not get a second pair of handlers, or one click would toggle twice.
        if (summary.dataset.slmsBound === '1') {
            return;
        }
        summary.dataset.slmsBound = '1';

        const container = summary.closest('.studiolms-accordion, .studiolms-resources');
        if (!container) {
            return;
        }

        const isAccordion = container.classList.contains('studiolms-accordion');
        const contentEl = container.querySelector(
            isAccordion ? '.studiolms-accordion-content' : '.studiolms-resources-content'
        );

        const uid = ++toggleCounter;
        const btnId = `slms-toggle-${uid}`;
        const panelId = `slms-panel-${uid}`;

        summary.setAttribute('id', btnId);
        summary.setAttribute('role', 'button');
        summary.setAttribute('tabindex', '0');
        summary.setAttribute('aria-expanded', container.classList.contains('slms-closed') ? 'false' : 'true');

        if (contentEl) {
            contentEl.setAttribute('id', panelId);
            summary.setAttribute('aria-controls', panelId);
        }

        const toggle = () => {
            const wasClosed = container.classList.contains('slms-closed');
            container.classList.toggle('slms-closed');
            summary.setAttribute('aria-expanded', wasClosed ? 'true' : 'false');
            if (wasClosed) {
                playSound(getSoundClass(container));
            }
        };

        summary.addEventListener('click', toggle);
        summary.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggle();
            }
        });
    });
};

/**
 * Attach click-sound handlers to button <a> elements.
 * Only wires up elements whose class includes slms-snd-* with a non-"none" value.
 *
 * @param {Element|Document} root The page, or a piece of content that has just entered it.
 */
const initButtonSounds = (root) => {
    within(root, 'a.studiolms-btn').forEach(el => {
        if (el.dataset.slmsSoundBound === '1') {
            return;
        }
        el.dataset.slmsSoundBound = '1';
        const sound = getSoundClass(el);
        if (sound && sound !== 'none') {
            el.addEventListener('click', () => playSound(sound));
        }
    });
};

/**
 * Remove contenteditable from any button <a> elements saved before the
 * block_button.mustache was updated to use contenteditable="false" on the anchor.
 * Without this, legacy buttons remain non-clickable for students.
 *
 * @param {Element|Document} root The page, or a piece of content that has just entered it.
 */
const fixLegacyButtons = (root) => {
    within(root, 'a.studiolms-btn[contenteditable]').forEach(btn => {
        btn.removeAttribute('contenteditable');
    });
};

/**
 * Hide the emoji of the blocks from screen readers.
 *
 * An emoji in a block is an illustration, and a screen reader would read its name ("file folder", "calendar")
 * in front of the words. aria-hidden cannot be stored with the content: Moodle's HTMLPurifier removes it, so
 * it is set here, as the toggle attributes of the accordions are. An emoji that is all an element says (a
 * button with only a calendar) stays, or the element would be left without a name.
 *
 * @param {Element|Document} root The page, or a piece of content that has just entered it.
 */
const hideDecorativeEmoji = (root) => {
    const texts = [];
    within(root, SELECTORS.ANY_BLOCK).forEach((block) => {
        const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT);
        while (walker.nextNode()) {
            texts.push(walker.currentNode);
        }
    });

    texts.forEach((node) => {
        const parent = node.parentElement;
        // Already hidden (by an earlier pass, or by a block that did it itself), or not text a reader reads.
        if (!parent || parent.closest('[aria-hidden="true"], script, style') || !node.isConnected) {
            return;
        }
        const pieces = splitEmoji(node.data);
        if (!pieces.some((piece) => piece.emoji)) {
            return;
        }
        const container = parent.closest('h1, h2, h3, h4, h5, h6, p, li, a, button, [role="heading"], div') ?? parent;
        if (!hasTextBesidesEmoji(container.textContent)) {
            return;
        }
        // An icon span that holds only the emoji is hidden itself, with no span added inside it.
        if (parent !== container && pieces.length === 1) {
            parent.setAttribute('aria-hidden', 'true');
            return;
        }
        const fragment = document.createDocumentFragment();
        pieces.forEach((piece) => {
            if (!piece.emoji) {
                fragment.append(piece.text);
                return;
            }
            const span = document.createElement('span');
            span.setAttribute('aria-hidden', 'true');
            span.textContent = piece.text;
            fragment.append(span);
        });
        node.replaceWith(fragment);
    });
};

/**
 * Wire every StudioLMS block under a root.
 *
 * @param {Element|Document} root The page, or a piece of content that has just entered it.
 */
const initIn = (root) => {
    if (!root.querySelector || (!within(root, SELECTORS.ANY_BLOCK).length)) {
        return;
    }
    stripEditorAttributes(root);
    initToggles(root);
    fixLegacyButtons(root);
    initButtonSounds(root);
    hideDecorativeEmoji(root);
};

/**
 * Initialise the StudioLMS frontend engine.
 *
 * Runs on the blocks the page already holds and on the content that enters it later: the course editor
 * replaces a whole activity when it is moved, shown or hidden, and some pages load content by AJAX, and in
 * both cases the core announces it with filterContentUpdated. Without that, a closed accordion in such content
 * has no handler and, with its panel hidden by the stylesheet, can never be opened.
 */
export const init = () => {
    initIn(document);
    document.addEventListener(filterEventTypes.filterContentUpdated, (event) => {
        Array.from(event.detail?.nodes ?? []).forEach(initIn);
    });
};
