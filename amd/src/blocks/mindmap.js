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
 * Mind Map block definition — renders a pure SVG diagram with optional AI generation.
 *
 * @module     tiny_studiolms/blocks/mindmap
 * @copyright  2026 Jean Lúcio <jeanlucio@gmail.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import Templates from 'core/templates';
import {call as ajaxCall} from 'core/ajax';
import {getString} from 'core/str';

const W = 900;
const H = 620;
const CX = W / 2;
const CY = H / 2;

const COLORS = {
    blue: {
        bg: '#f0f9ff',
        centerFill: '#1e3a8a', centerText: '#ffffff',
        branchFills: ['#2563eb', '#1d4ed8', '#3b82f6', '#1e40af', '#60a5fa', '#1e40af'],
        branchText: '#ffffff',
        childFill: '#dbeafe', childText: '#1e40af',
        lineColor: '#93c5fd',
    },
    green: {
        bg: '#f0fdf4',
        centerFill: '#14532d', centerText: '#ffffff',
        branchFills: ['#16a34a', '#15803d', '#22c55e', '#166534', '#4ade80', '#15803d'],
        branchText: '#ffffff',
        childFill: '#dcfce7', childText: '#14532d',
        lineColor: '#86efac',
    },
    purple: {
        bg: '#faf5ff',
        centerFill: '#581c87', centerText: '#ffffff',
        branchFills: ['#9333ea', '#7c3aed', '#a855f7', '#6d28d9', '#c084fc', '#7c3aed'],
        branchText: '#ffffff',
        childFill: '#f3e8ff', childText: '#581c87',
        lineColor: '#c084fc',
    },
    orange: {
        bg: '#fff7ed',
        centerFill: '#7c2d12', centerText: '#ffffff',
        branchFills: ['#ea580c', '#f97316', '#c2410c', '#fb923c', '#f97316', '#c2410c'],
        branchText: '#ffffff',
        childFill: '#ffedd5', childText: '#7c2d12',
        lineColor: '#fdba74',
    },
};

/**
 * Escapes a string for safe embedding inside SVG text nodes.
 * @param {string} text
 * @returns {string}
 */
const svgEsc = (text) => String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/**
 * Splits text into at most two lines for SVG rendering.
 * Breaks at the last space near the midpoint; forces a hard split when no space exists.
 * @param {string} text
 * @param {number} lineMax Max characters per line before attempting a break.
 * @returns {string[]} Array with 1 or 2 strings.
 */
const wrapText = (text, lineMax) => {
    const t = String(text || '');
    if (t.length <= lineMax) {
        return [t];
    }
    const mid = Math.ceil(t.length / 2);
    let split = t.lastIndexOf(' ', mid + 5);
    if (split < 1) {
        split = t.indexOf(' ', mid - 5);
    }
    if (split < 1) {
        return [t.substring(0, lineMax), t.substring(lineMax, lineMax * 2)];
    }
    const l1 = t.substring(0, split).trim();
    const l2 = t.substring(split).trim();
    return [l1, l2.length > lineMax + 3 ? l2.substring(0, lineMax + 2) + '…' : l2];
};

/**
 * Builds the SVG markup for the mind map from block data.
 * @param {object} data Block data with topic, theme and branches array.
 * @returns {string} Complete SVG string.
 */
