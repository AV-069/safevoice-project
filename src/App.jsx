import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import * as SpeechSDK from 'microsoft-cognitiveservices-speech-sdk';

// Modular Imports
import { detectScam, speakToUser } from './utils/scamDetector'; 
import { sendSmsAlert } from './services/twilioService';
import { StatusDisplay } from './components/StatusDisplay';

function App() {
  const [status, setStatus] = useState('safe'); 
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("Click start and say something...");
  const [guardianName, setGuardianName] = useState('');
  const [guardianPhone, setGuardianPhone] = useState('');

  // --- SOS LOGIC (VOICE + DB LOGGING + SMS) ---
  const handleScamAlert = async (scamText) => {
    // Prevent multiple alerts for the same sentence
    if (status === 'danger') return;
    
    setStatus('danger');
    
    const { data, error: fetchError } = await supabase
      .from('guardians')
      .select('phone, name')
      .order('created_at', { ascending: false })
      .limit(1);

    if (fetchError || !data || data.length === 0) {
      alert("Scam detected! But no Guardian found. Please set details below.");
      return;
    }

    const guardian = data[0];

    // 1. VOICE FEEDBACK: Immediate Warning
    speakToUser("Warning. A potential scam pattern has been detected. I am notifying your guardian now. Do not share any banking details.");

    // 2. LOGGING: Save to Supabase
    await supabase.from('scam_logs').insert([{
      transcript: scamText,
      guardian_notified: guardian.name,
      severity: 'high'
    }]);

    // 3. TWILIO: SMS Alert
    const success = await sendSmsAlert(guardian.phone, guardian.name, scamText);
    if (success) {
      console.log("SMS Sent successfully");
    }
  };

  // --- AZURE SPEECH LOGIC (MULTILINGUAL + CONTINUOUS) ---
  const startListening = () => {
    // Unlock Voice for Mobile Browsers
    const silentUtterance = new SpeechSynthesisUtterance("");
    window.speechSynthesis.speak(silentUtterance); 

    const speechConfig = SpeechSDK.SpeechConfig.fromSubscription(
      import.meta.env.VITE_AZURE_SPEECH_KEY, 
      import.meta.env.VITE_AZURE_SPEECH_REGION
    );

    // 1. IMPROVED ACCURACY: Switch to Indian English
    speechConfig.speechRecognitionLanguage = "en-IN"; 

    // 2. MULTILINGUAL AUTO-DETECTION: (English, Hindi, Tamil)
    const autoDetectConfig = SpeechSDK.AutoDetectSourceLanguageConfig.fromLanguages(
  ["en-IN", "hi-IN", "ta-IN", "te-IN", "ml-IN"] 
  // English, Hindi, Tamil, Telugu, Malayalam
);

    const audioConfig = SpeechSDK.AudioConfig.fromDefaultMicrophoneInput();
    
    // 3. INITIALIZE RECOGNIZER
    const recognizer = new SpeechSDK.SpeechRecognizer(speechConfig, audioConfig, autoDetectConfig);

    // 4. ADD DYNAMIC PHRASE LIST (Context Boosters)
    const phraseList = SpeechSDK.PhraseListGrammar.fromRecognizer(recognizer);
    phraseList.addPhrase("Digital Arrest");
    phraseList.addPhrase("Verification");
    phraseList.addPhrase("CBI Department");
    phraseList.addPhrase("Quiet room");

    setIsListening(true);
    setTranscript("SafeVoice active. Listening to conversation...");

    // 5. CONTINUOUS RECOGNITION (Better for long scam stories)
    recognizer.startContinuousRecognitionAsync();

    recognizer.recognized = (s, e) => {
      if (e.result.reason === SpeechSDK.ResultReason.RecognizedSpeech) {
        const text = e.result.text;
        setTranscript(text);

        // Check for scam patterns in every recognized sentence
        if (detectScam(text)) {
          handleScamAlert(text);
        }
      }
    };

    recognizer.canceled = (s, e) => {
      setIsListening(false);
      recognizer.stopContinuousRecognitionAsync();
    };
  };

  // --- SUPABASE SAVE LOGIC ---
  const saveGuardian = async () => {
    if (!guardianName || !guardianPhone) return alert("Please fill both name and phone!");
    const { error } = await supabase
      .from('guardians')
      .insert([{ name: guardianName, phone: guardianPhone }]);
    if (error) {
      alert("Error saving: " + error.message);
    } else { 
      alert("Guardian Details Saved Successfully!"); 
      setGuardianName(''); 
      setGuardianPhone(''); 
    }
  };

  return (
    <div className={`min-h-screen flex flex-col items-center justify-center p-6 transition-all duration-500 ${status === 'safe' ? 'bg-emerald-50' : 'bg-red-600'}`}>
      <h1 className={`text-5xl font-black mb-8 uppercase ${status === 'safe' ? 'text-emerald-800' : 'text-white'}`}>SafeVoice</h1>
      
      <StatusDisplay status={status} transcript={transcript} />

      <button 
        onClick={startListening}
        disabled={isListening}
        className={`w-48 h-48 rounded-full shadow-2xl flex items-center justify-center text-white my-10 border-8 transition-all ${isListening ? 'bg-orange-500 animate-pulse' : 'bg-blue-600 hover:scale-105'}`}
      >
        <span className="text-2xl font-black uppercase">{isListening ? 'Listening' : 'Start'}</span>
      </button>

      <div className="bg-white p-8 rounded-[40px] shadow-2xl w-full max-w-md border-4 border-blue-600">
        <h2 className="text-xl font-black text-blue-900 mb-4 uppercase text-center">Guardian Settings</h2>
        <input type="text" placeholder="Guardian Name" value={guardianName} onChange={(e) => setGuardianName(e.target.value)} className="w-full p-3 mb-3 border-2 rounded-xl focus:border-blue-400 outline-none" />
        <input type="text" placeholder="Guardian Phone (e.g., +91...)" value={guardianPhone} onChange={(e) => setGuardianPhone(e.target.value)} className="w-full p-3 mb-4 border-2 rounded-xl focus:border-blue-400 outline-none" />
        <button onClick={saveGuardian} className="w-full bg-emerald-600 text-white p-4 rounded-xl font-bold hover:bg-emerald-700 transition-colors">SAVE DETAILS</button>
      </div>
    </div>
  );
}

export default App;