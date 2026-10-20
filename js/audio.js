/**
 * audio.js - Web Audio API Sound Synthesizer for FireCube Pro
 * Includes Timer beeps, Inspection pings, PB fanfare, Duel countdown,
 * Victory fanfare, Defeat gong, and Coin/Level Up chimes.
 */
class SoundEngine {
  constructor() {
    this.ctx = null;
    this.enabled = true;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playTone(freq, type = 'sine', duration = 0.1, gainVal = 0.15) {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const now = this.ctx.currentTime;

      osc.type = type;
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(gainVal, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + duration);
    } catch (e) {
      console.warn('Audio play error:', e);
    }
  }

  playReady() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc1.type = 'triangle';
      osc2.type = 'sine';

      osc1.frequency.setValueAtTime(587.33, now); // D5
      osc1.frequency.setValueAtTime(880, now + 0.08); // A5

      osc2.frequency.setValueAtTime(880, now);
      osc2.frequency.setValueAtTime(1174.66, now + 0.08); // D6

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.22);
      osc2.stop(now + 0.22);
    } catch (e) {}
  }

  playStart() {
    this.playTone(880, 'sine', 0.06, 0.18);
  }

  playStop() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(784, now); // G5
      osc.frequency.setValueAtTime(523.25, now + 0.07); // C5

      gain.gain.setValueAtTime(0.22, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.2);
    } catch (e) {}
  }

  playInspection8s() {
    this.playTone(660, 'sine', 0.12, 0.2);
    setTimeout(() => this.playTone(880, 'sine', 0.15, 0.25), 130);
  }

  playInspection12s() {
    this.playTone(880, 'square', 0.08, 0.15);
    setTimeout(() => this.playTone(880, 'square', 0.08, 0.15), 110);
    setTimeout(() => this.playTone(1046.5, 'square', 0.12, 0.2), 220);
  }

  playPenalty() {
    this.playTone(220, 'sawtooth', 0.25, 0.25);
  }

  playPB() {
    if (!this.enabled) return;
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      setTimeout(() => {
        this.playTone(freq, 'triangle', idx === 3 ? 0.4 : 0.12, 0.22);
      }, idx * 110);
    });
  }

  playCubeTurn() {
    if (!this.enabled) return;
    this.playTone(320 + Math.random() * 80, 'triangle', 0.04, 0.08);
  }

  // Sons de Gamificação & Duelos
  playCountdownTick() {
    this.playTone(440, 'triangle', 0.08, 0.2);
  }

  playCountdownGo() {
    this.playTone(880, 'sine', 0.25, 0.3);
  }

  playDuelWin() {
    if (!this.enabled) return;
    const notes = [587.33, 739.99, 880, 1174.66]; // D5, F#5, A5, D6
    notes.forEach((freq, idx) => {
      setTimeout(() => {
        this.playTone(freq, 'triangle', idx === 3 ? 0.5 : 0.14, 0.28);
      }, idx * 120);
    });
  }

  playDuelLose() {
    if (!this.enabled) return;
    const notes = [440, 415.3, 392, 349.23];
    notes.forEach((freq, idx) => {
      setTimeout(() => {
        this.playTone(freq, 'sawtooth', 0.2, 0.18);
      }, idx * 140);
    });
  }

  playCoinSound() {
    if (!this.enabled) return;
    this.playTone(987.77, 'sine', 0.08, 0.2);
    setTimeout(() => this.playTone(1318.51, 'sine', 0.15, 0.22), 80);
  }

  playLevelUp() {
    if (!this.enabled) return;
    const notes = [440, 554.37, 659.25, 880, 1108.73, 1318.51];
    notes.forEach((freq, idx) => {
      setTimeout(() => {
        this.playTone(freq, 'triangle', idx === 5 ? 0.45 : 0.09, 0.25);
      }, idx * 90);
    });
  }
}

window.soundEngine = new SoundEngine();
