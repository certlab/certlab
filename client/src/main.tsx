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

  const mainText = document.createElement('p');
  mainText.style.cssText = 'font-weight: 600; margin-bottom: 0.5rem; color: #111827;';
  mainText.textContent = 'Dynatrace observability is required for this application to run.';

  const subText = document.createElement('p');
  subText.style.cssText = 'font-size: 0.875rem; margin-bottom: 1rem; color: #4b5563;';
  subText.textContent = 'To fix this issue, follow these steps:';

  const list = document.createElement('ol');
  list.style.cssText =
    'list-style: decimal; margin-left: 1.5rem; font-size: 0.875rem; color: #4b5563; line-height: 1.5;';

  const steps = [
    {
      text: 'Sign up for Dynatrace at ',
      link: { text: 'https://www.dynatrace.com/trial', href: 'https://www.dynatrace.com/trial' },
      suffix: ' (free trial available)',
    },
    { text: 'Create a web application in your Dynatrace environment' },
    { text: 'Navigate to: Applications & Microservices → Web applications → Your app' },
    { text: 'Click "..." → Edit → Setup → Instrumentation code' },
    { text: 'Copy the complete src URL from the <script> tag' },
    { text: 'Set the ', code: 'VITE_DYNATRACE_SCRIPT_URL', suffix: ' environment variable' },
    { text: 'Rebuild and redeploy the application' },
  ];

  steps.forEach((step) => {
    const li = document.createElement('li');
    li.style.cssText = 'margin-bottom: 0.25rem;';

    if (step.link) {
      li.textContent = step.text;
      const link = document.createElement('a');
      link.href = step.link.href;
      link.textContent = step.link.text;
      link.style.cssText = 'color: #2563eb; text-decoration: underline;';
      li.appendChild(link);
      if (step.suffix) {
        li.appendChild(document.createTextNode(step.suffix));
      }
    } else if (step.code) {
      li.textContent = step.text;
      const code = document.createElement('code');
      code.textContent = step.code;
      code.style.cssText =
        'background: #f3f4f6; padding: 0.125rem 0.25rem; border-radius: 0.25rem; font-family: monospace;';
      li.appendChild(code);
      if (step.suffix) {
        li.appendChild(document.createTextNode(step.suffix));
      }
    } else {
      li.textContent = step.text;
    }

    list.appendChild(li);
  });

  instructions.appendChild(mainText);
  instructions.appendChild(subText);
  instructions.appendChild(list);

  const footer = document.createElement('div');
  footer.style.cssText =
    'font-size: 0.75rem; color: #6b7280; padding-top: 1rem; border-top: 1px solid #e5e7eb;';

  const footerText1 = document.createElement('p');
  footerText1.textContent = 'For detailed setup instructions, see ';
  const footerCode = document.createElement('code');
  footerCode.textContent = 'docs/setup/dynatrace.md';
  footerCode.style.cssText =
    'background: #f3f4f6; padding: 0.125rem 0.25rem; border-radius: 0.25rem; font-family: monospace;';
  footerText1.appendChild(footerCode);

  const footerText2 = document.createElement('p');
  footerText2.style.cssText = 'margin-top: 0.5rem;';
  footerText2.textContent = 'Contact your system administrator if you need assistance.';

  footer.appendChild(footerText1);
  footer.appendChild(footerText2);

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
