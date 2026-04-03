import React, { useState, useCallback, useRef } from 'react';
import { supabase } from './supabaseClient';
import * as SpeechSDK from 'microsoft-cognitiveservices-speech-sdk';

// Modular Imports
import { detectScam } from './utils/scamDetector'; 
import { sendSmsAlert } from './services/twilioService';
import { StatusDisplay } from './components/StatusDisplay';

function App() {
  const [status, setStatus] = useState('safe'); 
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("Tap Start to begin protection");
  const [guardianName, setGuardianName] = useState('');
  const [guardianPhone, setGuardianPhone] = useState('');
  const [userLang, setUserLang] = useState('en');

  const recognizerRef = useRef(null);

  const startListening = () => {
    if (isListening) return;

    console.log("Button Clicked: Starting Engine...");

    const speechConfig = SpeechSDK.SpeechConfig.fromSubscription(
      import.meta.env.VITE_AZURE_SPEECH_KEY, 
      import.meta.env.VITE_AZURE_SPEECH_REGION
    );
    speechConfig.speechRecognitionLanguage = "en-IN"; 

    const audioConfig = SpeechSDK.AudioConfig.fromDefaultMicrophoneInput();
    const recognizer = new SpeechSDK.SpeechRecognizer(speechConfig, audioConfig);
    
    recognizerRef.current = recognizer;
    setIsListening(true);
    setTranscript("Listening for conversation...");
    
    recognizer.startContinuousRecognitionAsync();

    recognizer.recognized = (s, e) => {
      if (e.result.reason === SpeechSDK.ResultReason.RecognizedSpeech) {
        setTranscript(e.result.text);
        if (detectScam(e.result.text)) {
          setStatus('danger');
          // Simple alert for now to verify it works
          console.log("SCAM DETECTED!");
        }
      }
    };
  };

  const stopListening = () => {
    if (recognizerRef.current) {
      recognizerRef.current.stopContinuousRecognitionAsync();
      recognizerRef.current = null;
    }
    setIsListening(false);
    setTranscript("Stopped.");
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-emerald-50">
      <h1 className="text-5xl font-black mb-8 uppercase text-emerald-800">SafeVoice</h1>
      
      <StatusDisplay status={status} transcript={transcript} />

      {/* THE TOGGLE BUTTON */}
      <div className="my-10">
        {!isListening ? (
          <button 
            onClick={startListening}
            className="w-40 h-40 rounded-full shadow-2xl flex items-center justify-center text-white border-8 bg-blue-600 hover:scale-105 transition-transform"
          >
            <span className="text-2xl font-black uppercase">Start</span>
          </button>
        ) : (
          <button 
            onClick={stopListening}
            className="w-40 h-40 rounded-full shadow-2xl flex items-center justify-center text-white border-8 bg-orange-500 animate-pulse"
          >
            <span className="text-xl font-black uppercase">Stop</span>
          </button>
        )}
      </div>

      <div className="bg-white p-6 rounded-[30px] shadow-2xl w-full max-w-md border-4 border-blue-600">
        <h2 className="text-lg font-black text-blue-900 mb-3 text-center">Settings</h2>
        <input type="text" placeholder="Guardian Name" value={guardianName} onChange={(e) => setGuardianName(e.target.value)} className="w-full p-3 mb-2 border-2 rounded-xl" />
        <input type="text" placeholder="Guardian Phone" value={guardianPhone} onChange={(e) => setGuardianPhone(e.target.value)} className="w-full p-3 mb-3 border-2 rounded-xl" />
        <button onClick={() => alert('Saved!')} className="w-full bg-emerald-600 text-white p-3 rounded-xl font-bold">SAVE</button>
      </div>
    </div>
  );
}

export default App;