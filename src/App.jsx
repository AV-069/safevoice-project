import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from './supabaseClient';
import * as SpeechSDK from 'microsoft-cognitiveservices-speech-sdk';

// Modular Imports
import { detectScam, speakToUser } from './utils/scamDetector'; 
import { sendSmsAlert } from './services/twilioService';
import { StatusDisplay } from './components/StatusDisplay';

const GUIDANCE_DATA = {
  authority: {
    en: { reply: "Ask: 'Which station are you calling from and what is your ID?'", truth: "⚠️ Real police never arrest people over a video call." },
    ta: { reply: "கேளுங்கள்: 'எந்த ஸ்டேஷனில் இருந்து பேசுகிறீர்கள்? உங்கள் ஐடி என்ன?'", truth: "⚠️ போலீசார் போன் மூலம் யாரையும் கைது செய்ய மாட்டார்கள்." },
    hi: { reply: "पूछें: 'आप किस थाने से बोल रहे हैं? अपनी आईडी दिखाएं।'", truth: "⚠️ पुलिस फोन पर कभी गिरफ्तार नहीं करती।" }
  },
  money: {
    en: { reply: "Say: 'I will discuss this with my family first.'", truth: "🛑 NO government 'Secure Vault' exists for private transfers." },
    ta: { reply: "சொல்லுங்கள்: 'நான் என் குடும்பத்தினரிடம் கேட்டுவிட்டு சொல்கிறேன்.'", truth: "🛑 பணத்தை மாற்றச் சொன்னால் அது 100% மோசடி." },
    hi: { reply: "कहें: 'मैं पहले अपने परिवार से बात करूँगा।'", truth: "🛑 सरकारी 'सेक्यூர் वॉल्ट' जैसा कुछ नहीं होता।" }
  },
  isolation: {
    en: { reply: "Say: 'I am hanging up now to call the local police.'", truth: "🔒 Scammers want you alone so they can scare you. Hang up!" },
    ta: { reply: "சொல்லுங்கள்: 'நான் போனை வைத்துவிட்டு போலீசுக்கு போன் செய்கிறேன்.'", truth: "🔒 உங்களைத் தனியாக இருக்கச் சொன்னால் அது பொய்." },
    hi: { reply: "कहें: 'मैं फोन काटकर पुलिस को कॉल कर रहा हूँ।'", truth: "🔒 वे आपको ডराना چاہتے हैं, कृपया फोन काट दें।" }
  }
};

