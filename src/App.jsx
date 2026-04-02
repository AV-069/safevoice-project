import React, { useState } from 'react';

function App() {
  const [isListening, setIsListening] = useState(false);
  const [status, setStatus] = useState('safe'); // 'safe' or 'alert'

  return (
    <div className={`min-h-screen flex flex-col items-center justify-center p-6 transition-colors duration-500 ${status === 'safe' ? 'bg-emerald-50' : 'bg-red-100'}`}>
      
      {/* Status Header */}
      <div className="text-center mb-10">
        <h1 className={`text-6xl font-black mb-4 ${status === 'safe' ? 'text-emerald-700' : 'text-red-700'}`}>
          {status === 'safe' ? 'SYSTEM SAFE' : '⚠️ SCAM ALERT!'}
        </h1>
        <p className="text-2xl font-bold text-gray-700">
          {isListening ? '🛡️ Protecting You Now...' : 'System is Sleeping'}
        </p>
      </div>

      {/* Main Action Button - Massive for Senior Accessibility */}
      <button 
        onClick={() => setIsListening(!isListening)}
        className={`w-72 h-72 rounded-full shadow-2xl flex items-center justify-center text-white transition-all transform active:scale-90 border-8 ${isListening ? 'bg-orange-500 border-orange-200 animate-pulse' : 'bg-blue-600 border-blue-200'}`}
      >
        <span className="text-4xl font-black uppercase text-center leading-tight">
          {isListening ? 'Stop\nSafety' : 'Start\nSafety'}
        </span>
      </button>

      {/* Emergency Contact Status Card */}
      <div className="mt-16 bg-white p-8 rounded-[40px] shadow-2xl w-full max-w-md border-4 border-blue-600">
        <h2 className="text-2xl font-black text-blue-900 mb-2">Guardian:</h2>
        <p className="text-4xl font-bold text-gray-800">FAMILY ALERT ON</p>
        <p className="text-xl mt-2 text-gray-600">They will get an SMS if a scam is found.</p>
      </div>

      {/* Test Button - To check the Red Alert screen */}
      <button 
        onClick={() => setStatus(status === 'safe' ? 'alert' : 'safe')}
        className="mt-12 text-gray-400 font-bold underline decoration-2"
      >
        Click to Test Alert View
      </button>

    </div>
  );
}

export default App;