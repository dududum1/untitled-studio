/**
 * AUDIO INTERACTION ENGINE
 * Synthesized UI sound effects using Web Audio API.
 * No external files required.
 */
class AudioEngine {
    constructor() {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.masterGain = this.ctx.createGain();
        this.masterGain.connect(this.ctx.destination);
        this.masterGain.gain.value = 0.3; // Default volume (subtle)

        this.muted = localStorage.getItem('untitled-muted') === 'true';
        if (this.muted) this.masterGain.gain.value = 0;

        // Unlock audio context on first interaction
        const unlock = () => {
            if (this.ctx.state === 'suspended') this.ctx.resume();
            document.removeEventListener('click', unlock);
        };
        document.addEventListener('click', unlock);
    }

    toggleMute() {
        this.muted = !this.muted;
        this.masterGain.gain.value = this.muted ? 0 : 0.3;
        localStorage.setItem('untitled-muted', this.muted);
        return this.muted;
    }

    // Short, clean click (Mechanical feel)
    playClick() {
        if (this.muted) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.frequency.setValueAtTime(800, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + 0.05);

        gain.gain.setValueAtTime(0.5, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.05);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.05);
    }

    // High frequency tick for sliders (Haptic feel)
    playTick() {
        if (this.muted) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(2000, this.ctx.currentTime);

        gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.01);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.01);
    }

    // Toggle switch sound (Up/Down)
    playToggle(state) {
        if (this.muted) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.connect(gain);
        gain.connect(this.masterGain);

        const now = this.ctx.currentTime;
        if (state) {
            // On: Pitch Up
            osc.frequency.setValueAtTime(400, now);
            osc.frequency.linearRampToValueAtTime(800, now + 0.1);
        } else {
            // Off: Pitch Down
            osc.frequency.setValueAtTime(800, now);
            osc.frequency.linearRampToValueAtTime(400, now + 0.1);
        }

        gain.gain.setValueAtTime(0.3, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.1);

        osc.start();
        osc.stop(now + 0.1);
    }

    // Success chime (Major Triad)
    playSuccess() {
        if (this.muted) return;
        const now = this.ctx.currentTime;
        [523.25, 659.25, 783.99].forEach((freq, i) => { // C E G
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.connect(gain);
            gain.connect(this.masterGain);

            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0, now + i * 0.05);
            gain.gain.linearRampToValueAtTime(0.2, now + i * 0.05 + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.05 + 0.3);

            osc.start(now + i * 0.05);
            osc.stop(now + i * 0.05 + 0.3);
        });
    }
}

// Global instance
window.AudioEngine = new AudioEngine();
