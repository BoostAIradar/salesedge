import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';

const globalStyles = document.createElement('style');
globalStyles.textContent = `
  @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap');

  *, *::before, *::after {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  body {
    font-family: 'JetBrains Mono', monospace;
    background: #09090C;
    color: #EAEAF4;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  ::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }
  ::-webkit-scrollbar-track {
    background: #0E0E14;
  }
  ::-webkit-scrollbar-thumb {
    background: #2A2A3A;
    border-radius: 3px;
  }
  ::-webkit-scrollbar-thumb:hover {
    background: #3A3A4A;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.4; }
  }

  @keyframes slideIn {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
`;
document.head.appendChild(globalStyles);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