function App() {
  const [status, setStatus] = useState('safe'); 
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("Ready to protect...");
  const [guardianName, setGuardianName] = useState('');
  const [guardianPhone, setGuardianPhone] = useState('');
  const [advice, setAdvice] = useState({ reply: "Monitoring...", truth: "Stay calm." });
  const [userLang, setUserLang] = useState('en');

  const recognizerRef = useRef(null);

  // --- AZURE SPEECH LOGIC ---
  const startListening = useCallback(() => {
    // PREVENT DOUBLE START
    if (isListening || recognizerRef.current) return;

    console.log("SafeVoice: Starting Microphone Engine...");

    const speechConfig = SpeechSDK.SpeechConfig.fromSubscription(
      import.meta.env.VITE_AZURE_SPEECH_KEY, 
      import.meta.env.VITE_AZURE_SPEECH_REGION
    );
    speechConfig.speechRecognitionLanguage = "en-IN"; 

    const autoDetectConfig = SpeechSDK.AutoDetectSourceLanguageConfig.fromLanguages(
      ["en-IN", "hi-IN", "ta-IN", "te-IN", "ml-IN"] 
    );

    const audioConfig = SpeechSDK.AudioConfig.fromDefaultMicrophoneInput();
    const recognizer = new SpeechSDK.SpeechRecognizer(speechConfig, audioConfig, autoDetectConfig);
    recognizerRef.current = recognizer;

    setIsListening(true);
    setTranscript("SafeVoice is listening...");
    
    recognizer.startContinuousRecognitionAsync();

    recognizer.recognized = (s, e) => {
      if (e.result.reason === SpeechSDK.ResultReason.RecognizedSpeech) {
        const text = e.result.text;
        setTranscript(text);
        if (detectScam(text)) {
          handleScamAlert(text);
        }
      }
    };

    recognizer.canceled = () => {
      setIsListening(false);
      recognizerRef.current = null;
      setTranscript("Stopped. Tap Start to resume.");
    };
  }, [isListening]);

  // --- STRICT AUTO-START LOGIC ---
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const triggerAuto = params.get('autoStart') === 'true';

    console.log("SafeVoice Init: AutoStart found?", triggerAuto);

    if (triggerAuto) {
      // Small delay to ensure browser environment is ready
      setTimeout(() => startListening(), 1000);
    }

    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []); // EMPTY ARRAY = RUNS ONLY ONCE ON LOAD

  // --- SOS & GUIDANCE LOGIC ---
  const handleScamAlert = async (scamText) => {
    const text = scamText.toLowerCase();
    let category = null;

    if (text.includes("police") || text.includes("cbi") || text.includes("arrest") || text.includes("jail")) category = "authority";
    if (text.includes("transfer") || text.includes("money") || text.includes("account") || text.includes("vault")) category = "money";
    if (text.includes("alone") || text.includes("quiet") || text.includes("don't tell") || text.includes("disconnect")) category = "isolation";

    if (category) {
      setAdvice(GUIDANCE_DATA[category][userLang]);
      if (status !== 'danger') {
        setStatus('danger');
        triggerSos(scamText);
      }
    }
  };

  const triggerSos = async (scamText) => {
    const { data } = await supabase.from('guardians').select('phone, name').order('created_at', { ascending: false }).limit(1);
    if (data && data.length > 0) {
      const guardian = data[0];
      await supabase.from('scam_logs').insert([{ transcript: scamText, guardian_notified: guardian.name, severity: 'high' }]);
      sendSmsAlert(guardian.phone, guardian.name, scamText);
    }
  };

  const saveGuardian = async () => {
    if (!guardianName || !guardianPhone) return alert("Fill fields!");
    const { error } = await supabase.from('guardians').insert([{ name: guardianName, phone: guardianPhone }]);
    if (!error) { alert("Saved!"); setGuardianName(''); setGuardianPhone(''); }
  };

  return (
    <div className={`min-h-screen flex flex-col items-center justify-center p-6 transition-all duration-500 ${status === 'safe' ? 'bg-emerald-50' : 'bg-red-600'}`}>
      <h1 className={`text-5xl font-black mb-4 uppercase ${status === 'safe' ? 'text-emerald-800' : 'text-white'}`}>SafeVoice</h1>
      
      <div className="flex gap-2 mb-6">
        {['en', 'hi', 'ta'].map((lang) => (
          <button key={lang} onClick={() => setUserLang(lang)} className={`px-4 py-1 rounded-full font-bold uppercase text-xs border-2 ${userLang === lang ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300'}`}>
            {lang === 'en' ? 'English' : lang === 'hi' ? 'Hindi' : 'Tamil'}
          </button>
        ))}
      </div>

      <StatusDisplay status={status} transcript={transcript} />

      {status === 'danger' && (
        <div className="w-full max-w-md mt-6 space-y-4">
          <div className="bg-white border-l-8 border-blue-600 p-5 rounded-2xl shadow-xl">
            <p className="text-xs font-black text-blue-600 uppercase mb-1">REPLY THIS:</p>
            <p className="text-xl font-bold">"{advice.reply}"</p>
          </div>
          <div className="bg-yellow-400 border-l-8 border-black p-5 rounded-2xl shadow-xl">
            <p className="text-xs font-black text-black uppercase mb-1">THE TRUTH:</p>
            <p className="text-lg font-extrabold text-black">{advice.truth}</p>
          </div>
          <button onClick={() => { setStatus('safe'); setAdvice({reply: "Monitoring...", truth: "Stay calm."}) }} className="w-full bg-black text-white p-3 rounded-xl font-black uppercase">I AM SAFE</button>
        </div>
      )}

      <button 
        onClick={startListening}
        disabled={isListening}
        className={`w-40 h-40 rounded-full shadow-2xl flex items-center justify-center text-white my-8 border-8 transition-all ${isListening ? 'bg-orange-500 animate-pulse' : 'bg-blue-600 hover:scale-105'}`}
      >
        <span className="text-xl font-black uppercase">{isListening ? 'Listening' : 'Start'}</span>
      </button>

      <div className="bg-white p-6 rounded-[30px] shadow-2xl w-full max-w-md border-4 border-blue-600">
        <h2 className="text-lg font-black text-blue-900 mb-3 text-center uppercase">Guardian Settings</h2>
        <input type="text" placeholder="Name" value={guardianName} onChange={(e) => setGuardianName(e.target.value)} className="w-full p-3 mb-2 border-2 rounded-xl focus:border-blue-400 outline-none" />
        <input type="text" placeholder="Phone (+91...)" value={guardianPhone} onChange={(e) => setGuardianPhone(e.target.value)} className="w-full p-3 mb-3 border-2 rounded-xl focus:border-blue-400 outline-none" />
        <button onClick={saveGuardian} className="w-full bg-emerald-600 text-white p-3 rounded-xl font-bold hover:bg-emerald-700">SAVE DETAILS</button>
      </div>
    </div>
  );
}

export default App;