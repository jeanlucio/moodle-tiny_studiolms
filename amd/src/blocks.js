/**
 * Block definitions and renderers for StudioLMS.
 *
 * @module     tiny_studiolms/blocks
 * @copyright  2026 Jean Lúcio <jeanlucio@gmail.com>
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

import Templates from 'core/templates';

export const Blocks = {
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
        buildConfigForm: (container, data, onUpdate) => {
            // Helpers for the mustache dropdowns logic.
            const tplData = Object.assign({}, data);
            tplData[`shadow_${data.shadow}`] = true;
            tplData[`media_${data.mediaType}`] = true;
            tplData[`layout_${data.layout}`] = true;

            Templates.render('tiny_studiolms/form_card', tplData).then((html, js) => {
                Templates.replaceNodeContents(container, html, js);

                // Helper to map inputs to data.
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

                // Toggle visibility of Media URL and Layout based on Media Type.
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

                return true;
            }).catch(() => {
                container.innerHTML = '<div class="alert alert-danger">Error loading form.</div>';
            });
        },
        renderHtml: (data) => {
            const templateData = Object.assign({}, data);

            // Process shadow CSS.
            const shadowMap = {
                'none': 'none',
                'sm': '0 1px 3px rgba(0,0,0,0.1)',
                'md': '0 4px 6px -1px rgba(0,0,0,0.1)',
                'lg': '0 10px 15px -3px rgba(0,0,0,0.1)'
            };
            templateData.shadowCss = shadowMap[data.shadow] || shadowMap.md;

            // Process Media.
            templateData.hasMedia = data.mediaType !== 'none' && data.mediaUrl.trim() !== '';
            templateData.isImage = data.mediaType === 'image';

            // Basic YouTube URL to embed URL converter.
            if (data.mediaType === 'video' && data.mediaUrl) {
                // Built using RegExp string concatenation to bypass strict 132 max-len rule.
                // Removed useless escapes (\& and \?) to comply with ESLint.
                const ytPattern = '^.*(?:(?:youtu\\.be/|v/|vi/|u/\\w/|embed/|shorts/)|' +
                    '(?:(?:watch)?\\?v(?:i)?=|&v(?:i)?=))([^#&?]*).*';
                const regExp = new RegExp(ytPattern);

                const match = data.mediaUrl.match(regExp);
                if (match && match[1]) {
                    templateData.mediaUrl = `https://www.youtube.com/embed/${match[1]}`;
                    templateData.isVideo = true;
                } else {
                    templateData.hasMedia = false; // Invalid youtube link.
                }
            }

            templateData.isHorizontal = data.layout === 'horizontal';
            templateData.hasButton = data.btnText.trim() !== '';

            return Templates.render('tiny_studiolms/block_card', templateData);
        }
    }
};
