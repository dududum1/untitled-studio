/**
 * SONIC PROCEDURAL AUDIO ENGINE
 * Web Audio API synthesizer for UI interactions.
 */
class SonicEngine {
    constructor() {
        this.ctx = null;
        this.isUnlocked = false;
        this.init();
    }

    init() {
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContext();
            this.attachListeners();
            this.unlockAudio();
        } catch (e) {
            console.warn('SonicEngine: Web Audio API not supported', e);
        }
    }

    unlockAudio() {
        // Unlock on first interaction
        const unlock = () => {
            if (this.ctx && this.ctx.state === 'suspended') {
                this.ctx.resume();
            }
            this.isUnlocked = true;
            document.removeEventListener('click', unlock);
            document.removeEventListener('touchstart', unlock);
        };
        document.addEventListener('click', unlock);
        document.addEventListener('touchstart', unlock);
    }

    attachListeners() {
        // Target interactive elements
        const selectors = [
            'button',
            'a[href]',
            'input',
            'label',
            '.clickable',
            'summary',
            '[role="button"]',
            '.studio-slider' // Specific to this app
        ];

        const elements = document.querySelectorAll(selectors.join(','));

        elements.forEach(el => {
            // Avoid double binding (if re-run)
            if (el.dataset.sonicAttached) return;

            el.addEventListener('mouseenter', () => this.playBlip());
            el.addEventListener('mousedown', () => this.playThud());
            el.addEventListener('touchstart', () => this.playThud(), { passive: true });

            el.dataset.sonicAttached = 'true';
        });

        // Observe DOM for new elements (optional, but good for SPA)
        // For now, basic init is enough.
    }

    /**
     * BLIP: High-tech hover sound
     * Sine wave slide 800Hz -> 1200Hz
     */
    playBlip() {
        if (!this.ctx || this.ctx.state === 'suspended') return;

        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.type = 'sine';

        // Frequency Slide
        osc.frequency.setValueAtTime(800, t);
        osc.frequency.exponentialRampToValueAtTime(1200, t + 0.05);

        // Gain Envelope (Short decay)
        gain.gain.setValueAtTime(0.05, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);

        osc.start(t);
        osc.stop(t + 0.05);
    }

    /**
     * THUD: Mechanical click
     * Triangle wave 150Hz
     */
    playThud() {
        if (!this.ctx || this.ctx.state === 'suspended') return;

        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(150, t);

        // Gain Envelope (Attack -> Decay)
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.1, t + 0.01); // Quick attack
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2); // Decay

        osc.start(t);
        osc.stop(t + 0.2);
    }

    /**
     * PRINTER CHUG: Mechanical thermal printer sound.
     * Duration: 1.5s
     */
    playPrinter() {
        if (!this.ctx || this.ctx.state === 'suspended') return;

        const t = this.ctx.currentTime;
        const duration = 1.5;

        // 1. Motor Hum (Sawtooth)
        const motor = this.ctx.createOscillator();
        const motorGain = this.ctx.createGain();
        motor.connect(motorGain);
        motorGain.connect(this.ctx.destination);

        motor.type = 'sawtooth';
        motor.frequency.setValueAtTime(100, t); // Engine start
        motor.frequency.linearRampToValueAtTime(120, t + duration); // Slight rev up

        // Envelope
        motorGain.gain.setValueAtTime(0, t);
        motorGain.gain.linearRampToValueAtTime(0.05, t + 0.1);
        motorGain.gain.setValueAtTime(0.05, t + duration - 0.1);
        motorGain.gain.linearRampToValueAtTime(0, t + duration);

        motor.start(t);
        motor.stop(t + duration);

        // 2. Data Chitter (Square wave jitter)
        const data = this.ctx.createOscillator();
        const dataGain = this.ctx.createGain();
        data.connect(dataGain);
        dataGain.connect(this.ctx.destination);

        data.type = 'square';
        data.frequency.setValueAtTime(800, t);

        // Modulate gain rapidly to simulate printing bits
        const lfo = this.ctx.createOscillator();
        // const lfoGain = this.ctx.createGain(); // Unused
        lfo.type = 'square';
        lfo.frequency.value = 40; // 40Hz stutter
        lfo.connect(dataGain.gain);
        lfo.start(t);
        lfo.stop(t + duration);

        dataGain.gain.setValueAtTime(0.02, t);
        dataGain.gain.linearRampToValueAtTime(0, t + duration);

        data.start(t);
        data.stop(t + duration);
    }
}

// Global Instance
window.Sonic = new SonicEngine();

// Re-scan when needed (e.g. after DOM updates)
window.Sonic.refresh = () => window.Sonic.attachListeners();