const buildSvg = (data) => {
    const c = COLORS[data.theme] || COLORS.blue;
    const topic = String(data.topic || 'Tópico Principal');
    const branches = Array.isArray(data.branches) ? data.branches.slice(0, 8) : [];
    const N = branches.length;

    // Adaptive branch radius so all nodes fit inside the expanded viewport (H=620).
    const R1 = N <= 4 ? 175 : (N <= 6 ? 158 : 140);
    // R2 must exceed (BW/2 + KW/2) = 60+52 = 112 to guarantee no overlap between
    // a branch node and its perpendicular-row children on horizontal branches.
    const R2 = 120;

    // Node dimensions (branch = BW×BH, child = KW×KH; height doubles for 2-line labels).
    const BW = 120;
    const KW = 104;

    const parts = [];

    parts.push(
        `<svg xmlns="http://www.w3.org/2000/svg" `
        + `viewBox="-10 -10 ${W + 20} ${H + 20}" `
        + `style="width:100%;max-width:${W}px;height:auto;display:block;">`
    );
    parts.push(
        `<rect x="-10" y="-10" width="${W + 20}" height="${H + 20}" rx="10" fill="${c.bg}"/>`
    );

    const branchPos = branches.map((b, i) => {
        const angle = (i / N) * Math.PI * 2 - Math.PI / 2;
        return {
            x: CX + R1 * Math.cos(angle),
            y: CY + R1 * Math.sin(angle),
            angle,
            b,
            colorIdx: i % c.branchFills.length,
        };
    });

    // Precompute child positions using a perpendicular-row layout.
    // Children are arranged in a straight line perpendicular to the branch direction,
    // centred at distance R2 outward from the branch node. This eliminates overlapping
    // that occurs when a radial fan is used on vertical or near-vertical branches.
    const CHILD_SPACING = 116; // px between adjacent child centres

    const childPositions = (bx, by, angle, children) => {
        const M = children.length;
        if (M === 0) {
            return [];
        }
        const outX = R2 * Math.cos(angle);
        const outY = R2 * Math.sin(angle);
        const perpAngle = angle + Math.PI / 2;
        const px = Math.cos(perpAngle);
        const py = Math.sin(perpAngle);
        return children.map((child, j) => {
            const offset = (j - (M - 1) / 2) * CHILD_SPACING;
            return {
                x: bx + outX + offset * px,
                y: by + outY + offset * py,
                label: child,
            };
        });
    };

    // Connector lines — drawn below nodes.
    branchPos.forEach(({x: bx, y: by, angle, b, colorIdx}) => {
        const bFill = c.branchFills[colorIdx];
        const cPos = childPositions(bx, by, angle, b.children || []);

        // Center → branch: quadratic bezier for a smooth curve.
        const mx = (CX + bx) / 2;
        parts.push(
            `<path d="M${CX},${CY} Q${mx.toFixed(1)},${CY} ${bx.toFixed(1)},${by.toFixed(1)}" `
            + `stroke="${c.lineColor}" stroke-width="2.5" fill="none" opacity="0.8"/>`
        );

        // Branch → children: straight lines in the branch colour.
        cPos.forEach(({x: kx, y: ky}) => {
            parts.push(
                `<line x1="${bx.toFixed(1)}" y1="${by.toFixed(1)}" `
                + `x2="${kx.toFixed(1)}" y2="${ky.toFixed(1)}" `
                + `stroke="${bFill}" stroke-width="1.5" opacity="0.5"/>`
            );
        });
    });

    // Nodes — drawn above connectors.
    branchPos.forEach(({x: bx, y: by, angle, b, colorIdx}) => {
        const bFill = c.branchFills[colorIdx];
        const cPos = childPositions(bx, by, angle, b.children || []);

        const bLines = wrapText(b.label, 15);
        const bh = bLines.length > 1 ? 44 : 36;
        parts.push(
            `<rect x="${(bx - BW / 2).toFixed(1)}" y="${(by - bh / 2).toFixed(1)}" `
            + `width="${BW}" height="${bh}" rx="${(bh / 2).toFixed(0)}" fill="${bFill}"/>`
        );
        if (bLines.length === 1) {
            parts.push(
                `<text x="${bx.toFixed(1)}" y="${(by + 4).toFixed(1)}" `
                + `text-anchor="middle" fill="${c.branchText}" `
                + `font-size="11" font-weight="600" font-family="system-ui,sans-serif">`
                + `${svgEsc(bLines[0])}</text>`
            );
        } else {
            parts.push(
                `<text x="${bx.toFixed(1)}" y="${(by - 5).toFixed(1)}" `
                + `text-anchor="middle" fill="${c.branchText}" `
                + `font-size="11" font-weight="600" font-family="system-ui,sans-serif">`
                + `${svgEsc(bLines[0])}</text>`
            );
            parts.push(
                `<text x="${bx.toFixed(1)}" y="${(by + 9).toFixed(1)}" `
                + `text-anchor="middle" fill="${c.branchText}" `
                + `font-size="11" font-weight="600" font-family="system-ui,sans-serif">`
                + `${svgEsc(bLines[1])}</text>`
            );
        }

        cPos.forEach(({x: kx, y: ky, label}) => {
            const kLines = wrapText(label, 13);
            const kh = kLines.length > 1 ? 36 : 28;
            parts.push(
                `<rect x="${(kx - KW / 2).toFixed(1)}" y="${(ky - kh / 2).toFixed(1)}" `
                + `width="${KW}" height="${kh}" rx="${(kh / 2).toFixed(0)}" `
                + `fill="${c.childFill}" stroke="${bFill}" stroke-width="1.5"/>`
            );
            if (kLines.length === 1) {
                parts.push(
                    `<text x="${kx.toFixed(1)}" y="${(ky + 4).toFixed(1)}" `
                    + `text-anchor="middle" fill="${c.childText}" `
                    + `font-size="10" font-family="system-ui,sans-serif">`
                    + `${svgEsc(kLines[0])}</text>`
                );
            } else {
                parts.push(
                    `<text x="${kx.toFixed(1)}" y="${(ky - 4).toFixed(1)}" `
                    + `text-anchor="middle" fill="${c.childText}" `
                    + `font-size="10" font-family="system-ui,sans-serif">`
                    + `${svgEsc(kLines[0])}</text>`
                );
                parts.push(
                    `<text x="${kx.toFixed(1)}" y="${(ky + 8).toFixed(1)}" `
                    + `text-anchor="middle" fill="${c.childText}" `
                    + `font-size="10" font-family="system-ui,sans-serif">`
                    + `${svgEsc(kLines[1])}</text>`
                );
            }
        });
    });

    // Center node — drawn last, always on top.
    const cw = 144, ch = 52;
    parts.push(
        `<rect x="${(CX - cw / 2 + 2).toFixed(1)}" y="${(CY - ch / 2 + 3).toFixed(1)}" `
        + `width="${cw}" height="${ch}" rx="${ch / 2}" fill="rgba(0,0,0,0.15)"/>`
    );
    parts.push(
        `<rect x="${(CX - cw / 2).toFixed(1)}" y="${(CY - ch / 2).toFixed(1)}" `
        + `width="${cw}" height="${ch}" rx="${ch / 2}" fill="${c.centerFill}"/>`
    );

    const MAX_TOPIC = 14;
    if (topic.length <= MAX_TOPIC) {
        parts.push(
            `<text x="${CX}" y="${(CY + 5).toFixed(1)}" `
            + `text-anchor="middle" fill="${c.centerText}" `
            + `font-size="13" font-weight="700" font-family="system-ui,sans-serif">`
            + `${svgEsc(topic)}</text>`
        );
    } else {
        // Split at the last space before the midpoint for a clean two-line break.
        let split = topic.lastIndexOf(' ', Math.floor(topic.length / 2) + 6);
        if (split < 3) {
            split = MAX_TOPIC - 1;
        }
        const l1 = topic.substring(0, split).substring(0, MAX_TOPIC);
        const l2 = topic.substring(split).trim().substring(0, MAX_TOPIC);
        parts.push(
            `<text x="${CX}" y="${(CY - 4).toFixed(1)}" `
            + `text-anchor="middle" fill="${c.centerText}" `
            + `font-size="12" font-weight="700" font-family="system-ui,sans-serif">`
            + `${svgEsc(l1)}</text>`
        );
        parts.push(
            `<text x="${CX}" y="${(CY + 13).toFixed(1)}" `
            + `text-anchor="middle" fill="${c.centerText}" `
            + `font-size="12" font-weight="700" font-family="system-ui,sans-serif">`
            + `${svgEsc(l2)}</text>`
        );
    }

    parts.push('</svg>');
    return parts.join('');
};

