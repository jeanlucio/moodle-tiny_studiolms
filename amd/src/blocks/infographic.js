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
 * Infographic block — renders stat cards with FA6 icons and optional AI generation.
 *
 * The `layout` field in defaultData is the extensibility hook: future layouts
 * (steps, features, timeline, comparison) register a renderer in RENDERERS and
 * appear in the layout selector in the popup.
 *
 * @module     tiny_studiolms/blocks/infographic
 * @copyright  2026 Jean Lúcio <jeanlucio@gmail.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import Templates from 'core/templates';
import {call as ajaxCall} from 'core/ajax';
import {getString} from 'core/str';

/** Curated FA6 Free icons for the visual picker (5 columns × 4 rows = 20 icons). */
const ICONS = [
    'fa-solid fa-users',
    'fa-solid fa-chart-line',
    'fa-solid fa-book-open',
    'fa-solid fa-graduation-cap',
    'fa-solid fa-trophy',
    'fa-solid fa-star',
    'fa-solid fa-circle-check',
    'fa-solid fa-clock',
    'fa-solid fa-calendar',
    'fa-solid fa-lightbulb',
    'fa-solid fa-brain',
    'fa-solid fa-medal',
    'fa-solid fa-bullseye',
    'fa-solid fa-fire',
    'fa-solid fa-heart',
    'fa-solid fa-percent',
    'fa-solid fa-arrow-up',
    'fa-solid fa-flag-checkered',
    'fa-solid fa-globe',
    'fa-solid fa-bolt',
];

const DEFAULT_ICON = 'fa-solid fa-circle-info';

/**
 * FA6 Free Solid unicode codepoints for each icon in ICONS.
 * Using text content + inline font-family avoids relying on ::before pseudo-elements
 * that may fail when CSS classes are not available in the editor iframe or saved content.
 * @type {Object.<string, string>}
 */
const ICON_UNICODE = {
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
};

/**
 * Converts an FA6 icon class to a <span> with inline font-family.
 * Embedding the Unicode character as text content is more reliable than
 * relying on ::before pseudo-elements, which require the FA6 CSS rules to
 * cascade correctly in every rendering context (editor iframe, saved content).
 * @param {string} iconClass FA6 class string, e.g. "fa-solid fa-chart-line".
 * @returns {string} HTML string.
 */
const iconToSpan = (iconClass) => {
    const ch = ICON_UNICODE[iconClass] || ICON_UNICODE[DEFAULT_ICON] || '';
    if (!ch) {
        return `<i class="${esc(iconClass)}" aria-hidden="true"></i>`;
    }
    return `<span aria-hidden="true" style="font-family:'Font Awesome 6 Free';`
        + `font-weight:900;font-style:normal;display:inline-block;">${ch}</span>`;
};

/** Palette definitions for each named theme. */
const THEMES = {
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
};

/**
 * Escapes a string for safe embedding in HTML attribute values and text nodes.
 * @param {string} text
 * @returns {string}
 */
const esc = (text) => String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/**
 * Normalises an FA6 icon class string.
 * Accepts "fa-solid fa-users", "fas fa-users" or bare "fa-users".
 * Falls back to DEFAULT_ICON when blank.
 * @param {string} raw
 * @returns {string}
 */
const normaliseIcon = (raw) => {
    const s = String(raw || '').trim();
    if (!s) {
        return DEFAULT_ICON;
    }
    if (/^(fa-solid|fa-regular|fa-brands|fas|far|fab)\s/.test(s)) {
        return s;
    }
    return `fa-solid ${s.startsWith('fa-') ? s : `fa-${s}`}`;
};

// ---------------------------------------------------------------------------
// Icon picker overlay (shared singleton across all item rows).
// ---------------------------------------------------------------------------

let activePickerEl = null;
let activePickerRemoveOutside = null;

