import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import { initializeDynatrace } from './lib/dynatrace';

// Initialize Dynatrace RUM monitoring before rendering
// This should happen as early as possible to capture all user interactions
initializeDynatrace();

createRoot(document.getElementById('root')!).render(<App />);
