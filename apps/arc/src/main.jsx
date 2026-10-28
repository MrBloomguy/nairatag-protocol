import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './index.css';

createRoot(document.getElementById('root')).render(
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

// Register Service Worker for PWA installation & background sync
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.debug('[PWA] Service worker registration:', err);
    });
  });
}
