/**
 * Aether Sound Synthesis & Haptics Engine
 * Highly optimized client-side client Web Audio API synthesizers for micro-feedback.
 */

let audioCtx = null;
let noiseBuffer = null;
let muted = localStorage.getItem('aether_audio_muted') === 'true';

/**
 * Lazy initialize or get existing AudioContext
 */
export function getAudioContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  return audioCtx;
}

/**
 * Pre-generate White Noise Buffer for mechanical click transients
 */
function getNoiseBuffer(ctx) {
  if (noiseBuffer) return noiseBuffer;
  const bufferSize = ctx.sampleRate * 0.05; // 50ms of noise
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  noiseBuffer = buffer;
  return noiseBuffer;
}

/**
 * Resumes suspended AudioContext on user interaction
 */
export function initAudio() {
  const ctx = getAudioContext();
  if (ctx && ctx.state === 'suspended') {
    ctx.resume().then(() => {
      console.log('[Aether Audio] AudioContext unlocked and active.');
    }).catch(err => {
      console.warn('[Aether Audio] Failed to resume AudioContext:', err);
    });
  }
}

/**
 * Triggers mobile vibration haptics with safe browser support checks
 * @param {number|number[]} pattern - Vibration duration(s) in ms
 */
export function triggerHaptic(pattern) {
  if ('vibrate' in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch (e) {
      // Quiet fail if blocked by platform permissions/sandboxes
    }
  }
}

/**
 * Synthesizes a crisp Mechanical Switch Click
 * Composed of:
 *  1. Low-latency sine transient decaying rapidly to mimic switch leaf snap
 *  2. High-pass band-filtered noise burst representing the plastic keycap collision
 */
export function playClick() {
  // Always allow tactile feedback regardless of audio mute
  triggerHaptic(12);

  if (muted) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  // Unlock audio if suspended
  if (ctx.state === 'suspended') {
    initAudio();
    return;
  }

  const now = ctx.currentTime;

  // 1. High frequency mechanical "tick" (switch leaf engagement)
  const osc1 = ctx.createOscillator();
  const gain1 = ctx.createGain();
  osc1.type = 'triangle';
  osc1.frequency.setValueAtTime(1400, now);
  osc1.frequency.exponentialRampToValueAtTime(400, now + 0.012);
  
  gain1.gain.setValueAtTime(0.06, now);
  gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.012);
  
  osc1.connect(gain1);
  gain1.connect(ctx.destination);
  
  osc1.start(now);
  osc1.stop(now + 0.015);
  
  osc1.onended = () => {
    osc1.disconnect();
    gain1.disconnect();
  };
  
  // 2. Plastic click noise transient
  const noiseSource = ctx.createBufferSource();
  noiseSource.buffer = getNoiseBuffer(ctx);
  
  const noiseFilter = ctx.createBiquadFilter();
  noiseFilter.type = 'bandpass';
  noiseFilter.frequency.setValueAtTime(3200, now);
  noiseFilter.Q.setValueAtTime(4, now);
  
  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(0.03, now);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.006);
  
  noiseSource.connect(noiseFilter);
  noiseFilter.connect(noiseGain);
  noiseGain.connect(ctx.destination);
  
  noiseSource.start(now);
  noiseSource.stop(now + 0.008);

  noiseSource.onended = () => {
    noiseSource.disconnect();
    noiseFilter.disconnect();
    noiseGain.disconnect();
  };
}

/**
 * Plays a warm, glowing chime note
 */
function playChimeNote(freq, startTime, duration) {
  const ctx = getAudioContext();
  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const gainNode = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  
  // Mellow fundamental + harmonic chime profile
  osc1.type = 'sine';
  osc2.type = 'triangle';
  
  osc1.frequency.setValueAtTime(freq, startTime);
  osc2.frequency.setValueAtTime(freq + 1.2, startTime); // Subtle detune for chorus warmth
  
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(1200, startTime);
  filter.frequency.exponentialRampToValueAtTime(300, startTime + duration);
  
  // Envelope parameters
  const attack = 0.03;
  const decay = 0.18;
  const sustain = 0.35;
  
  gainNode.gain.setValueAtTime(0, startTime);
  gainNode.gain.linearRampToValueAtTime(0.08, startTime + attack);
  gainNode.gain.exponentialRampToValueAtTime(0.08 * sustain, startTime + attack + decay);
  gainNode.gain.setValueAtTime(0.08 * sustain, startTime + duration - 0.2);
  gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
  
  osc1.connect(filter);
  osc2.connect(filter);
  filter.connect(gainNode);
  gainNode.connect(ctx.destination);
  
  osc1.start(startTime);
  osc2.start(startTime);
  
  osc1.stop(startTime + duration);
  osc2.stop(startTime + duration);

  osc1.onended = () => {
    osc1.disconnect();
    osc2.disconnect();
    filter.disconnect();
    gainNode.disconnect();
  };
}

