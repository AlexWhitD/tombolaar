// Audio Engine con Web Audio API para efectos de sonido ciclistas y sorteo
class SoundEngine {
  constructor() {
    this.ctx = null;
    this.muted = localStorage.getItem('rifa_muted') === 'true';
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

  toggleMute() {
    this.muted = !this.muted;
    localStorage.setItem('rifa_muted', this.muted);
    return this.muted;
  }

  // Sonido de trinquete / cassette de bicicleta (ruleta girando)
  playTick(frequency = 800, intensity = 0.15) {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      // Ruido metálico de piñón / trinquete
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(1200, this.ctx.currentTime);

      osc.type = 'triangle';
      // Ligera variación de tono para sensación de rueda mecánica
      const pitch = frequency + (Math.random() * 80 - 40);
      osc.frequency.setValueAtTime(pitch, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(pitch * 0.5, this.ctx.currentTime + 0.035);

      gain.gain.setValueAtTime(intensity, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.035);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.04);
    } catch (e) {
      console.warn('Audio error:', e);
    }
  }

  // Sonido realista de choque de esfera de acrílico/celuloide de tómbola
  playBallClack(intensity = 0.5, pitchVariance = 1.0) {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      // Frecuencia acústica de esfera hueca de lotería (entre 850Hz y 1400Hz)
      const baseFreq = (950 + Math.random() * 350) * pitchVariance;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(baseFreq, now);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.4, now + 0.035);

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(baseFreq, now);
      filter.Q.value = 6; // Resonancia hueca tipo celuloide

      const vol = Math.min(0.28, Math.max(0.02, intensity * 0.22));
      gain.gain.setValueAtTime(vol, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.035);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.04);
    } catch (e) {}
  }

  // Campana de bicicleta clásica "¡Ding-Ding!"
  playBell() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const ding = (freq, delay, dur) => {
      setTimeout(() => {
        try {
          const now = this.ctx.currentTime;
          const osc1 = this.ctx.createOscillator();
          const osc2 = this.ctx.createOscillator();
          const gain = this.ctx.createGain();

          osc1.type = 'sine';
          osc1.frequency.setValueAtTime(freq, now);
          osc2.type = 'sine';
          osc2.frequency.setValueAtTime(freq * 1.5, now);

          gain.gain.setValueAtTime(0.3, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

          osc1.connect(gain);
          osc2.connect(gain);
          gain.connect(this.ctx.destination);

          osc1.start(now);
          osc2.start(now);
          osc1.stop(now + dur);
          osc2.stop(now + dur);
        } catch (e) {}
      }, delay);
    };

    ding(2093, 0, 0.45);   // C7
    ding(2637, 120, 0.65); // E7
  }

  // Whoosh de aceleración de ciclista al arrancar
  playWhoosh() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    try {
      const bufferSize = this.ctx.sampleRate * 0.25;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(250, this.ctx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(1400, this.ctx.currentTime + 0.15);
      filter.frequency.exponentialRampToValueAtTime(400, this.ctx.currentTime + 0.25);
      filter.Q.value = 3;

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.01, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.3, this.ctx.currentTime + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.25);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      noise.start();
      noise.stop(this.ctx.currentTime + 0.25);
    } catch (e) {}
  }

  // Fanfarria triunfal de ganador
  playFanfare() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    // Acordes alegres de victoria: C5, E5, G5, C6
    const notes = [
      { f: 523.25, start: 0, dur: 0.15 },
      { f: 659.25, start: 0.14, dur: 0.15 },
      { f: 783.99, start: 0.28, dur: 0.2 },
      { f: 1046.50, start: 0.45, dur: 0.8 }
    ];

    notes.forEach(note => {
      try {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        const t = this.ctx.currentTime + note.start;
        osc.frequency.setValueAtTime(note.f, t);

        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.35, t + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, t + note.dur);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(t);
        osc.stop(t + note.dur);
      } catch (e) {}
    });

    this.playBell();
  }
}

window.soundEngine = new SoundEngine();
