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
 * Tiny StudioLMS plugin.
 *
 * @module     tiny_studiolms/plugin
 * @copyright  2026 Jean Lúcio <jeanlucio@gmail.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import {getTinyMCE} from 'editor_tiny/loader';
import {getPluginMetadata, addToolbarButton, addMenubarItem} from 'editor_tiny/utils';
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

const brushIcon = '<svg width="24" height="24" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" fill="currentColor">' +
    '<path d="M15.825.12a.5.5 0 0 1 .132.584c-1.53 3.43-4.743 8.17-7.095 10.64a6.1 6.1 0 0 1-2.373 1.534' +
    'c-.018.227-.06.538-.16.868-.201.659-.667 1.479-1.708 1.74a8.1 8.1 0 0 1-3.078.132 4 4 0 0 1-.562-.135 ' +
    '1.4 1.4 0 0 1-.466-.247.7.7 0 0 1-.204-.288.62.62 0 0 1 .004-.443c.095-.245.316-.38.461-.452.394-.197' +
    '.625-.453.867-.826.095-.144.184-.297.287-.472l.117-.198c.151-.255.326-.54.546-.848.528-.739 1.201-.925 ' +
    '1.746-.896q.19.012.348.048c.062-.172.142-.38.238-.608.261-.619.658-1.419 1.187-2.069 ' +
    '2.176-2.67 6.18-6.206 9.117-8.104a.5.5 0 0 1 .596.04M4.705 11.912a1.2 1.2 0 0 0-.419-.1' +
    'c-.246-.013-.573.05-.879.479-.197.275-.355.532-.5.777l-.105.177c-.106.181-.213.362-.32.528' +
    'a3.4 3.4 0 0 1-.76.861c.69.112 1.736.111 2.657-.12.559-.139.843-.569.993-1.06a3 3 0 0 0 .126-.75' +
    'zm1.44.026c.12-.04.277-.1.458-.183a5.1 5.1 0 0 0 1.535-1.1c1.9-1.996 4.412-5.57 6.052-8.631' +
    '-2.59 1.927-5.566 4.66-7.302 6.792-.442.543-.795 1.243-1.042 1.826-.121.288-.214.54-.275.72' +
    'v.001l.575.575zm-4.973 3.04.007-.005zm3.582-3.043.002.001h-.002z"/></svg>';

