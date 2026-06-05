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
 * Shared utilities for infographic-style blocks (stats, steps, future layouts).
 *
 * Exports: THEMES, ICON_UNICODE, ICONS, esc, normaliseIcon, iconToSpan, openPicker, closePicker.
 * ICONS is the single source of truth for the curated icon list shared by all infographic blocks.
 *
 * @module     tiny_studiolms/blocks/infographic_shared
 * @copyright  2026 Jean Lúcio <jeanlucio@gmail.com>
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

export const ICON_UNICODE = {
    'fa-solid fa-users': '',
    'fa-solid fa-chart-line': '',
    'fa-solid fa-book-open': '',
    'fa-solid fa-graduation-cap': '',
    'fa-solid fa-trophy': '',
    'fa-solid fa-star': '',
    'fa-solid fa-circle-check': '',
    'fa-solid fa-clock': '',
    'fa-solid fa-calendar': '',
    'fa-solid fa-lightbulb': '',
    'fa-solid fa-brain': '',
    'fa-solid fa-medal': '',
    'fa-solid fa-bullseye': '',
    'fa-solid fa-fire': '',
    'fa-solid fa-heart': '',
    'fa-solid fa-percent': '%',
    'fa-solid fa-arrow-up': '',
    'fa-solid fa-flag-checkered': '',
    'fa-solid fa-globe': '',
    'fa-solid fa-bolt': '',
    'fa-solid fa-circle-info': '',
    'fa-solid fa-magnifying-glass': '',
    'fa-solid fa-pen': '',
    'fa-solid fa-check': '',
    'fa-solid fa-upload': '',
    'fa-solid fa-download': '',
    'fa-solid fa-arrow-right': '',
    'fa-solid fa-play': '',
    'fa-solid fa-flag': '',
    'fa-solid fa-gear': '',
    'fa-solid fa-key': '',
    'fa-solid fa-lock': '',
    'fa-solid fa-envelope': '',
    'fa-solid fa-file': '',
    'fa-solid fa-rocket': '',
    'fa-solid fa-chart-bar': '',
    'fa-solid fa-laptop': '',
    'fa-solid fa-book': '',
    'fa-solid fa-flask': '',
    'fa-solid fa-code': '',
    'fa-solid fa-database': '',
    'fa-solid fa-user': '',
};

/**
 * Curated FA6 Free icon list — single source of truth for all infographic blocks and pickers.
 * Every icon here MUST have a corresponding entry in ICON_UNICODE above.
 */
export const ICONS = [
    'fa-solid fa-users',
    'fa-solid fa-chart-line',
    'fa-solid fa-chart-bar',
    'fa-solid fa-book-open',
    'fa-solid fa-book',
    'fa-solid fa-graduation-cap',
    'fa-solid fa-trophy',
    'fa-solid fa-medal',
    'fa-solid fa-star',
    'fa-solid fa-circle-check',
    'fa-solid fa-clock',
    'fa-solid fa-calendar',
    'fa-solid fa-lightbulb',
    'fa-solid fa-brain',
    'fa-solid fa-bullseye',
    'fa-solid fa-fire',
    'fa-solid fa-heart',
    'fa-solid fa-percent',
    'fa-solid fa-arrow-up',
    'fa-solid fa-globe',
    'fa-solid fa-bolt',
    'fa-solid fa-rocket',
    'fa-solid fa-laptop',
    'fa-solid fa-flask',
    'fa-solid fa-code',
    'fa-solid fa-database',
    'fa-solid fa-user',
    'fa-solid fa-gear',
    'fa-solid fa-key',
    'fa-solid fa-lock',
    'fa-solid fa-envelope',
    'fa-solid fa-flag',
    'fa-solid fa-magnifying-glass',
    'fa-solid fa-play',
    'fa-solid fa-check',
    'fa-solid fa-download',
    'fa-solid fa-upload',
    'fa-solid fa-arrow-right',
    'fa-solid fa-pen',
    'fa-solid fa-file',
];

