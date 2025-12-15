import { useCallback, useRef } from "react";

// Simple notification sound using Web Audio API
const createNotificationSound = () => {
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  
  // Create a pleasant "ping" notification sound
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  oscillator.frequency.setValueAtTime(880, audioContext.currentTime); // A5 note
  oscillator.frequency.setValueAtTime(1320, audioContext.currentTime + 0.1); // E6 note
  
  gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
  
  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + 0.3);
};

export const useNotificationSound = () => {
  const lastPlayedRef = useRef<number>(0);

  const playSound = useCallback(() => {
    // Prevent sound spam - minimum 1 second between sounds
    const now = Date.now();
    if (now - lastPlayedRef.current < 1000) return;
    
    // Check if sounds are enabled
    if (localStorage.getItem("notification-sound-enabled") === "false") return;
    
    lastPlayedRef.current = now;
    
    try {
      createNotificationSound();
    } catch (error) {
      console.log("Could not play notification sound:", error);
    }
  }, []);

  const setSoundEnabled = useCallback((enabled: boolean) => {
    localStorage.setItem("notification-sound-enabled", String(enabled));
  }, []);

  const isSoundEnabled = useCallback(() => {
    return localStorage.getItem("notification-sound-enabled") !== "false";
  }, []);

  return { playSound, setSoundEnabled, isSoundEnabled };
};
