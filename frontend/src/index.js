import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

// Suppress React DevTools download message and browser extension errors in development
if (process.env.NODE_ENV === 'development') {
  // Override console methods to filter out unwanted messages
  const originalLog = console.log;
  const originalInfo = console.info;
  const originalError = console.error;
  const originalWarn = console.warn;
  
  const shouldSuppress = (message) => {
    return message.includes('Download the React DevTools') ||
           message.includes('reactjs.org/link/react-devtools') ||
           message.includes('chrome-extension://') ||
           message.includes('userReportLinkedCandidate.json') ||
           (message.includes('net::ERR_FILE_NOT_FOUND') && message.includes('chrome-extension'));
  };
  
  console.log = (...args) => {
    const message = args.join(' ');
    if (shouldSuppress(message)) return;
    originalLog.apply(console, args);
  };
  
  console.info = (...args) => {
    const message = args.join(' ');
    if (shouldSuppress(message)) return;
    originalInfo.apply(console, args);
  };
  
  console.warn = (...args) => {
    const message = args.join(' ');
    if (shouldSuppress(message)) return;
    originalWarn.apply(console, args);
  };
  
  console.error = (...args) => {
    const message = args.join(' ');
    // Only suppress browser extension errors, not actual app errors
    if (shouldSuppress(message)) return;
    originalError.apply(console, args);
  };
  
  // Also intercept network errors from Chrome extensions
  const originalFetch = window.fetch;
  window.fetch = (...args) => {
    const url = args[0]?.toString() || '';
    if (url.includes('chrome-extension://')) {
      // Silently ignore Chrome extension fetch requests
      return Promise.reject(new Error('Chrome extension request ignored'));
    }
    return originalFetch.apply(window, args).catch(error => {
      // Suppress network errors from Chrome extensions
      if (error.message && error.message.includes('chrome-extension://')) {
        return Promise.reject();
      }
      throw error;
    });
  };
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