/**
 * Parses the branches textarea text into the branches array format.
 * Each non-empty line is one branch; children follow a colon: "Label: child1, child2"
 * @param {string} text Raw textarea content.
 * @returns {Array<{label: string, children: string[]}>}
 */
const parseBranchesText = (text) => String(text || '').split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .slice(0, 8)
    .map(line => {
        const idx = line.indexOf(':');
        if (idx === -1) {
            return {label: line.substring(0, 30), children: []};
        }
        return {
            label: line.substring(0, idx).trim().substring(0, 30),
            children: line.substring(idx + 1)
                .split(',')
                .map(c => c.trim())
                .filter(c => c.length > 0)
                .slice(0, 5)
                .map(c => c.substring(0, 20)),
        };
    });

/**
 * Serialises the branches array back to the textarea text format.
 * @param {Array<{label: string, children: string[]}>} branches
 * @returns {string}
 */
const serializeBranchesText = (branches) => {
    if (!Array.isArray(branches)) {
        return '';
    }
    return branches.map(b => {
        if (!b.children || b.children.length === 0) {
            return String(b.label || '');
        }
        return String(b.label || '') + ': ' + b.children.join(', ');
    }).join('\n');
};

export default {
    id: 'mindmap',
    titleString: 'block_mindmap_title',
    icon: '🧠',

    defaultData: {
        topic: 'Tópico Principal',
        theme: 'blue',
        branches: [
            {label: 'Conceito A', children: []},
            {label: 'Conceito B', children: []},
            {label: 'Conceito C', children: []},
            {label: 'Conceito D', children: []},
        ],
    },

    buildToolbar: async(container, data, onUpdate, PopupManager) => {
        try {
            const {html, js} = await Templates.renderForPromise('tiny_studiolms/toolbar_mindmap', {});
            Templates.replaceNodeContents(container, html, js);

            const btnEdit = container.querySelector('#tb-mindmap-edit');
            if (!btnEdit) {
                return;
            }

            btnEdit.addEventListener('click', () => {
                const tplData = {
                    topic: data.topic || '',
                    branches_text: serializeBranchesText(data.branches || []),
                    theme_blue: (data.theme || 'blue') === 'blue',
                    theme_green: data.theme === 'green',
                    theme_purple: data.theme === 'purple',
                    theme_orange: data.theme === 'orange',
                };

                PopupManager.open(btnEdit, 'tiny_studiolms/popup_mindmap_edit', tplData, (popup) => {
                    const topicEl = popup.querySelector('#mm_topic');
                    const branchesEl = popup.querySelector('#mm_branches');
                    const themeButtons = popup.querySelectorAll('.slms-mm-theme-btn');
                    const aiBtnEl = popup.querySelector('#mm-ai-btn');
                    const aiPromptEl = popup.querySelector('#mm_ai_prompt');
                    const aiSpinner = popup.querySelector('#mm-ai-spinner');
                    const aiError = popup.querySelector('#mm-ai-error');

                    const applyChanges = () => {
                        if (topicEl) {
                            data.topic = topicEl.value.trim() || 'Tópico Principal';
                        }
                        if (branchesEl) {
                            data.branches = parseBranchesText(branchesEl.value);
                        }
                        onUpdate(data);
                    };

                    if (topicEl) {
                        topicEl.addEventListener('input', applyChanges);
                    }
                    if (branchesEl) {
                        branchesEl.addEventListener('input', applyChanges);
                    }

                    themeButtons.forEach(btn => {
                        btn.addEventListener('click', () => {
                            themeButtons.forEach(b => b.classList.remove('selected'));
                            btn.classList.add('selected');
                            data.theme = btn.getAttribute('data-theme') || 'blue';
                            onUpdate(data);
                        });
                    });

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
                                    methodname: 'tiny_studiolms_generate_mindmap',
                                    args: {topic: prompt},
                                }]);
                                const result = await promise;

                                data.topic = result.topic || prompt;
                                data.branches = JSON.parse(result.branches || '[]');

                                if (topicEl) {
                                    topicEl.value = data.topic;
                                }
                                if (branchesEl) {
                                    branchesEl.value = serializeBranchesText(data.branches);
                                }
                                onUpdate(data);
                            } catch (err) {
                                if (aiError) {
                                    let msg = '';
                                    try {
                                        msg = await getString('mindmap_ai_error', 'tiny_studiolms');
                                    } catch (_) {
                                        msg = 'Erro ao gerar mapa. Tente novamente.';
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
        const svgContent = buildSvg(data);
        return Templates.render('tiny_studiolms/block_mindmap', {svgContent});
    },
};