/** Palette definitions for each named theme. */
export const THEMES = {
    blue: {
        bg: '#eff6ff',
        iconBg: '#dbeafe',
        iconColor: '#1d4ed8',
        valuColor: '#1e3a8a',
        labelColor: '#3b5280',
        titleColor: '#1e3a8a',
        borderColor: '#bfdbfe',
    },
    green: {
        bg: '#f0fdf4',
        iconBg: '#dcfce7',
        iconColor: '#15803d',
        valuColor: '#14532d',
        labelColor: '#2d6a4f',
        titleColor: '#14532d',
        borderColor: '#bbf7d0',
    },
    purple: {
        bg: '#faf5ff',
        iconBg: '#ede9fe',
        iconColor: '#7c3aed',
        valuColor: '#4c1d95',
        labelColor: '#5b3aa5',
        titleColor: '#4c1d95',
        borderColor: '#ddd6fe',
    },
    orange: {
        bg: '#fff7ed',
        iconBg: '#ffedd5',
        iconColor: '#c2410c',
        valuColor: '#7c2d12',
        labelColor: '#9a3412',
        titleColor: '#7c2d12',
        borderColor: '#fed7aa',
    },
    red: {
        bg: '#fff1f2',
        iconBg: '#ffe4e6',
        iconColor: '#be123c',
        valuColor: '#881337',
        labelColor: '#9f1239',
        titleColor: '#881337',
        borderColor: '#fecdd3',
    },
    black: {
        bg: '#f8fafc',
        iconBg: '#1e293b',
        iconColor: '#f1f5f9',
        valuColor: '#0f172a',
        labelColor: '#334155',
        titleColor: '#0f172a',
        borderColor: '#cbd5e1',
    },
};

/**
 * @param {string} text
 * @returns {string}
 */
export const esc = (text) => String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/**
 * Normalises an FA6 icon class string.
 * Accepts "fa-solid fa-users", "fas fa-users" or bare "fa-users".
 * Returns empty string when input is blank; callers decide their own fallback.
 * @param {string} raw
 * @returns {string}
 */
export const normaliseIcon = (raw) => {
    const s = String(raw || '').trim();
    if (!s) {
        return '';
    }
    if (/^(fa-solid|fa-regular|fa-brands|fas|far|fab)\s/.test(s)) {
        return s;
    }
    return `fa-solid ${s.startsWith('fa-') ? s : `fa-${s}`}`;
};

/**
 * Converts a FA6 icon class to an inline <span> using the embedded unicode codepoint.
 * Inline font-family is more reliable than ::before pseudo-elements in editor iframes.
 * Falls back to <i class="..."> when the codepoint is not in ICON_UNICODE.
 * @param {string} iconClass FA6 class string, e.g. "fa-solid fa-chart-line".
 * @returns {string} HTML string.
 */
export const iconToSpan = (iconClass) => {
    const ch = ICON_UNICODE[iconClass] || '';
    if (!ch) {
        return `<i class="${esc(iconClass)}" aria-hidden="true"></i>`;
    }
    return `<span aria-hidden="true" style="font-family:'Font Awesome 6 Free';`
        + `font-weight:900;font-style:normal;display:inline-block;">${ch}</span>`;
};

// ---------------------------------------------------------------------------
// Icon picker overlay — singleton shared across all infographic blocks.
// ---------------------------------------------------------------------------

let activePickerEl = null;
let activePickerRemoveOutside = null;

/** Closes and removes the icon picker overlay if open. */
export const closePicker = () => {
    if (activePickerEl) {
        activePickerEl.remove();
        activePickerEl = null;
    }
    if (activePickerRemoveOutside) {
        document.removeEventListener('click', activePickerRemoveOutside, true);
        document.removeEventListener('keydown', activePickerRemoveOutside, true);
        activePickerRemoveOutside = null;
    }
};

/**
 * Opens the icon picker near triggerBtn and calls onSelect(iconClass) on click.
 * Uses position:fixed so it works inside any stacking context.
 * @param {Element} triggerBtn
 * @param {Function} onSelect
 * @param {string[]} icons Array of FA6 icon class strings to show.
 */
export const openPicker = (triggerBtn, onSelect, icons) => {
    closePicker();

    const picker = document.createElement('div');
    picker.className = 'slms-ig-icon-picker';

    icons.forEach(cls => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'slms-ig-icon-option';
        btn.title = cls.replace('fa-solid fa-', '').replace(/-/g, ' ');
        btn.innerHTML = `<i class="${cls}" aria-hidden="true"></i>`;
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            onSelect(cls);
            closePicker();
        });
        picker.appendChild(btn);
    });

    document.body.appendChild(picker);
    activePickerEl = picker;

    const rect = triggerBtn.getBoundingClientRect();
    const pickerW = 176;
    const left = Math.min(rect.left, window.innerWidth - pickerW - 8);
    picker.style.top = `${rect.bottom + 4}px`;
    picker.style.left = `${left}px`;

    const dismiss = (e) => {
        if (e.type === 'keydown' && e.key !== 'Escape') {
            return;
        }
        if (e.type === 'click' && (picker.contains(e.target) || e.target === triggerBtn)) {
            return;
        }
        closePicker();
    };
    activePickerRemoveOutside = dismiss;
    setTimeout(() => {
        document.addEventListener('click', dismiss, true);
        document.addEventListener('keydown', dismiss, true);
    }, 0);
};
