/**
 * AUDIO ENGINE
 * Procedural Sound Synthesis for Untitled Studio
 * Generates mechanical/digital UI sounds using Web Audio API
 */

class AudioEngine {
    constructor() {
        this.ctx = null;
        this.enabled = localStorage.getItem('audioEnabled') !== 'false'; // Default TRUE
        this.masterGain = null;
    }

    init() {
        if (!this.enabled) return;

        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContext();
            this.masterGain = this.ctx.createGain();
            this.masterGain.gain.value = 0.3; // Check volume
            this.masterGain.connect(this.ctx.destination);
        } catch (e) {
            console.warn('AudioContext not supported');
        }
    }

    resume() {
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    // TOGGLE
    toggle(state) {
        this.enabled = state;
        localStorage.setItem('audioEnabled', state);
        if (state && !this.ctx) this.init();
    }

    // SOUNDS

    // 1. UI Click (High tech beep)
    playClick() {
        if (!this.enabled || !this.ctx) return;
        this.resume();

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1200, this.ctx.currentTime + 0.05);

        gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.05);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.05);
    }

    // 2. Heavy Click (Button press / Shutter)
    playShutter() {
        if (!this.enabled || !this.ctx) return;
        this.resume();

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const noise = this.createNoiseBuffer();
        const noiseSource = this.ctx.createBufferSource();
        const noiseGain = this.ctx.createGain();

        // Mechanical thud
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.frequency.setValueAtTime(150, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.2);
        gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.2);

        // Clack texture
        noiseSource.buffer = noise;
        noiseSource.connect(noiseGain);
        noiseGain.connect(this.masterGain);
        noiseGain.gain.setValueAtTime(0.2, this.ctx.currentTime);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.1);

        osc.start();
        noiseSource.start();
        osc.stop(this.ctx.currentTime + 0.2);
        noiseSource.stop(this.ctx.currentTime + 0.1);
    }

    // 3. Error / Glitch (Static burst)
    playGlitch() {
        if (!this.enabled || !this.ctx) return;
        this.resume();

        const noise = this.createNoiseBuffer();
        const src = this.ctx.createBufferSource();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        src.buffer = noise;
        src.loop = true;

        // Bandpass sweep
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(100, this.ctx.currentTime);
        filter.frequency.linearRampToValueAtTime(2000, this.ctx.currentTime + 0.2);
        filter.Q.value = 10;

        src.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);

        gain.gain.setValueAtTime(0.4, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.3);

        src.start();
        src.stop(this.ctx.currentTime + 0.3);
    }

    // 4. Startup Sound (CRT Degauss / Hum)
    playStartup() {
        if (!this.enabled || !this.ctx) {
            // Force init if requested
            if (this.enabled && !this.ctx) this.init();
            else return;
        }
        this.resume();

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.connect(gain);
        gain.connect(this.masterGain);

        // Rising power-up tone
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(50, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(200, this.ctx.currentTime + 1.5);

        gain.gain.setValueAtTime(0, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.1, this.ctx.currentTime + 0.5);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 2.0);

        osc.start();
        osc.stop(this.ctx.currentTime + 2.0);

        // Spark
        setTimeout(() => this.playClick(), 100);
    }

    // UTILS
    createNoiseBuffer() {
        if (!this.ctx) return null;
        const bufferSize = this.ctx.sampleRate * 2; // 2 seconds
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        return buffer;
    }
}
