/**
 * CIPHER REVEAL — Scramble-to-text animation engine
 * Applies a jittery decode effect on hover or programmatic trigger.
 * Theme-aware: uses accent color from CSS vars for glyph coloring.
 */

class CipherReveal {
    static GLYPHS = '_-\\/[]#+!@%&*<>{}|~^'.split('');
    static FRAME_MS = 33; // ~30fps
    static DURATION = 400; // total scramble duration ms

    /**
     * Initialize cipher reveal on all matching elements.
     * @param {string} selector - CSS selector for target elements
     * @param {Object} options - { trigger: 'hover'|'auto', once: boolean }
     */
    static init(selector = '[data-cipher]', options = {}) {
        const defaults = { trigger: 'hover', once: false };
        const opts = { ...defaults, ...options };

        document.querySelectorAll(selector).forEach(el => {
            const originalText = el.dataset.cipher || el.textContent;
            el.dataset.cipher = originalText;

            if (opts.trigger === 'hover') {
                el.addEventListener('mouseenter', () => {
                    CipherReveal.animate(el, originalText);
                });
            }
        });
    }

    /**
     * Attach cipher reveal to a specific element.
     * @param {HTMLElement} el
     * @param {string} text - target text to reveal
     */
    static attach(el, text) {
        if (!el) return;
        el.dataset.cipher = text || el.textContent;
        el.addEventListener('mouseenter', () => {
            CipherReveal.animate(el, el.dataset.cipher);
        });
    }

    /**
     * Run the scramble → reveal animation on a single element.
     * @param {HTMLElement} el
     * @param {string} targetText
     */
    static animate(el, targetText) {
        if (el._cipherRunning) return;
        el._cipherRunning = true;

        const len = targetText.length;
        const totalFrames = Math.ceil(CipherReveal.DURATION / CipherReveal.FRAME_MS);
        let frame = 0;

        const interval = setInterval(() => {
            frame++;
            const progress = frame / totalFrames;

            // How many characters are "resolved" from the left
            const resolved = Math.floor(progress * len);

            let output = '';
            for (let i = 0; i < len; i++) {
                if (targetText[i] === ' ') {
                    output += ' ';
                } else if (i < resolved) {
                    output += targetText[i];
                } else {
                    output += CipherReveal.GLYPHS[
                        Math.floor(Math.random() * CipherReveal.GLYPHS.length)
                    ];
                }
            }

            el.textContent = output;

            if (frame >= totalFrames) {
                clearInterval(interval);
                el.textContent = targetText;
                el._cipherRunning = false;
            }
        }, CipherReveal.FRAME_MS);
    }

    /**
     * Fire animation on all cipher-enabled elements (e.g., on theme switch).
     */
    static fireAll() {
        document.querySelectorAll('[data-cipher]').forEach(el => {
            CipherReveal.animate(el, el.dataset.cipher);
        });
    }
}

// Export for use
window.CipherReveal = CipherReveal;
