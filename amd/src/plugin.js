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
 * Tiny StudioLMS plugin.
 *
 * @module     tiny_studiolms/plugin
 * @copyright  2026 Jean Lúcio
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import {getTinyMCE} from 'editor_tiny/loader';
import {getPluginMetadata, addToolbarButton, addMenubarItem, getButtonImage} from 'editor_tiny/utils';
import {getPluginOptionName} from 'editor_tiny/options';
import {getString} from 'core/str';
import {initStudioApp} from './app';
import Templates from 'core/templates';
import Modal from 'core/modal';
import ModalEvents from 'core/modal_events';
import Notification from 'core/notification';

const component = 'tiny_studiolms';
const pluginName = `${component}/plugin`;
const buttonName = component;
const enabledOption = getPluginOptionName(pluginName, 'enabled');
const canManageGlobalOption = getPluginOptionName(pluginName, 'canmanageglobaltemplates');
const presetsOption = getPluginOptionName(pluginName, 'presets');
const hasAiOption = getPluginOptionName(pluginName, 'hasai');
const policyAgreedOption = getPluginOptionName(pluginName, 'policyagreed');
const presetNoticeOption = getPluginOptionName(pluginName, 'presetnotice');
const contextIdOption = getPluginOptionName(pluginName, 'contextid');
const aiHubKeysUrlOption = getPluginOptionName(pluginName, 'aihubkeysurl');
const widgetsOption = getPluginOptionName(pluginName, 'widgets');
const widgetsActiveOption = getPluginOptionName(pluginName, 'widgetsactive');


