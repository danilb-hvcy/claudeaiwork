import React from 'react';

export default function TypingIndicator() {
  return (
    <div className="hv-msg hv-msg-skye hv-typing-wrap">
      <div className="hv-avatar">
        <PalmTreeIcon />
      </div>
      <div className="hv-bubble hv-bubble-skye hv-typing">
        <span className="hv-dot" />
        <span className="hv-dot" />
        <span className="hv-dot" />
      </div>
    </div>
  );
}

function PalmTreeIcon() {
  return (
    <svg viewBox="0 0 40 40" width="28" height="28" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="40" height="40" rx="20" fill="#00C4CC" />
      <text x="8" y="28" fontSize="20">🌴</text>
    </svg>
  );
}
