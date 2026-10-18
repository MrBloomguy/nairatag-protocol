import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Dismiss splash screen smoothly after initial mount
setTimeout(() => {
  const splash = document.getElementById('app-splash');
  if (splash) {
    splash.style.opacity = '0';
    splash.style.visibility = 'hidden';
    splash.style.pointerEvents = 'none';
    setTimeout(() => splash.remove(), 450);
  }
}, 450);