export default Promise.all([
    getTinyMCE(),
    getPluginMetadata(component, pluginName),
    getString('button_tooltip', component),
    getString('modal_title', component),
    getString('pluginname', component),
]).then(([
    tinyMCE,
    pluginMetadata,
    tooltip,
    modalTitle,
    pluginNameStr,
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

        const getActiveSlmsBlock = () => {
            const selectedNode = editor.selection.getNode();
            let slmsBlock = selectedNode.closest('[data-slms-block-type]');

            if (!slmsBlock && selectedNode.hasAttribute('data-slms-block-type')) {
                slmsBlock = selectedNode;
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
                initStudioApp(editor, modal, editData, canManageGlobal, presets, hasAi);
            } catch (error) {
                Notification.exception(error);
            }
        };

        editor.ui.registry.addIcon(buttonName, brushIcon);

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

        const editorCss = `
            body.mce-content-body div.slms-grid-slot {
                border: 2px dashed #cbd5e1;
                background-color: rgba(241, 245, 249, 0.4);
                min-height: 70px;
                border-radius: 8px;
                padding: 8px; }
            body.mce-content-body .studiolms-accordion {
                border: 1px solid #e2e8f0;
                border-radius: 8px;
                overflow: hidden;
                background-color: var(--slms-bg, #ffffff);
                margin-bottom: 1.5rem; }
            body.mce-content-body .studiolms-accordion summary {
                display: block;
                list-style: none;
                outline: none;
                cursor: pointer;
                margin: 0;
                padding: 0; }
            body.mce-content-body .studiolms-accordion summary::-webkit-details-marker {
                display: none; }
            body.mce-content-body .studiolms-accordion-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 1rem 1.5rem;
                font-weight: bold;
                font-size: 1.1rem;
                color: var(--slms-color, inherit); }
            body.mce-content-body .studiolms-accordion-content {
                padding: 1.5rem;
                border-top: 1px solid #e2e8f0;
                background: transparent;
                font-weight: normal;
                color: #212529;
                outline: none; }
            body.mce-content-body a.studiolms-btn,
            body.mce-content-body a.studiolms-btn:hover,
            body.mce-content-body a.studiolms-btn:focus,
            body.mce-content-body a.studiolms-btn[data-mce-selected] {
                display: var(--slms-display, inline-flex);
                width: var(--slms-w, auto);
                box-sizing: border-box;
                align-items: center;
                justify-content: center;
                gap: 6px;
                padding: 12px 24px;
                font-family: inherit;
                font-weight: 600;
                font-size: 15px;
                text-decoration: none;
                border-radius: var(--slms-radius, 6px);
                background-color: var(--slms-bg, #0d47a1);
                color: var(--slms-color, #ffffff);
                border: 1px solid transparent;
                box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
                transition: all 0.2s ease;
                cursor: pointer;
                outline: none; }
            body.mce-content-body .studiolms-callout-wrap {
                background-color: var(--slms-bg, #fef9c3);
                border-left: var(--slms-border-w, 4px) solid var(--slms-border-c, #eab308);
                border-radius: var(--slms-radius, 6px);
                padding: 1rem 1.25rem;
                display: flex;
                align-items: flex-start;
                gap: 1rem;
                margin-bottom: 1.5rem;
                box-sizing: border-box;
                width: 100%; }
            body.mce-content-body .slms-callout-icon {
                font-size: 1.5rem;
                line-height: 1;
                flex-shrink: 0;
                user-select: none; }
            body.mce-content-body .slms-callout-content {
                flex-grow: 1;
                color: var(--slms-text, inherit);
                font-size: 1rem;
                line-height: 1.5;
                outline: none; }
            body.mce-content-body .studiolms-card {
                display: flex;
                flex-direction: var(--slms-dir, column);
                background-color: var(--slms-bg, #ffffff);
                color: var(--slms-color, #333333);
                border: 1px solid #e2e8f0;
                border-left: 6px solid var(--slms-border-c, #0d47a1);
                border-radius: var(--slms-radius, 8px);
                box-shadow: var(--slms-shadow, none);
                overflow: hidden;
                width: 100%;
                max-width: 900px;
                margin: 1.5rem 0; }
            body.mce-content-body .studiolms-card-media {
                flex: var(--slms-media-flex, 1 1 auto);
                min-height: 200px;
                border-right: var(--slms-media-border-r, none);
                border-bottom: var(--slms-media-border-b, 1px solid #e2e8f0); }
            body.mce-content-body .studiolms-card-content {
                flex: 1 1 auto;
                padding: 1.5rem;
                display: flex;
                flex-direction: column; }
            body.mce-content-body .studiolms-grid-wrap {
                background: var(--slms-bg, transparent);
                border: var(--slms-border, none);
                border-radius: var(--slms-radius, 0px);
                padding: var(--slms-pad, 0px);
                width: 100%;
                box-sizing: border-box;
                margin-bottom: 1.5rem; }
            body.mce-content-body .studiolms-grid-content {
                display: grid;
                gap: var(--slms-gap, 20px);
                grid-template-columns: var(--slms-cols, repeat(2, 1fr)); }
            body.mce-content-body .studiolms-heading-h3 {
                background-color: var(--slms-bg, transparent);
                color: var(--slms-color, inherit);
                padding: 8px;
                border-radius: 6px;
                margin: 0;
                font-size: 1.5rem;
                display: flex;
                align-items: center; }
            body.mce-content-body .studiolms-heading-h4 {
                background-color: var(--slms-bg, transparent);
                border-left: 6px solid var(--slms-color, inherit);
                padding: 8px;
                margin: 0;
                font-size: 1.25rem;
                color: #333;
                display: flex;
                align-items: center; }
            body.mce-content-body .studiolms-table th {
                background-color: var(--slms-bg, #0f172a);
                color: var(--slms-color, #ffffff);
                padding: 12px;
                border: 1px solid rgba(0, 0, 0, 0.1);
                font-weight: 600;
                text-align: left;
                vertical-align: middle; }
            body.mce-content-body .studiolms-webteca {
                border: 1px solid #e2e8f0;
                border-radius: 8px;
                overflow: hidden;
                background-color: var(--slms-bg, #ffffff);
                box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
                margin-bottom: 1.5rem; }
            body.mce-content-body .studiolms-webteca-summary {
                background-color: var(--slms-header-bg, #f8f9fa);
                border-bottom: 1px solid #e2e8f0;
                padding: 1.25rem 1.5rem;
                display: flex;
                justify-content: space-between;
                align-items: center; }
            body.mce-content-body .studiolms-webteca-list {
                list-style: none;
                padding: 0;
                margin: 0;
                display: flex;
                flex-direction: var(--slms-dir, column);
                flex-wrap: var(--slms-wrap, nowrap);
                gap: 0.75rem; }
            body.mce-content-body a.studiolms-webteca-item,
            body.mce-content-body a.studiolms-webteca-item:hover,
            body.mce-content-body a.studiolms-webteca-item:focus {
                display: flex;
                align-items: center;
                padding: 0.75rem 1rem;
                background: #ffffff;
                border: 1px solid #dee2e6;
                border-left: 4px solid var(--slms-type-c, #6c757d);
                border-radius: 6px;
                text-decoration: none;
                color: #212529;
                font-weight: 500;
                transition: transform 0.2s ease, box-shadow 0.2s ease;
                height: 100%; }
            body.mce-content-body .studiolms-profilecard {
                background: var(--slms-pc-bg, #fff);
                border: 1px solid #dee2e6;
                border-radius: 0.75rem;
                padding: 2rem 1.5rem 1.5rem;
                text-align: center;
                margin: 1rem 0; }
            body.mce-content-body .slms-pc-photo {
                width: 110px;
                height: 110px;
                border-radius: 50%;
                object-fit: cover;
                border: 3px solid var(--slms-pc-accent, #0f6cbf);
                display: block;
                margin: 0 auto 1rem; }
            body.mce-content-body .slms-pc-photo-placeholder {
                width: 110px;
                height: 110px;
                border-radius: 50%;
                background: #f8f9fa;
                border: 3px solid var(--slms-pc-accent, #0f6cbf);
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 2.8rem;
                margin: 0 auto 1rem; }
            body.mce-content-body .slms-pc-name {
                font-size: 1.15rem;
                font-weight: 700;
                margin: 0 0 0.2rem; }
            body.mce-content-body .slms-pc-role {
                font-size: 0.8rem;
                color: var(--slms-pc-accent, #0f6cbf);
                font-weight: 600;
                text-transform: uppercase;
                letter-spacing: 0.05em;
                margin: 0 0 0.75rem; }
            body.mce-content-body .slms-pc-bio {
                font-size: 0.875rem;
                color: #6c757d;
                line-height: 1.55;
                margin: 0 0 1.25rem; }
            body.mce-content-body .slms-pc-links {
                display: flex;
                flex-wrap: wrap;
                gap: 0.4rem;
                justify-content: center; }
            body.mce-content-body .slms-pc-link {
                display: inline-block;
                padding: 0.3rem 1rem;
                border: 1px solid var(--slms-pc-accent, #0f6cbf);
                border-radius: 999px;
                color: var(--slms-pc-accent, #0f6cbf);
                font-size: 0.8rem;
                font-weight: 600;
                text-decoration: none; }
        `;

        const contentStyle = instanceConfig.content_style
            ? instanceConfig.content_style + editorCss
            : editorCss;

        return {
            toolbar: addToolbarButton(instanceConfig.toolbar, 'content', buttonName),
            menu: addMenubarItem(instanceConfig.menu, 'tools', buttonName),
            // eslint-disable-next-line camelcase
            extended_valid_elements: extendedValid,
            // eslint-disable-next-line camelcase
            content_style: contentStyle,
        };
    };

    return [pluginName, {configure}];
});
