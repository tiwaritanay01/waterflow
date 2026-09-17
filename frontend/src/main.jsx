import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Phase 2: Register PWA Service Worker for Offline Caching & Background Sync
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js').then((registration) => {
      console.log('✅ PWA ServiceWorker active with scope:', registration.scope);
    }).catch((err) => {
      console.warn('⚠️ ServiceWorker registration error:', err);
    });
  });
}

