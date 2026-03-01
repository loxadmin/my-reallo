import { useCallback } from "react";

export const useWelcomeVoice = () => {
  const playWelcomeMessage = useCallback(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      console.warn("Speech synthesis not supported in this browser.");
      return;
    }

    const message = "Welcome to Reallo! The place where you can claim back all the money you spend on data and electricity purchase back";

    const speak = () => {
      const utterance = new SpeechSynthesisUtterance(message);
      const voices = window.speechSynthesis.getVoices();

      // Attempt to find a female voice
      const femaleVoice = voices.find(voice =>
        voice.name.toLowerCase().includes("female") ||
        voice.name.toLowerCase().includes("samantha") ||
        voice.name.toLowerCase().includes("victoria") ||
        voice.name.toLowerCase().includes("zira") ||
        voice.name.toLowerCase().includes("google us english")
      );

      if (femaleVoice) {
        utterance.voice = femaleVoice;
      }

      // Voice settings for a clearer female sound
      utterance.pitch = 1.1;
      utterance.rate = 0.95;

      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    };

    if (window.speechSynthesis.getVoices().length === 0) {
      window.speechSynthesis.onvoiceschanged = speak;
    } else {
      speak();
    }
  }, []);

  return { playWelcomeMessage };
};
