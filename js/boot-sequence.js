/**
 * MATRIX-STYLE BOOT SEQUENCE & BIOS LOG
 */
class BootTerminal {
    constructor(isReboot = false) {
        this.isReboot = isReboot;
        this.logData = [
            "INITIALIZING_UNTITLED_KERNEL_V4.0...",
            "CHECKING_SYSTEM_INTEGRITY... [OK]",
            "ALLOCATING_VIRTUAL_MEMORY... 4096MB RESERVED",
            "MOUNTING_VIRTUAL_FILE_SYSTEM... [RO]",
            "Loading module: 'react-dom'...",
            "Loading module: 'webgl-context'...",
            "Loading module: 'film-grain-physics'...",
            "DETECTING_GPU_CAPABILITIES...",
            "   > MAX_TEXTURE_SIZE: 16384px",
            "   > FLOAT_PRECISION: HIGH_P",
            "   > ANISOTROPIC_FILTERING: ENABLED",
            "COMPILING_SHADERS...",
            "   > vertex_shader.glsl ... [COMPILED]",
            "   > fragment_shader_core.glsl ... [COMPILED]",
            "   > fragment_shader_bloom.glsl ... [COMPILED]",
            "   > fragment_shader_grain.glsl ... [COMPILED]",
            "LINKING_PROGRAM... [SUCCESS]",
            "CALIBRATING_COLOR_SCIENCE...",
            "   > LOADING_LUT: 'KODAK_PORTRA_400.CUBE'...",
            "   > LOADING_LUT: 'CINESTILL_800T.CUBE'...",
            "   > LOADING_LUT: 'FUJI_PRO_400H.CUBE'...",
            "   > LOADING_LUT: 'ILFORD_HP5.CUBE'...",
            "APPLYING_SUBTRACTIVE_COLOR_MODEL...",
            "INITIALIZING_HALATION_ENGINE...",
            "   > THRESHOLD: 0.85",
            "   > SPREAD: GAUSSIAN_DUAL_PASS",
            "GENERATING_PROCEDURAL_NOISE_MAPS...",
            "   > PERLIN_NOISE... [GENERATED]",
            "   > SIMPLEX_NOISE... [GENERATED]",
            "   > BLUE_NOISE... [GENERATED]",
            "CHECKING_LICENSE_KEY... [BYPASSED]",
            "ESTABLISHING_SECURE_CONNECTION... [LOCALHOST]",
            "MOUNTING_LENS_ELEMENTS...",
            "   > APERTURE_BLADES: UNSTUCK",
            "   > FOCUS_RING: DAMPENED",
            "   > GLASS: CLEANED",
            "PRE-HEATING_DEVELOPER_CHEMICALS...",
            "   > TEMP: 20°C",
            "   > AGITATION: CONTINUOUS",
            "LINKING_PROGRAM... [SUCCESS]",
            "READING_DEVELOPER_SIGNATURE...",
            "   > KERNEL_ARCHITECT: mhs [ROOT_ACCESS]",
            "   > UI_ENGINEERING: mhs [AUTHORIZED]",
            "   > SHADER_PIPELINE: mhs [OPTIMIZED]",
            "VERIFYING_CONTRIBUTOR_HASHES...",
            "LOADING_DEPENDENCIES...",
            "   > REACT_CORE_V18... [MOUNTED]",
            "   > WEBGL_FLUID_SIM... [ACTIVE]",
            "   > THREE_JS_RENDERER... [ACTIVE]",
            "CHECKING_COPYRIGHT_HEADERS...",
            "   > (C) 2026 UNTITLED STUDIO // MHS",

            "CALIBRATING_COLOR_SCIENCE...",
            "SYSTEM_READY.",
            "BOOTING_INTERFACE..."
        ];

        this.container = document.createElement('div');
        this.container.id = 'boot-terminal';

        // Skip Handler (Click/Key)
        this.skipListener = this.skip.bind(this);
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.skip();
        });
        this.container.addEventListener('click', this.skipListener);

        document.body.appendChild(this.container);
        this.aborted = false;
    }

    async start() {
        // Prevent double runs on cold boot
        if (!this.isReboot && sessionStorage.getItem('boot_sequence_played')) {
            this.container.remove();
            return;
        }

        // Logic loop
        for (const line of this.logData) {
            if (this.aborted) break;
            await this.typeLine(line);
            this.scrollToBottom();
        }

        if (!this.aborted) {
            await this.finish();
        }
    }

    async typeLine(text) {
        const lineEl = document.createElement('div');
        lineEl.className = 'boot-line';
        this.container.appendChild(lineEl);

        const isInstant = Math.random() > 0.7;

        if (isInstant) {
            lineEl.textContent = text;
            await this.wait(Math.random() * 50 + 10);
        } else {
            for (const char of text) {
                if (this.aborted) return;
                lineEl.textContent += char;
                await this.wait(Math.random() * 20 + 5);
                this.scrollToBottom();
            }
            if (Math.random() > 0.8) {
                await this.wait(Math.random() * 300 + 100);
            } else {
                await this.wait(Math.random() * 50);
            }
        }
    }

    scrollToBottom() {
        this.container.scrollTop = this.container.scrollHeight;
    }

    wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async skip() {
        if (this.aborted) return;
        this.aborted = true;
        this.container.innerHTML = '';

        this.logData.forEach(line => {
            const el = document.createElement('div');
            el.className = 'boot-line';
            el.textContent = line;
            this.container.appendChild(el);
        });

        this.scrollToBottom();
        await this.finish();
    }

    async finish() {
        sessionStorage.setItem('boot_sequence_played', 'true');

        // Flash White
        const flash = document.createElement('div');
        flash.className = 'crt-flash';
        document.body.appendChild(flash);

        // Terminal Exit
        this.container.classList.add('boot-terminal-exit');

        // REBOOT LOGIC: Turn Screen Back On
        if (this.isReboot) {
            // Remove 'off' state, add 'on' animation to body children
            document.body.classList.remove('crt-power-off');
            document.body.classList.add('crt-turn-on');

            setTimeout(() => {
                document.body.classList.remove('crt-turn-on');
            }, 600); // 0.6s anim
        }

        // Cleanup
        setTimeout(() => {
            if (flash) flash.remove();
            this.container.remove();
        }, 800);
    }
}

// Global Trigger
window.triggerReboot = function () {
    // 1. Turn Off Screen
    document.body.classList.add('crt-power-off');

    // 2. Wait for black screen (600ms anim + buffer)
    setTimeout(() => {
        // 3. Start Terminal
        const term = new BootTerminal(true); // isReboot = true
        term.start();
    }, 600);
};

// Auto-start on load (Cold Boot)
document.addEventListener('DOMContentLoaded', () => {
    const terminal = new BootTerminal(false);
    terminal.start();
});
