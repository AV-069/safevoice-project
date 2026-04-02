import React from 'react';

export const StatusDisplay = ({ status, transcript }) => {
  const isDanger = status === 'danger';

  return (
    <div className={`w-full max-w-lg p-8 rounded-3xl shadow-lg border-4 transition-all duration-700 
      ${isDanger ? 'bg-red-100 border-red-600' : 'bg-white border-emerald-200'}`}>
      <h3 className={`text-sm uppercase font-black mb-2 ${isDanger ? 'text-red-600' : 'text-emerald-500'}`}>
        {isDanger ? '⚠️ Threat Detected' : '✅ System Monitoring'}
      </h3>
      <p className="text-2xl font-bold text-gray-800 italic">
        "{transcript}"
      </p>
    </div>
  );
};