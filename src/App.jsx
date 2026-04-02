import React, { useState } from 'react';
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
    // 1. Fetch Guardian from Supabase
    const { data, error: fetchError } = await supabase
      .from('guardians')
      .select('phone, name')
      .order('created_at', { ascending: false })
      .limit(1);

    if (fetchError) {
      console.error("Error fetching guardian:", fetchError);
      return;
    }

    if (data && data.length > 0) {
      const guardian = data[0];

      // 2. VOICE FEEDBACK: Talk to the senior immediately
      speakToUser("A potential scam has been detected. I am notifying your guardian now. Please do not give out any personal information.");

      // 3. LOGGING: Save incident to 'scam_logs' table
      const { error: logError } = await supabase
        .from('scam_logs')
        .insert([{
          transcript: scamText,
          guardian_notified: guardian.name,
          severity: 'high'
        }]);
      
      if (logError) console.error("Database log failed:", logError);

      // 4. TWILIO: Send the actual SMS
      const success = await sendSmsAlert(guardian.phone, guardian.name, scamText);
      
      if (success) {
        alert(`🚨 SOS ALERT SENT TO ${guardian.name.toUpperCase()}!`);
      } else {
        alert("❌ SMS failed to send, but the incident has been recorded in the database.");
      }
    } else {
      alert("No Guardian found! Please set a guardian below first.");
    }
  };

  // --- AZURE SPEECH LOGIC ---
  const startListening = () => {
    const speechConfig = SpeechSDK.SpeechConfig.fromSubscription(
      import.meta.env.VITE_AZURE_SPEECH_KEY, 
      import.meta.env.VITE_AZURE_SPEECH_REGION
    );
    
    const audioConfig = SpeechSDK.AudioConfig.fromDefaultMicrophoneInput();
    const recognizer = new SpeechSDK.SpeechRecognizer(speechConfig, audioConfig);

    setIsListening(true);
    setTranscript("Listening for safety...");

    recognizer.recognizeOnceAsync(result => {
      if (result.reason === SpeechSDK.ResultReason.RecognizedSpeech) {
        const text = result.text;
        setTranscript(text);

        // Scam Detection Logic
        const detection = detectScam(text);

        if (detection.isScam) {
          setStatus('danger'); 
          handleScamAlert(text);
        } else {
          setStatus('safe');
        }
      } else {
        setTranscript("I didn't catch that. Please try again.");
      }
      setIsListening(false);
      recognizer.close();
    });
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