import { useCallback, useRef } from "react";

export type SoundType = "ping" | "chime" | "pop" | "bell" | "none";

const SOUND_OPTIONS: { value: SoundType; label: string }[] = [
  { value: "ping", label: "Ping" },
  { value: "chime", label: "Chime" },
  { value: "pop", label: "Pop" },
  { value: "bell", label: "Bell" },
  { value: "none", label: "None" },
];

// Sound generators using Web Audio API with volume control
const createPingSound = (ctx: AudioContext, masterGain: GainNode) => {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(masterGain);
  osc.frequency.setValueAtTime(880, ctx.currentTime);
  osc.frequency.setValueAtTime(1320, ctx.currentTime + 0.1);
  gain.gain.setValueAtTime(0.3, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.3);
};

const createChimeSound = (ctx: AudioContext, masterGain: GainNode) => {
  const frequencies = [523, 659, 784];
  frequencies.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(masterGain);
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.08);
    gain.gain.setValueAtTime(0.2, ctx.currentTime + i * 0.08);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5 + i * 0.08);
    osc.start(ctx.currentTime + i * 0.08);
    osc.stop(ctx.currentTime + 0.5 + i * 0.08);
  });
};

const createPopSound = (ctx: AudioContext, masterGain: GainNode) => {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(masterGain);
  osc.type = "sine";
  osc.frequency.setValueAtTime(400, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.1);
  gain.gain.setValueAtTime(0.4, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.15);
};

const createBellSound = (ctx: AudioContext, masterGain: GainNode) => {
  const osc = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const gain = ctx.createGain();
  const gain2 = ctx.createGain();
  osc.connect(gain);
  osc2.connect(gain2);
  gain.connect(masterGain);
  gain2.connect(masterGain);
  osc.type = "sine";
  osc2.type = "sine";
  osc.frequency.setValueAtTime(830, ctx.currentTime);
  osc2.frequency.setValueAtTime(1245, ctx.currentTime);
  gain.gain.setValueAtTime(0.3, ctx.currentTime);
  gain2.gain.setValueAtTime(0.15, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);
  gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
  osc.start(ctx.currentTime);
  osc2.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.6);
  osc2.stop(ctx.currentTime + 0.4);
};

const playNotificationSound = (soundType: SoundType, volume: number) => {
  if (soundType === "none" || volume === 0) return;
  
  const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  const masterGain = ctx.createGain();
  masterGain.connect(ctx.destination);
  masterGain.gain.setValueAtTime(volume, ctx.currentTime);
  
  switch (soundType) {
    case "ping":
      createPingSound(ctx, masterGain);
      break;
    case "chime":
      createChimeSound(ctx, masterGain);
      break;
    case "pop":
      createPopSound(ctx, masterGain);
      break;
    case "bell":
      createBellSound(ctx, masterGain);
      break;
  }
};

export const useNotificationSound = () => {
  const lastPlayedRef = useRef<number>(0);

  const getVolume = useCallback((): number => {
    const stored = localStorage.getItem("notification-sound-volume");
    return stored ? parseFloat(stored) : 0.7;
  }, []);

  const setVolume = useCallback((volume: number) => {
    localStorage.setItem("notification-sound-volume", String(Math.max(0, Math.min(1, volume))));
  }, []);

  const playSound = useCallback(() => {
    const now = Date.now();
    if (now - lastPlayedRef.current < 1000) return;
    
    const soundType = (localStorage.getItem("notification-sound-type") || "ping") as SoundType;
    const volume = getVolume();
    if (soundType === "none" || volume === 0) return;
    
    lastPlayedRef.current = now;
    
    try {
      playNotificationSound(soundType, volume);
    } catch (error) {
      console.log("Could not play notification sound:", error);
    }
  }, [getVolume]);

  const previewSound = useCallback((soundType: SoundType, volume?: number) => {
    try {
      const vol = volume ?? getVolume();
      playNotificationSound(soundType, vol);
    } catch (error) {
      console.log("Could not play sound:", error);
    }
  }, [getVolume]);

  const setSoundType = useCallback((type: SoundType) => {
    localStorage.setItem("notification-sound-type", type);
  }, []);

  const getSoundType = useCallback((): SoundType => {
    return (localStorage.getItem("notification-sound-type") || "ping") as SoundType;
  }, []);

  return { 
    playSound, 
    previewSound, 
    setSoundType, 
    getSoundType, 
    getVolume, 
    setVolume, 
    soundOptions: SOUND_OPTIONS 
  };
};
