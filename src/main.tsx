import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Spotify rejects `localhost` OAuth callbacks. Keep the local app on the same
// supported loopback origin as its callback before any PKCE state is created.
if (import.meta.env.DEV && window.location.hostname === 'localhost') {
  window.location.replace(`https://127.0.0.1:3000${window.location.pathname}${window.location.search}${window.location.hash}`);
} else {
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
}
