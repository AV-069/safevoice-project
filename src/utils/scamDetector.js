export const SCAM_KEYWORDS = [
  "arrest", "police", "bank", "account", "transfer", 
  "otp", "password", "urgent", "lottery", "kyc"
];

export const detectScam = (text) => {
  const lowercaseText = text.toLowerCase();
  const foundWords = SCAM_KEYWORDS.filter(word => lowercaseText.includes(word));

  return {
    isScam: foundWords.length > 0,
    matchedWords: foundWords,
    severity: foundWords.length > 2 ? 'high' : 'medium'
  };
};

// src/utils/scamDetector.js (Add this at the end)

export const speakToUser = (message) => {
  const synth = window.speechSynthesis;
  const utterance = new SpeechSynthesisUtterance(message);
  utterance.rate = 0.9; // Slightly slower for clarity
  utterance.pitch = 1;
  synth.speak(utterance);
};