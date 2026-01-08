import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import { initializeDynatrace } from './lib/dynatrace';

// Initialize Dynatrace RUM monitoring before rendering
// This should happen as early as possible to capture all user interactions
// Dynatrace is optional - app will function normally if not configured
const dynatraceEnabled = initializeDynatrace();
if (dynatraceEnabled) {
  console.log('[CertLab] Dynatrace monitoring initialized successfully');
} else {
  console.log('[CertLab] Running without Dynatrace monitoring');
}

// Render the application
createRoot(document.getElementById('root')!).render(<App />);
