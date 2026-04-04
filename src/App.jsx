import React, { useState, useRef } from 'react';
import { supabase } from './supabaseClient';
import * as SpeechSDK from 'microsoft-cognitiveservices-speech-sdk';

// Modular Imports
import { detectScam } from './utils/scamDetector'; 
import { StatusDisplay } from './components/StatusDisplay';

function App() {
  // 1. STATED LOCKDOWN: Explicitly start as false
  const [status, setStatus] = useState('safe'); 
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("Tap Start to begin protection");
  
  const [guardianName, setGuardianName] = useState('');
  const [guardianPhone, setGuardianPhone] = useState('');

  const recognizerRef = useRef(null);

  // 2. THE TRIGGER: This function NO LONGER runs automatically
  const startListening = () => {
    // If already listening, do nothing
    if (isListening || recognizerRef.current) return;

    console.log("MANUAL TRIGGER: startListening called");
    // console.trace(); // This will show you exactly what called this function

    try {
      const speechConfig = SpeechSDK.SpeechConfig.fromSubscription(
        import.meta.env.VITE_AZURE_SPEECH_KEY, 
        import.meta.env.VITE_AZURE_SPEECH_REGION
      );
      speechConfig.speechRecognitionLanguage = "en-IN"; 

      const audioConfig = SpeechSDK.AudioConfig.fromDefaultMicrophoneInput();
      const recognizer = new SpeechSDK.SpeechRecognizer(speechConfig, audioConfig);
      
      recognizerRef.current = recognizer;
      
      // Update UI state
      setIsListening(true);
      setTranscript("Listening for conversation...");
      
      recognizer.startContinuousRecognitionAsync();

      recognizer.recognized = (s, e) => {
        if (e.result.reason === SpeechSDK.ResultReason.RecognizedSpeech) {
          const text = e.result.text;
          setTranscript(text);
          if (detectScam(text)) {
            setStatus('danger');
          }
        }
      };

      recognizer.canceled = () => {
        stopListening();
      };

    } catch (err) {
      console.error("Speech SDK Error:", err);
      setTranscript("Error starting microphone.");
    }
  };

  const stopListening = () => {
    if (recognizerRef.current) {
      recognizerRef.current.stopContinuousRecognitionAsync();
      recognizerRef.current = null;
    }
    setIsListening(false);
    setTranscript("Protection stopped.");
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-emerald-50">
      <h1 className="text-5xl font-black mb-8 uppercase text-emerald-800 tracking-tighter">SafeVoice</h1>
      
      <StatusDisplay status={status} transcript={transcript} />

      <div className="my-12">
        {/* 3. THE BUTTON: Strict boolean check */}
        {!isListening ? (
          <button 
            key="start-btn"
            onClick={() => startListening()} 
            className="w-44 h-44 rounded-full shadow-2xl flex items-center justify-center text-white border-8 border-white bg-blue-600 hover:scale-105 active:scale-95 transition-all"
          >
            <span className="text-2xl font-black uppercase">Start</span>
          </button>
        ) : (
          <button 
            key="stop-btn"
            onClick={() => stopListening()}
            className="w-44 h-44 rounded-full shadow-2xl flex items-center justify-center text-white border-8 border-white bg-orange-500 animate-pulse"
          >
            <span className="text-xl font-black uppercase">Stop</span>
          </button>
        )}
      </div>

      <div className="bg-white p-6 rounded-[30px] shadow-xl w-full max-w-md border-2 border-emerald-100">
        <h2 className="text-lg font-black text-emerald-900 mb-3 text-center uppercase">Guardian Info</h2>
        <input 
          type="text" 
          placeholder="Name" 
          value={guardianName} 
          onChange={(e) => setGuardianName(e.target.value)} 
          className="w-full p-3 mb-2 border-2 rounded-xl bg-gray-50 outline-none focus:border-blue-400" 
        />
        <input 
          type="text" 
          placeholder="Phone" 
          value={guardianPhone} 
          onChange={(e) => setGuardianPhone(e.target.value)} 
          className="w-full p-3 mb-4 border-2 rounded-xl bg-gray-50 outline-none focus:border-blue-400" 
        />
        <button 
          onClick={() => alert('Settings Saved')} 
          className="w-full bg-emerald-600 text-white p-3 rounded-xl font-bold uppercase hover:bg-emerald-700 transition-colors"
        >
          Save Details
        </button>
      </div>
    </div>
  );
}

export default App;