/** Closes and removes the icon picker overlay if open. */
const closePicker = () => {
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
 */
const openPicker = (triggerBtn, onSelect) => {
    closePicker();

    const picker = document.createElement('div');
    picker.className = 'slms-ig-icon-picker';

    ICONS.forEach(cls => {
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

    // Position with fixed coords so it is not clipped by overflow:hidden parents.
    const rect = triggerBtn.getBoundingClientRect();
    const pickerW = 176; // 5 cols × 32px + 4 gaps × 4px + 2×8px padding = 176
    const left = Math.min(rect.left, window.innerWidth - pickerW - 8);
    const top = rect.bottom + 4;
    picker.style.top = `${top}px`;
    picker.style.left = `${left}px`;

    // Close on outside click or Escape.
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

// ---------------------------------------------------------------------------
// Layout renderers — add future layouts here.
// ---------------------------------------------------------------------------

/**
 * Builds the inner HTML for the "stats" layout.
 * @param {object} data Block data.
 * @param {object} c Theme colour palette.
 * @returns {string} HTML string.
 */
const buildStatsHtml = (data, c) => {
    const items = Array.isArray(data.items) ? data.items.filter(i => i.value || i.label) : [];
    if (!items.length) {
        return '';
    }
    const parts = [];

    if (data.title && data.title.trim()) {
        parts.push(
            `<div class="slms-infographic__title" style="color:${c.titleColor};">`
            + esc(data.title.trim())
            + `</div>`
        );
    }

    parts.push(`<div class="slms-infographic__grid">`);
    items.forEach(item => {
        const iconClass = normaliseIcon(item.icon);
        parts.push(
            `<div class="slms-infographic__stat" style="background:${c.bg};border-color:${c.borderColor};">`
            + `<div class="slms-infographic__icon" style="background:${c.iconBg};color:${c.iconColor};">`
            + iconToSpan(iconClass)
            + `</div>`
            + `<div class="slms-infographic__value" style="color:${c.valuColor};">${esc(item.value)}</div>`
            + `<div class="slms-infographic__label" style="color:${c.labelColor};">${esc(item.label)}</div>`
            + `</div>`
        );
    });
    parts.push(`</div>`);

    return parts.join('');
};

/**
 * Registry of layout renderers.
 * To add a new layout: implement a buildXxxHtml(data, palette) function and add it here.
 * @type {Object.<string, Function>}
 */
const RENDERERS = {
    stats: buildStatsHtml,
};

// ---------------------------------------------------------------------------
// Popup data helpers.
// ---------------------------------------------------------------------------

/**
 * Converts data.items to flat popup template variables.
 * @param {object} data
 * @returns {object}
 */
const dataToPopupVars = (data) => {
    const items = Array.isArray(data.items) ? data.items : [];
    const out = {
        title: data.title || '',
        themeBlue: (data.theme || 'blue') === 'blue',
        themeGreen: data.theme === 'green',
        themePurple: data.theme === 'purple',
        themeOrange: data.theme === 'orange',
    };
    for (let i = 0; i < 4; i++) {
        const item = items[i] || {};
        out[`item${i + 1}_icon`] = item.icon || DEFAULT_ICON;
        out[`item${i + 1}_value`] = item.value || '';
        out[`item${i + 1}_label`] = item.label || '';
    }
    return out;
};

/**
 * Reads the 4 item rows from the popup DOM back into data.items.
 * @param {Element} popup
 * @param {object} data
 */
const readItemsFromPopup = (popup, data) => {
    const items = [];
    for (let i = 1; i <= 4; i++) {
        const icon = popup.querySelector(`#ig_item${i}_icon`)?.value?.trim() || DEFAULT_ICON;
        const value = popup.querySelector(`#ig_item${i}_value`)?.value?.trim() || '';
        const label = popup.querySelector(`#ig_item${i}_label`)?.value?.trim() || '';
        if (value || label) {
            items.push({icon, value, label});
        }
    }
    data.items = items.length ? items : [{icon: DEFAULT_ICON, value: '–', label: ''}];
};

// ---------------------------------------------------------------------------
// Block export.
// ---------------------------------------------------------------------------

export default {
    id: 'infographic',
    titleString: 'block_infographic_title',
    icon: '📊',

    defaultData: {
        layout: 'stats',
        title: '',
        theme: 'blue',
        items: [
            {icon: 'fa-solid fa-chart-line', value: '85%', label: 'Taxa de aprovação'},
            {icon: 'fa-solid fa-book-open', value: '12', label: 'Módulos concluídos'},
            {icon: 'fa-solid fa-users', value: '240', label: 'Participantes'},
        ],
    },

    buildToolbar: async(container, data, onUpdate, PopupManager) => {
        try {
            const {html, js} = await Templates.renderForPromise('tiny_studiolms/toolbar_infographic', {});
            Templates.replaceNodeContents(container, html, js);

            const btnEdit = container.querySelector('#tb-infographic-edit');
            if (!btnEdit) {
                return;
            }

            btnEdit.addEventListener('click', () => {
                // Close any lingering picker when popup opens.
                closePicker();

                const tplData = dataToPopupVars(data);

                PopupManager.open(btnEdit, 'tiny_studiolms/popup_infographic_edit', tplData, (popup) => {
                    const titleEl = popup.querySelector('#ig_title');
                    const themeButtons = popup.querySelectorAll('.slms-ig-theme-btn');
                    const aiBtnEl = popup.querySelector('#ig-ai-btn');
                    const aiPromptEl = popup.querySelector('#ig_ai_prompt');
                    const aiSpinner = popup.querySelector('#ig-ai-spinner');
                    const aiError = popup.querySelector('#ig-ai-error');

                    const applyChanges = () => {
                        if (titleEl) {
                            data.title = titleEl.value.trim();
                        }
                        readItemsFromPopup(popup, data);
                        onUpdate(data);
                    };

                    if (titleEl) {
                        titleEl.addEventListener('input', applyChanges);
                    }

                    // Value and label field listeners.
                    for (let i = 1; i <= 4; i++) {
                        ['value', 'label'].forEach(field => {
                            popup.querySelector(`#ig_item${i}_${field}`)
                                ?.addEventListener('input', applyChanges);
                        });
                    }

                    // Icon picker buttons.
                    for (let i = 1; i <= 4; i++) {
                        const iconBtn = popup.querySelector(`.slms-ig-icon-btn[data-item="${i}"]`);
                        const iconInput = popup.querySelector(`#ig_item${i}_icon`);
                        if (iconBtn && iconInput) {
                            iconBtn.addEventListener('click', (e) => {
                                e.stopPropagation();
                                openPicker(iconBtn, (cls) => {
                                    iconInput.value = cls;
                                    const iEl = iconBtn.querySelector('i');
                                    if (iEl) {
                                        iEl.className = `${cls}`;
                                    }
                                    applyChanges();
                                });
                            });
                        }
                    }

                    // Theme picker.
                    themeButtons.forEach(btn => {
                        btn.addEventListener('click', () => {
                            themeButtons.forEach(b => b.classList.remove('selected'));
                            btn.classList.add('selected');
                            data.theme = btn.getAttribute('data-theme') || 'blue';
                            onUpdate(data);
                        });
                    });

                    // AI generation.
                    if (aiBtnEl && aiPromptEl) {
                        aiBtnEl.addEventListener('click', async() => {
                            const prompt = aiPromptEl.value.trim();
                            if (!prompt) {
                                return;
                            }
                            aiBtnEl.disabled = true;
                            aiSpinner?.classList.remove('d-none');
                            if (aiError) {
                                aiError.textContent = '';
                                aiError.classList.add('d-none');
                            }

                            try {
                                const [promise] = ajaxCall([{
                                    methodname: 'tiny_studiolms_generate_infographic',
                                    args: {topic: prompt},
                                }]);
                                const result = await promise;

                                data.title = result.title || '';
                                data.items = JSON.parse(result.items || '[]');

                                // Repopulate popup fields.
                                if (titleEl) {
                                    titleEl.value = data.title;
                                }
                                const newVars = dataToPopupVars(data);
                                for (let i = 1; i <= 4; i++) {
                                    const iconInput = popup.querySelector(`#ig_item${i}_icon`);
                                    const iconBtn = popup.querySelector(`.slms-ig-icon-btn[data-item="${i}"]`);
                                    const valueEl = popup.querySelector(`#ig_item${i}_value`);
                                    const labelEl = popup.querySelector(`#ig_item${i}_label`);
                                    const newIcon = newVars[`item${i}_icon`] || DEFAULT_ICON;
                                    if (iconInput) {
                                        iconInput.value = newIcon;
                                    }
                                    if (iconBtn) {
                                        const iEl = iconBtn.querySelector('i');
                                        if (iEl) {
                                            iEl.className = newIcon;
                                        }
                                    }
                                    if (valueEl) {
                                        valueEl.value = newVars[`item${i}_value`];
                                    }
                                    if (labelEl) {
                                        labelEl.value = newVars[`item${i}_label`];
                                    }
                                }
                                onUpdate(data);
                            } catch (err) {
                                if (aiError) {
                                    let msg = '';
                                    try {
                                        msg = await getString('infographic_ai_error', 'tiny_studiolms');
                                    } catch (_) {
                                        msg = 'Erro ao gerar infográfico. Tente novamente.';
                                    }
                                    aiError.textContent = msg;
                                    aiError.classList.remove('d-none');
                                }
                            } finally {
                                aiBtnEl.disabled = false;
                                aiSpinner?.classList.add('d-none');
                            }
                        });
                    }
                });
            });
        } catch (error) {
            container.innerHTML = '';
            const errEl = document.createElement('div');
            errEl.className = 'text-danger small';
            try {
                errEl.textContent = await getString('error_loading_form', 'tiny_studiolms');
            } catch (_) {
                errEl.textContent = 'Error';
            }
            container.appendChild(errEl);
        }
    },

    renderHtml: async(data) => {
        const theme = data.theme || 'blue';
        const palette = THEMES[theme] || THEMES.blue;
        const layout = data.layout || 'stats';
        const renderer = RENDERERS[layout] || RENDERERS.stats;
        const content = renderer(data, palette);

        return Templates.render('tiny_studiolms/block_infographic', {
            layout,
            theme,
            content,
        });
    },
};
