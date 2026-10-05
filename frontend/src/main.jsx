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
      // Immediately check if a newer version of the service worker is available on the server
      registration.update().catch(() => {});
    }).catch((err) => {
      console.warn('⚠️ ServiceWorker registration error:', err);
    });

    let isRefreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!isRefreshing) {
        isRefreshing = true;
        console.log('🔄 New service worker activated, reloading for latest build...');
        window.location.reload();
      }
    });
  });
}

