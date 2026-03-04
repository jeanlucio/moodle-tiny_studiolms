/**
 * Block definitions and renderers for StudioLMS.
 *
 * @module     tiny_studiolms/blocks
 * @copyright  2026 Jean Lúcio <jeanlucio@gmail.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import Templates from 'core/templates';
import {getString} from 'core/str';

export const Blocks = {
    botaoCta: {
        id: 'botaoCta',
        titleString: 'button_cta',
        icon: '🔘',
        defaultData: {
            btnText: '',
            btnUrl: '#',
            btnBg: '#0d47a1',
            btnTextCol: '#ffffff',
            radius: 6,
            target: '_blank'
        },
        buildConfigForm: async(container, data, onUpdate) => {
            try {
                const {html, js} = await Templates.renderForPromise('tiny_studiolms/form_button', data);
                Templates.replaceNodeContents(container, html, js);

                // Array quebrado em várias linhas para respeitar o limite de 132 caracteres
                const inputs = [
                    '#cfg_btn_text',
                    '#cfg_btn_url',
                    '#cfg_btn_bg',
                    '#cfg_btn_text_col',
                    '#cfg_btn_radius',
                    '#cfg_btn_target'
                ];

                inputs.forEach(selector => {
                    const el = container.querySelector(selector);
                    if (el) {
                        el.addEventListener('input', (e) => {
                            const prop = selector.replace('#cfg_btn_', '');

                            // Objeto de mapeamento no lugar de ternários aninhados
                            const propMap = {
                                'text_col': 'btnTextCol',
                                'bg': 'btnBg',
                                'text': 'btnText',
                                'url': 'btnUrl'
                            };

                            const finalProp = propMap[prop] || prop;
                            data[finalProp] = e.target.value;

                            onUpdate(data);
                        });
                    }
                });

            } catch (error) {
                const errStr = await getString('error_loading_form', 'tiny_studiolms');
                // DOM manipulation em vez de string literal para evitar erros de lint (segurança)
                container.innerHTML = '';
                const errorNode = document.createElement('div');
                errorNode.className = 'alert alert-danger';
                errorNode.textContent = errStr;
                container.appendChild(errorNode);
            }
        },
        renderHtml: (data) => {
            const templateData = Object.assign({}, data);
            templateData.isTargetBlank = data.target === '_blank';
            return Templates.render('tiny_studiolms/block_button', templateData);
        }
    },
    cardAvancado: {
        id: 'cardAvancado',
        titleString: 'block_card_title',
        icon: '🃏',
        defaultData: {
            bg: '#ffffff',
            text: '#212529',
            border: '#0d47a1',
            radius: 8,
            shadow: 'md',
            mediaType: 'none',
            mediaUrl: '',
            layout: 'vertical',
            btnText: '',
            btnUrl: '#',
            btnBg: '#0d47a1',
            btnTextCol: '#ffffff'
        },
        buildConfigForm: async(container, data, onUpdate) => {
            const tplData = Object.assign({}, data);
            tplData[`shadow_${data.shadow}`] = true;
            tplData[`media_${data.mediaType}`] = true;
            tplData[`layout_${data.layout}`] = true;

            try {
                const {html, js} = await Templates.renderForPromise('tiny_studiolms/form_card', tplData);
                Templates.replaceNodeContents(container, html, js);

                const bindInput = (id, prop) => {
                    const el = container.querySelector(`#${id}`);
                    if (el) {
                        el.addEventListener('input', (e) => {
                            data[prop] = e.target.value;
                            onUpdate(data);
                        });
                    }
                };

                bindInput('cfg_bg', 'bg');
                bindInput('cfg_text', 'text');
                bindInput('cfg_border', 'border');
                bindInput('cfg_radius', 'radius');
                bindInput('cfg_shadow', 'shadow');
                bindInput('cfg_btn_text', 'btnText');
                bindInput('cfg_btn_url', 'btnUrl');
                bindInput('cfg_btn_bg', 'btnBg');
                bindInput('cfg_btn_text_col', 'btnTextCol');
                bindInput('cfg_media_url', 'mediaUrl');

                const typeSelect = container.querySelector('#cfg_media_type');
                const layoutSelect = container.querySelector('#cfg_layout');
                const urlWrapper = container.querySelector('#cfg_media_url_wrapper');
                const layoutWrapper = container.querySelector('#cfg_layout_wrapper');

                if (typeSelect) {
                    typeSelect.addEventListener('change', (e) => {
                        data.mediaType = e.target.value;
                        const showMediaOpts = (data.mediaType !== 'none');
                        if (urlWrapper) {
                            urlWrapper.classList.toggle('d-none', !showMediaOpts);
                        }
                        if (layoutWrapper) {
                            layoutWrapper.classList.toggle('d-none', !showMediaOpts);
                        }
                        onUpdate(data);
                    });
                }

                if (layoutSelect) {
                    layoutSelect.addEventListener('change', (e) => {
                        data.layout = e.target.value;
                        onUpdate(data);
                    });
                }
            } catch (error) {
                const errorStr = await getString('error_loading_form', 'tiny_studiolms');
                container.innerHTML = `<div class="alert alert-danger">${errorStr}</div>`;
            }
        },
        renderHtml: (data) => {
            const templateData = Object.assign({}, data);
            const shadowMap = {
                'none': 'none',
                'sm': '0 1px 3px rgba(0, 0, 0, 0.1)',
                'md': '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                'lg': '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
            };
            templateData.shadowCss = shadowMap[data.shadow] || shadowMap.md;

            templateData.hasMedia = data.mediaType !== 'none' && data.mediaUrl.trim() !== '';
            templateData.isImage = data.mediaType === 'image';

            if (data.mediaType === 'video' && data.mediaUrl) {
                const ytPattern = '^.*(?:(?:youtu\\.be/|v/|vi/|u/\\w/|embed/|shorts/)|' +
                    '(?:(?:watch)?\\?v(?:i)?=|&v(?:i)?=))([^#&?]*).*';
                const regExp = new RegExp(ytPattern);
                const match = data.mediaUrl.match(regExp);

                if (match && match[1]) {
                    templateData.mediaUrl = `https://www.youtube.com/embed/${match[1]}`;
                    templateData.isVideo = true;
                } else {
                    templateData.hasMedia = false;
                }
            }

            templateData.isHorizontal = data.layout === 'horizontal';
            templateData.hasButton = data.btnText.trim() !== '';

            return Templates.render('tiny_studiolms/block_card', templateData);
        }
    },

    acordeao: {
        id: 'acordeao',
        titleString: 'block_accordion_title',
        icon: '🔽',
        defaultData: {
            title: '',
            icon: '▼',
            color: '#f0f9ff',
            isOpen: false
        },
        buildConfigForm: async(container, data, onUpdate) => {
            try {
                const {html, js} = await Templates.renderForPromise('tiny_studiolms/form_accordion', data);
                Templates.replaceNodeContents(container, html, js);

                const titleInp = container.querySelector('#cfg_acc_title');
                const iconSel = container.querySelector('#cfg_acc_icon');
                const colorInp = container.querySelector('#cfg_acc_color');
                const openChk = container.querySelector('#cfg_acc_open');

                if (iconSel) {
                    iconSel.value = data.icon;
                }

                const bindUpdate = (el, prop, isCheck = false) => {
                    if (el) {
                        el.addEventListener(isCheck ? 'change' : 'input', (e) => {
                            data[prop] = isCheck ? e.target.checked : e.target.value;
                            onUpdate(data);
                        });
                    }
                };

                bindUpdate(titleInp, 'title');
                bindUpdate(iconSel, 'icon');
                bindUpdate(colorInp, 'color');
                bindUpdate(openChk, 'isOpen', true);
            } catch (error) {
                const errorStr = await getString('error_loading_form', 'tiny_studiolms');
                container.innerHTML = `<div class="alert alert-danger">${errorStr}</div>`;
            }
        },
        renderHtml: (data) => {
            return Templates.render('tiny_studiolms/block_accordion', data);
        }
    },

    webteca: {
        id: 'webteca',
        titleString: 'block_webteca_title',
        icon: '📚',
        defaultData: {
            title: '',
            description: '',
            titleColor: '#1e293b',
            descColor: '#64748b',
            layout: 'list',
            isAccordion: true,
            accIcon: '▶',
            accHeaderBg: '#f8fafc',
            enableHover: true,
            enableSoundHover: false,
            soundHoverUrl: '',
            enableSoundClick: false,
            soundClickUrl: '',
            items: [
                {type: 'pdf', title: '', desc: '', url: '#', btnText: '', target: '_blank'},
                {type: 'link', title: '', desc: '', url: '#', btnText: '', target: '_blank'}
            ]
        },
        buildConfigForm: async(container, data, onUpdate) => {
            const tplData = Object.assign({}, data);
            tplData.isGrid = data.layout === 'grid';

            try {
                const {html, js} = await Templates.renderForPromise('tiny_studiolms/form_webteca', tplData);
                Templates.replaceNodeContents(container, html, js);

                const getEl = (id) => container.querySelector(id);
                const iconSel = getEl('#wt_acc_icon');

                if (iconSel) {
                    iconSel.value = data.accIcon || '▶';
                }

                const updateGlobal = () => {
                    data.title = getEl('#wt_title').value;
                    data.description = getEl('#wt_desc').value;
                    data.layout = getEl('#wt_layout').value;
                    data.titleColor = getEl('#wt_title_color').value;
                    data.isAccordion = getEl('#wt_is_acc').checked;
                    data.accIcon = getEl('#wt_acc_icon').value;
                    data.accHeaderBg = getEl('#wt_header_bg') ? getEl('#wt_header_bg').value : '#f8fafc';
                    data.enableHover = getEl('#wt_hover').checked;
                    data.enableSoundHover = getEl('#wt_snd_hover_chk').checked;
                    data.soundHoverUrl = getEl('#wt_snd_hover_url').value;
                    data.enableSoundClick = getEl('#wt_snd_click_chk').checked;
                    data.soundClickUrl = getEl('#wt_snd_click_url').value;
                    onUpdate(data);
                };

                const globalInputs = [
                    '#wt_title', '#wt_desc', '#wt_layout', '#wt_title_color', '#wt_is_acc', '#wt_acc_icon',
                    '#wt_header_bg', '#wt_hover', '#wt_snd_hover_chk', '#wt_snd_hover_url',
                    '#wt_snd_click_chk', '#wt_snd_click_url'
                ];

                globalInputs.forEach((id) => {
                    const el = getEl(id);
                    if (el) {
                        el.addEventListener('input', updateGlobal);
                        el.addEventListener('change', updateGlobal);
                    }
                });

                const itemsContainer = getEl('#slms-wt-items-container');

                const renderItemsList = async() => {
                    const itemsData = {
                        items: data.items.map((item, idx) => ({
                            idx: idx,
                            num: idx + 1,
                            type: item.type,
                            title: item.title,
                            url: item.url,
                            desc: item.desc,
                            isPdf: item.type === 'pdf',
                            isVideo: item.type === 'video',
                            isLink: item.type === 'link',
                            isPodcast: item.type === 'podcast',
                            isFile: item.type === 'file',
                            isTargetBlank: item.target === '_blank',
                            isTargetSelf: item.target === '_self',
                            isTargetPopup: item.target === 'popup'
                        }))
                    };

                    try {
                        const {html: itemHtml, js: itemJs} = await Templates.renderForPromise(
                            'tiny_studiolms/form_webteca_items',
                            itemsData
                        );
                        Templates.replaceNodeContents(itemsContainer, itemHtml, itemJs);

                        const selectors = '.i-type, .i-title, .i-url, .i-desc, .i-target';
                        itemsContainer.querySelectorAll(selectors).forEach((el) => {
                            el.addEventListener('input', (e) => {
                                const idx = e.target.getAttribute('data-idx');
                                const prop = e.target.className.match(/i-(\w+)/)[1];
                                data.items[idx][prop] = e.target.value;
                                onUpdate(data);
                            });
                        });

                        itemsContainer.querySelectorAll('.slms-del-item').forEach((btn) => {
                            btn.addEventListener('click', (e) => {
                                const idx = e.target.getAttribute('data-idx');
                                data.items.splice(idx, 1);
                                renderItemsList();
                                onUpdate(data);
                            });
                        });
                    } catch (err) {
                        const errStr = await getString('error_loading_form', 'tiny_studiolms');
                        itemsContainer.innerHTML = `<div class="alert alert-danger">${errStr}</div>`;
                    }
                };

                const btnAdd = getEl('#slms-wt-add-item');
                if (btnAdd) {
                    btnAdd.addEventListener('click', () => {
                        data.items.push({
                            type: 'link',
                            title: '',
                            desc: '',
                            url: '#',
                            btnText: '',
                            target: '_blank'
                        });
                        renderItemsList();
                        onUpdate(data);
                    });
                }

                renderItemsList();
            } catch (error) {
                const errStr = await getString('error_loading_form', 'tiny_studiolms');
                container.innerHTML = `<div class="alert alert-danger">${errStr}</div>`;
            }
        },
        renderHtml: async(data) => {
            const tplData = Object.assign({}, data);
            tplData.isGrid = data.layout === 'grid';

            const typeConfig = {
                'pdf': {color: '#ef4444', icon: '📄', btnStr: 'webteca_btn_read'},
                'video': {color: '#f59e0b', icon: '🎬', btnStr: 'webteca_btn_watch'},
                'link': {color: '#3b82f6', icon: '🔗', btnStr: 'webteca_btn_access'},
                'podcast': {color: '#8b5cf6', icon: '🎧', btnStr: 'webteca_btn_listen'},
                'file': {color: '#6b7280', icon: '📁', btnStr: 'webteca_btn_download'}
            };

            // Processa de forma assíncrona para buscar as strings no Moodle
            tplData.items = await Promise.all((data.items || []).map(async(item) => {
                const conf = typeConfig[item.type] || typeConfig.link;

                let containerAttrs = '';
                if (data.enableHover) {
                    let enterJs = "this.style.transform='translateY(-3px)'; " +
                        "this.style.boxShadow='0 8px 16px rgba(0, 0, 0, 0.1)'; " +
                        "this.style.borderColor='" + conf.color + "'; ";

                    if (data.enableSoundHover && data.soundHoverUrl) {
                        enterJs += "try{new Audio('" + data.soundHoverUrl + "').play()}catch(e){}; ";
                    }

                    const leaveJs = "this.style.transform='none'; " +
                        "this.style.boxShadow='0 2px 4px rgba(0, 0, 0, 0.03)'; " +
                        "this.style.borderColor='#e2e8f0'; ";

                    containerAttrs += " tabindex=\"0\" onmouseenter=\"" + enterJs +
                        "\" onmouseleave=\"" + leaveJs + "\" onfocus=\"" + enterJs +
                        "\" onblur=\"" + leaveJs + "\"";
                }

                let linkAttrs = '';
                let clickSoundJs = '';
                if (data.enableSoundClick && data.soundClickUrl) {
                    clickSoundJs = "try{new Audio('" + data.soundClickUrl + "').play()}catch(e){}; ";
                }

                if (item.target === 'popup') {
                    const popupJs = "event.preventDefault(); window.open('" + (item.url || '#') +
                                    "', 'newwindow', 'width=800,height=600,scrollbars=yes,resizable=yes'); " +
                                    "return false;";
                    linkAttrs = " href=\"" + (item.url || '#') + "\" onclick=\"" + clickSoundJs + popupJs + "\"";
                } else {
                    linkAttrs = " href=\"" + (item.url || '#') + "\" target=\"" + (item.target || '_blank') + "\"";
                    if (item.target === '_blank') {
                        linkAttrs += ' rel="noopener noreferrer"';
                    }
                    if (clickSoundJs) {
                        linkAttrs += " onclick=\"" + clickSoundJs + "\"";
                    }
                }

                // Busca a string no PHP apenas se o botão não tiver texto escrito
                let finalBtnText = item.btnText;
                if (!finalBtnText || finalBtnText.trim() === '') {
                    finalBtnText = await getString(conf.btnStr, 'tiny_studiolms');
                }

                return Object.assign({}, item, {
                    icon: conf.icon,
                    color: conf.color,
                    btnText: finalBtnText,
                    containerAttrs: containerAttrs,
                    linkAttrs: linkAttrs
                });
            }));

            if (data.isAccordion) {
                tplData.uid = 'acc_' + Math.random().toString(36).substring(2, 11);
                tplData.onClickJs = "const det=this.parentElement;const ico=this.querySelector('.wt-icon-main');" +
                    "const pR={'📂':'📁','📖':'📕','🔓':'🔒','➖':'➕','⤴️':'⤵️','❌':'✅','📤':'📥','☂️':'🌂'," +
                    "'☀️':'🌥️','🎯':'🕹️','🔋':'🪫','▲':'▼'};const pF={'📁':'📂','📕':'📖','🔒':'🔓','➕':'➖'," +
                    "'⤵️':'⤴️','✅':'❌','📥':'📤','🌂':'☂️','🌥️':'☀️','🕹️':'🎯','🪫':'🔋','▼':'▲'};" +
                    "if(det.open){event.preventDefault();det.classList.add('closing');const txt=ico.innerText.trim();" +
                    "if(pR[txt])ico.innerText=pR[txt];else if(txt==='▶'||txt==='▼')ico.style.transform='rotate(0deg)';" +
                    "setTimeout(()=>{det.removeAttribute('open');det.classList.remove('closing')},300)}else{" +
                    "setTimeout(()=>{const txt=ico.innerText.trim();if(pF[txt])ico.innerText=pF[txt];" +
                    "else if(txt==='▶')ico.style.transform='rotate(90deg)';" +
                    "else if(txt==='▼')ico.style.transform='rotate(180deg)'},10)}";

                tplData.styleBlock = "<style>#" + tplData.uid + " summary{list-style:none;outline:none}#" +
                    tplData.uid + " summary::-webkit-details-marker{display:none}#" + tplData.uid +
                    " .wt-content-wrapper{display:grid;grid-template-rows:0fr;transition:grid-template-rows 0.3s ease-out}#" +
                    tplData.uid + "[open] .wt-content-wrapper{grid-template-rows:1fr}#" + tplData.uid +
                    ".closing .wt-content-wrapper{grid-template-rows:0fr !important}#" + tplData.uid +
                    " .wt-inner-content{overflow:hidden}</style>";
            }

            return Templates.render('tiny_studiolms/block_webteca', tplData);
        }
    }
};