/**
 * Plays a gorgeous arpeggiated Major 9th chord representing routine completion
 * Chord: Ab3 (207.65 Hz), Eb4 (311.13 Hz), G4 (392.00 Hz), C5 (523.25 Hz), Eb5 (622.25 Hz)
 */
export function playChime() {
  triggerHaptic([15, 60, 20, 100]);

  if (muted) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  if (ctx.state === 'suspended') {
    initAudio();
    return;
  }

  const now = ctx.currentTime;
  const notes = [207.65, 311.13, 392.00, 523.25, 622.25];
  
  notes.forEach((freq, index) => {
    // Beautiful flowing arpeggiated onset
    const noteDelay = index * 0.06;
    playChimeNote(freq, now + noteDelay, 1.4);
  });
}

/**
 * Plays an immersive, glowing milestone sweep pad
 * Sweeping filter across thick, detuned synth layers to celebrate larger achievements.
 */
export function playSweep() {
  triggerHaptic([35, 100, 45, 200]);

  if (muted) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  if (ctx.state === 'suspended') {
    initAudio();
    return;
  }

  const now = ctx.currentTime;
  const duration = 2.4;
  
  // Lush harmonized frequencies: Db3 (138.59), Ab3 (207.65), Db4 (277.18), F4 (349.23), Ab4 (415.30)
  const freqs = [138.59, 207.65, 277.18, 349.23, 415.30];
  
  const masterGain = ctx.createGain();
  masterGain.gain.setValueAtTime(0, now);
  masterGain.gain.linearRampToValueAtTime(0.12, now + 0.5); // Warm slow attack
  masterGain.gain.setValueAtTime(0.12, now + 1.2);
  masterGain.gain.exponentialRampToValueAtTime(0.001, now + duration);
  
  // Resonant lowpass filter sweep
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.Q.setValueAtTime(4, now);
  filter.frequency.setValueAtTime(120, now);
  filter.frequency.exponentialRampToValueAtTime(1600, now + 0.8); // Resonant sweep up
  filter.frequency.exponentialRampToValueAtTime(200, now + duration);  // Warm settle down
  
  filter.connect(masterGain);
  masterGain.connect(ctx.destination);
  
  freqs.forEach((freq, idx) => {
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    
    // Detuned saw + triangle voices for lush chorus width
    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(freq - 0.8, now);
    
    osc2.type = 'sawtooth';
    osc2.frequency.setValueAtTime(freq + 0.8, now);
    
    const sawGain = ctx.createGain();
    sawGain.gain.setValueAtTime(0.25, now); // Scale down saw harshness
    
    osc2.connect(sawGain);
    sawGain.connect(filter);
    osc1.connect(filter);
    
    osc1.start(now);
    osc2.start(now);
    
    osc1.stop(now + duration);
    osc2.stop(now + duration);

    if (idx === 0) {
      osc1.onended = () => {
        osc1.disconnect();
        osc2.disconnect();
        sawGain.disconnect();
        filter.disconnect();
        masterGain.disconnect();
      };
    } else {
      osc1.onended = () => {
        osc1.disconnect();
        osc2.disconnect();
        sawGain.disconnect();
      };
    }
  });
}

/**
 * Plays a high-tech feedback beep when the user switches app theme
 */
export function playThemeChange(themeName) {
  if (muted) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  if (ctx.state === 'suspended') {
    initAudio();
    return;
  }

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = 'sine';
  osc.frequency.setValueAtTime(themeName === 'crt' ? 800 : 1200, now);
  gain.gain.setValueAtTime(0.05, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
  
  osc.start(now);
  osc.stop(now + 0.1);

  osc.onended = () => {
    osc.disconnect();
    gain.disconnect();
  };
}

/**
 * Toggles current audio mute state and stores setting in LocalStorage
 */
export function toggleMute() {
  muted = !muted;
  localStorage.setItem('aether_audio_muted', muted ? 'true' : 'false');
  
  // Trigger quick haptic to indicate change
  triggerHaptic(20);
  
  return muted;
}

/**
 * Returns current audio mute state
 */
export function isMuted() {
  return muted;
}

// Unlocking Web Audio Context seamlessly on first window touch/click
if (typeof window !== 'undefined') {
  const unlock = () => {
    initAudio();
    window.removeEventListener('click', unlock);
    window.removeEventListener('touchstart', unlock);
  };
  window.addEventListener('click', unlock);
  window.addEventListener('touchstart', unlock);
}
