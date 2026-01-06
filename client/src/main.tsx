import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import { initializeDynatrace } from './lib/dynatrace';

// Initialize Dynatrace RUM monitoring before rendering
// This should happen as early as possible to capture all user interactions
// Dynatrace is REQUIRED - initialization will throw an error if not configured
try {
  initializeDynatrace();
  console.log('[CertLab] Dynatrace monitoring initialized successfully');
} catch (error) {
  console.error('[CertLab] Failed to initialize Dynatrace monitoring:', error);
  // Display error to user instead of rendering the app
  const errorMessage = error instanceof Error ? error.message : String(error);

  // Create error page using DOM methods to avoid XSS vulnerabilities
  const container = document.createElement('div');
  container.style.cssText =
    'min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #f9fafb; padding: 1rem;';

  const card = document.createElement('div');
  card.style.cssText =
    'max-width: 42rem; width: 100%; background: white; border: 2px solid #ef4444; border-radius: 0.5rem; padding: 2rem; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);';

  const header = document.createElement('div');
  header.style.cssText = 'display: flex; align-items: center; margin-bottom: 1rem;';

  const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  icon.setAttribute(
    'style',
    'width: 1.5rem; height: 1.5rem; color: #ef4444; margin-right: 0.5rem;'
  );
  icon.setAttribute('fill', 'none');
  icon.setAttribute('stroke', 'currentColor');
  icon.setAttribute('viewBox', '0 0 24 24');
  const iconPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  iconPath.setAttribute('stroke-linecap', 'round');
  iconPath.setAttribute('stroke-linejoin', 'round');
  iconPath.setAttribute('stroke-width', '2');
  iconPath.setAttribute(
    'd',
    'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z'
  );
  icon.appendChild(iconPath);

  const title = document.createElement('h1');
  title.style.cssText = 'font-size: 1.5rem; font-weight: bold; color: #dc2626;';
  title.textContent = 'Dynatrace Configuration Required';

  header.appendChild(icon);
  header.appendChild(title);

  const errorBox = document.createElement('div');
  errorBox.style.cssText =
    'background: #fef2f2; border: 1px solid #fecaca; border-radius: 0.375rem; padding: 1rem; margin-bottom: 1.5rem;';

  const errorLabel = document.createElement('p');
  errorLabel.style.cssText = 'font-weight: 600; margin-bottom: 0.5rem; color: #991b1b;';
  errorLabel.textContent = 'Error:';

  const errorText = document.createElement('p');
  errorText.style.cssText = 'font-size: 0.875rem; color: #7f1d1d;';
  errorText.textContent = errorMessage; // Safe - uses textContent

  errorBox.appendChild(errorLabel);
  errorBox.appendChild(errorText);

  const instructions = document.createElement('div');
  instructions.style.cssText = 'margin-bottom: 1.5rem;';
  instructions.innerHTML = `
    <p style="font-weight: 600; margin-bottom: 0.5rem; color: #111827;">Dynatrace observability is required for this application to run.</p>
    <p style="font-size: 0.875rem; margin-bottom: 1rem; color: #4b5563;">To fix this issue, follow these steps:</p>
    <ol style="list-style: decimal; margin-left: 1.5rem; font-size: 0.875rem; color: #4b5563; line-height: 1.5;">
      <li>Sign up for Dynatrace at <a href="https://www.dynatrace.com/trial" style="color: #2563eb; text-decoration: underline;">https://www.dynatrace.com/trial</a> (free trial available)</li>
      <li>Create a web application in your Dynatrace environment</li>
      <li>Navigate to: Applications & Microservices → Web applications → Your app</li>
      <li>Click "..." → Edit → Setup → Instrumentation code</li>
      <li>Copy the complete src URL from the &lt;script&gt; tag</li>
      <li>Set the <code style="background: #f3f4f6; padding: 0.125rem 0.25rem; border-radius: 0.25rem; font-family: monospace;">VITE_DYNATRACE_SCRIPT_URL</code> environment variable</li>
      <li>Rebuild and redeploy the application</li>
    </ol>
  `;

  const footer = document.createElement('div');
  footer.style.cssText =
    'font-size: 0.75rem; color: #6b7280; padding-top: 1rem; border-top: 1px solid #e5e7eb;';
  footer.innerHTML = `
    <p>For detailed setup instructions, see <code style="background: #f3f4f6; padding: 0.125rem 0.25rem; border-radius: 0.25rem; font-family: monospace;">docs/setup/dynatrace.md</code></p>
    <p style="margin-top: 0.5rem;">Contact your system administrator if you need assistance.</p>
  `;

  card.appendChild(header);
  card.appendChild(errorBox);
  card.appendChild(instructions);
  card.appendChild(footer);
  container.appendChild(card);

  document.body.innerHTML = ''; // Clear body
  document.body.appendChild(container);
  throw error; // Prevent app from rendering
}

createRoot(document.getElementById('root')!).render(<App />);