export default Promise.all([
    getTinyMCE(),
    getPluginMetadata(component, pluginName),
    getString('button_tooltip', component),
    getString('button_link_locked', component),
    getString('modal_title', component),
    getString('pluginname', component),
    getButtonImage('icon', component),
]).then(([
    tinyMCE,
    pluginMetadata,
    tooltip,
    buttonLinkLocked,
    modalTitle,
    pluginNameStr,
    buttonImage,
]) => {

    tinyMCE.PluginManager.add(pluginName, (editor) => {

        editor.options.register(enabledOption, {
            processor: 'boolean',
            'default': false,
        });

        editor.options.register(canManageGlobalOption, {
            processor: 'boolean',
            'default': false,
        });

        editor.options.register(presetsOption, {
            processor: 'array',
            'default': [],
        });

        editor.options.register(hasAiOption, {
            processor: 'boolean',
            'default': false,
        });

        editor.options.register(policyAgreedOption, {
            processor: 'boolean',
            'default': false,
        });

        editor.options.register(presetNoticeOption, {
            processor: 'boolean',
            'default': false,
        });

        editor.options.register(contextIdOption, {
            processor: 'int',
            'default': 0,
        });

        editor.options.register(aiHubKeysUrlOption, {
            processor: 'string',
            'default': '',
        });

        // The widgets the StudioLMS widgets filter offers here, and whether the filter is on in this context.
        editor.options.register(widgetsOption, {
            processor: 'array',
            'default': [],
        });

        editor.options.register(widgetsActiveOption, {
            processor: 'boolean',
            'default': true,
        });

        // Tracks the last block clicked when the cursor cannot land inside it (e.g. SVG-based blocks).
        // evt.target always reports the actual clicked element, even inside SVG namespaced nodes,
        // so this is more reliable than editor.selection.getNode() for non-editable content.
        let activeNonEditableBlock = null;

        const getActiveSlmsBlock = () => {
            const selectedNode = editor.selection.getNode();
            let slmsBlock = selectedNode.closest('[data-slms-block-type]');

            if (!slmsBlock && selectedNode.hasAttribute('data-slms-block-type')) {
                slmsBlock = selectedNode;
            }

            // Fallback for fully non-editable blocks (no inner contenteditable="true") such as
            // SVG-based blocks where TinyMCE cannot position the cursor and getNode() lands
            // outside the block.
            if (!slmsBlock && activeNonEditableBlock && activeNonEditableBlock.isConnected) {
                slmsBlock = activeNonEditableBlock;
            }

            // When cursor is inside a grid slot, the intent is to insert a new block, not edit the grid.
            if (slmsBlock && slmsBlock.getAttribute('data-slms-block-type') === 'gridcards') {
                const slot = selectedNode.closest('.slms-grid-slot');
                if (slot && slmsBlock.contains(slot)) {
                    slmsBlock = null;
                }
            }

            return slmsBlock;
        };

        // The anchor of an action button is the block's own markup: its address and text are set in the
        // StudioLMS panel. The generic link tools would rewrite or remove it and leave a plain label, so
        // they are refused whenever the selection touches a button.
        const LINK_COMMANDS = ['mcelink', 'mceinsertlink', 'createlink', 'unlink'];

        const selectionTouchesButton = () => {
            const range = editor.selection.getRng();
            return [...editor.getBody().querySelectorAll('a.studiolms-btn')].some((anchor) => range.intersectsNode(anchor));
        };

        // Inside the editor the button is only something to edit: following its link would open the
        // address (usually in a new tab) every time the teacher clicks the text to change it.
        const blockButtonNavigation = (evt) => {
            if (evt.target.closest?.('a.studiolms-btn')) {
                evt.preventDefault();
            }
        };
        editor.on('click', blockButtonNavigation);
        // The editor does not forward the middle button, so it is listened to on the document itself.
        editor.on('init', () => editor.getDoc().addEventListener('auxclick', blockButtonNavigation, true));

        editor.on('BeforeExecCommand', (evt) => {
            if (LINK_COMMANDS.includes(String(evt.command).toLowerCase()) && selectionTouchesButton()) {
                evt.preventDefault();
                editor.notificationManager.open({text: buttonLinkLocked, type: 'info', timeout: 4000});
            }
        });

        const SELECTED_CLASS = 'slms-noneditable-selected';

        // Detect clicks on fully non-editable blocks (SVG, images, etc.) that TinyMCE cannot
        // select via cursor placement. evt.target traverses SVG namespaced nodes correctly.
        editor.on('click', (evt) => {
            const block = evt.target.closest('[data-slms-block-type]');
            const isFullyNonEditable = block && !block.querySelector('[contenteditable="true"]');

            // Remove highlight from the previously selected block.
            if (activeNonEditableBlock && activeNonEditableBlock !== block) {
                activeNonEditableBlock.classList.remove(SELECTED_CLASS);
            }

            if (isFullyNonEditable) {
                activeNonEditableBlock = block;
                block.classList.add(SELECTED_CLASS);
                editor.nodeChanged();
            } else {
                activeNonEditableBlock = null;
            }
        });


        const openStudioModal = async() => {
            try {
                const slmsBlock = getActiveSlmsBlock();

                let editData = null;
                if (slmsBlock) {
                    editData = {
                        node: slmsBlock,
                        type: slmsBlock.getAttribute('data-slms-block-type'),
                        state: slmsBlock.getAttribute('data-slms-state'),
                        tplName: slmsBlock.getAttribute('data-slms-tpl-name') || null
                    };
                }

                const modalBodyHtml = await Templates.render(`${component}/modal`, {});

                const modal = await Modal.create({
                    title: modalTitle,
                    body: modalBodyHtml,
                    large: true,
                });

                const modalRoot = modal.getRoot();
                modalRoot.find('.modal-dialog').removeClass('modal-lg').addClass('modal-xl studiolms-modal-dialog');
                modalRoot.find('.modal-header').addClass('slms-modal-header-branded');
                modalRoot.find('.modal-body').addClass('studiolms-modal-body');
                modalRoot.on(ModalEvents.hidden, () => modal.destroy());

                // Prevent modal from closing when the user starts a drag inside the
                // dialog and releases the mouse on the backdrop (Moodle closes on click
                // whose target is the .modal root element).
                const modalDomEl = modalRoot[0];
                const dialogDomEl = modalRoot.find('.modal-dialog')[0];
                if (modalDomEl && dialogDomEl) {
                    dialogDomEl.addEventListener('mousedown', () => {
                        modalDomEl.addEventListener('click', (e) => {
                            if (e.target === modalDomEl) {
                                e.stopImmediatePropagation();
                            }
                        }, {once: true, capture: true});
                    });
                }

                modal.show();

                const canManageGlobal = editor.options.get(canManageGlobalOption);
                const presets = editor.options.get(presetsOption) || [];
                const hasAi = editor.options.get(hasAiOption);
                const contextId = editor.options.get(contextIdOption);
                const aiHubKeysUrl = editor.options.get(aiHubKeysUrlOption);
                const policyAgreed = editor.options.get(policyAgreedOption);
                const presetNotice = editor.options.get(presetNoticeOption);
                const widgets = editor.options.get(widgetsOption) || [];
                const widgetsActive = editor.options.get(widgetsActiveOption);
                initStudioApp(
                    editor, modal, editData, canManageGlobal, presets, hasAi, contextId, aiHubKeysUrl, policyAgreed,
                    presetNotice, widgets, widgetsActive
                );
            } catch (error) {
                Notification.exception(error);
            }
        };

        editor.ui.registry.addIcon(buttonName, buttonImage.html);

        editor.ui.registry.addToggleButton(buttonName, {
            icon: buttonName,
            tooltip: tooltip,
            onAction: openStudioModal,
            onSetup: (api) => {
                const nodeChangeHandler = () => {
                    const slmsBlock = getActiveSlmsBlock();
                    // Activate button state only when cursor is inside an existing block.
                    api.setActive(slmsBlock !== null);
                };
                editor.on('NodeChange', nodeChangeHandler);
                return () => editor.off('NodeChange', nodeChangeHandler);
            }
        });

        editor.ui.registry.addMenuItem(buttonName, {
            icon: buttonName,
            text: pluginNameStr,
            onAction: openStudioModal
        });

        return pluginMetadata;
    });

    const configure = (instanceConfig) => {
        const customAttrs = '*[data-slms-block-type|data-slms-state|contenteditable|aria-hidden]';

        const extendedValid = instanceConfig.extended_valid_elements
            ? instanceConfig.extended_valid_elements + ',' + customAttrs
            : customAttrs;

        const wwwroot = (window.M && window.M.cfg && window.M.cfg.wwwroot) || '';
        const fa6FontFace = wwwroot
            ? `@font-face{font-family:'Font Awesome 6 Free';font-weight:900;font-style:normal;`
              + `font-display:block;src:url('${wwwroot}/lib/fonts/fa-solid-900.woff2') format('woff2'),`
              + `url('${wwwroot}/lib/fonts/fa-solid-900.ttf') format('truetype');}`
            : '';

        // The editor frame of a Bootstrap 4 site (Moodle 4.5) gets none of the theme's utility classes, and the markup
        // of the blocks leans on them: without these the layout falls apart while editing. Each one is limited to the
        // blocks and carries the value the page theme gives it, so the frame looks the way the page does.
        const utilities = {
            'align-middle': 'vertical-align: middle',
            'badge': 'display: inline-block; padding: 0.25em 0.4em; font-size: 75%; font-weight: 700; line-height: 1; ' +
                'text-align: center; white-space: nowrap; vertical-align: baseline; border-radius: 0.5rem',
            'bg-light': 'background-color: #f8f9fa',
            'bg-white': 'background-color: #ffffff',
            'border': 'border: 1px solid #dee2e6',
            'border-bottom': 'border-bottom: 1px solid #dee2e6',
            'd-block': 'display: block',
            'd-flex': 'display: flex',
            'flex-column': 'flex-direction: column',
            'flex-grow-1': 'flex-grow: 1',
            'fs-5': 'font-size: 1.25rem',
            'fw-bold': 'font-weight: 700',
            'gap-1': 'gap: 0.25rem',
            'h-100': 'height: 100%',
            'm-0': 'margin: 0',
            'mb-1': 'margin-bottom: 0.25rem',
            'mb-3': 'margin-bottom: 1rem',
            'mb-4': 'margin-bottom: 1.5rem',
            'me-2': 'margin-inline-end: 0.5rem',
            'me-3': 'margin-inline-end: 1rem',
            'ms-3': 'margin-inline-start: 1rem',
            'mt-4': 'margin-top: 1.5rem',
            'my-3': 'margin-top: 1rem; margin-bottom: 1rem',
            'my-4': 'margin-top: 1.5rem; margin-bottom: 1.5rem',
            'object-fit-cover': 'object-fit: cover',
            'p-3': 'padding: 1rem',
            'p-4': 'padding: 1.5rem',
            'pb-2': 'padding-bottom: 0.5rem',
            'rounded': 'border-radius: 0.375rem',
            'small': 'font-size: 0.875em',
            'table': 'width: 100%; border-collapse: collapse',
            'text-center': 'text-align: center',
            'text-dark': 'color: #212529',
            'text-end': 'text-align: end',
            'text-muted': 'color: #6c757d',
            'text-secondary': 'color: #6c757d',
            'text-start': 'text-align: start',
            'user-select-none': 'user-select: none',
            'w-100': 'width: 100%',
        };
        const blockRoot = 'body.mce-content-body [data-slms-block-type]';
        // The frame does not inherit the page's typography either (Moodle 4.5 even sizes it differently), so the
        // blocks start from what the page body uses. :where() keeps these as fallbacks that any rule of a block beats.
        const pageStyle = window.getComputedStyle(document.body);
        const pageFontSize = parseFloat(pageStyle.fontSize) || 15;
        const pageLineHeight = (parseFloat(pageStyle.lineHeight) / pageFontSize) || 1.5;
        // Headings typed inside a block take the sizes the page gives them, not the frame's own.
        const headingCss = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].map((tag) => {
            const probe = document.createElement(tag);
            probe.textContent = 'x';
            probe.style.cssText = 'position: absolute; visibility: hidden;';
            document.body.appendChild(probe);
            const style = window.getComputedStyle(probe);
            const rule = `font-size: ${style.fontSize}; font-weight: ${style.fontWeight}; ` +
                `line-height: ${style.lineHeight}; margin: ${style.marginTop} 0 ${style.marginBottom}`;
            probe.remove();
            return `:where(${blockRoot} ${tag}) { ${rule}; }`;
        }).join('\n');
        // Table cells likewise: Bootstrap 4 and 5 pad them differently.
        const tableProbe = document.createElement('table');
        tableProbe.className = 'table';
        tableProbe.style.cssText = 'position: absolute; visibility: hidden;';
        tableProbe.innerHTML = '<tbody><tr><td>x</td></tr></tbody>';
        document.body.appendChild(tableProbe);
        const cellPadding = window.getComputedStyle(tableProbe.querySelector('td')).padding;
        tableProbe.remove();
        const utilityClassCss = Object.entries(utilities)
            .map(([name, rule]) => `${blockRoot}.${name}, ${blockRoot} .${name} { ${rule}; }`)
            .join('\n');
        const utilityCss = `
            ${headingCss}
            :where(${blockRoot}, ${blockRoot} *, ${blockRoot} *::before, ${blockRoot} *::after) {
                box-sizing: border-box; }
            :where(${blockRoot}) {
                font-size: ${pageFontSize}px;
                line-height: ${pageLineHeight};
                font-family: ${pageStyle.fontFamily}, sans-serif;
                color: ${pageStyle.color}; }
            :where(${blockRoot} svg) {
                vertical-align: middle; }
            ${blockRoot} .table :where(th, td) {
                padding: ${cellPadding}; }
            ${blockRoot} .table-bordered :where(th, td) {
                border: 1px solid #dee2e6; }
            ${blockRoot} .table-striped > tbody > tr:nth-of-type(odd) > * {
                box-shadow: inset 0 0 0 9999px rgba(0, 0, 0, 0.03); }
            ${utilityClassCss}
        `;

        // The look of the blocks is in editor_styles.css, which the theme serves to the editor frame, and the frame
        // gets nothing of it from here but what that file cannot win: the highlight of a selected block, and the
        // two rules below, where TinyMCE's own link colour and table border outweigh a class selector (the specificity
        // of "body.mce-content-body" is what beats them). A rule that repeats the stylesheet does harm: it outweighs
        // the class variants of it, which is how a card set side by side showed stacked in the editor.
        const editorCss = `${fa6FontFace}${utilityCss}
            body.mce-content-body .slms-noneditable-selected {
                outline: 2px solid #2276d2;
                outline-offset: 2px;
                border-radius: 4px; }
            body.mce-content-body a.studiolms-resources-item,
            body.mce-content-body a.studiolms-resources-item:hover,
            body.mce-content-body a.studiolms-resources-item:focus {
                color: inherit; }
            body.mce-content-body .studiolms-table th {
                border: 1px solid var(--bs-border-color, #dee2e6); }
        `;

        const contentStyle = instanceConfig.content_style
            ? instanceConfig.content_style + editorCss
            : editorCss;

        return {
            toolbar: addToolbarButton(instanceConfig.toolbar, 'content', buttonName),
            menu: addMenubarItem(instanceConfig.menu, 'insert', buttonName),
            // eslint-disable-next-line camelcase
            extended_valid_elements: extendedValid,
            // eslint-disable-next-line camelcase
            content_style: contentStyle,
        };
    };

    return [pluginName, {configure}];
});
