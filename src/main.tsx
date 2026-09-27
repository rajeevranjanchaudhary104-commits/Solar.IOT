import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Intercept transient Firestore offline reconnect warnings so they do not crash the preview runtime
const originalConsoleError = console.error;
console.error = (...args: any[]) => {
  const msg = typeof args[0] === 'string' ? args[0] : '';
  if (
    msg.includes('Could not reach Cloud Firestore backend') ||
    msg.includes('@firebase/firestore') ||
    msg.includes('code=unavailable')
  ) {
    console.warn('[Firestore Connection Handler]:', ...args);
    return;
  }
  originalConsoleError(...args);
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

