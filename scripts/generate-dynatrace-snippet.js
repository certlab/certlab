/**
 * Generate Dynatrace RUM snippet for index.html
 * 
 * This script generates the inline Dynatrace monitoring snippet that should be
 * placed in the <head> section of index.html for optimal performance.
 * 
 * Usage:
 *   node scripts/generate-dynatrace-snippet.js
 * 
 * Environment variables required:
 *   VITE_DYNATRACE_ENVIRONMENT_ID
 *   VITE_DYNATRACE_APPLICATION_ID
 *   VITE_DYNATRACE_BEACON_URL
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read environment from .env file if it exists
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=:#]+)=(.*)$/);
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2].trim();
    }
  });
}

const config = {
  environmentId: process.env.VITE_DYNATRACE_ENVIRONMENT_ID,
  applicationId: process.env.VITE_DYNATRACE_APPLICATION_ID,
  beaconUrl: process.env.VITE_DYNATRACE_BEACON_URL,
};

// Validate configuration
if (!config.environmentId || !config.applicationId || !config.beaconUrl) {
  console.error('Error: Dynatrace configuration incomplete.');
  console.error('Required environment variables:');
  console.error('  - VITE_DYNATRACE_ENVIRONMENT_ID');
  console.error('  - VITE_DYNATRACE_APPLICATION_ID');
  console.error('  - VITE_DYNATRACE_BEACON_URL');
  console.error('');
  console.error('Please set these in your .env file or environment.');
  process.exit(1);
}

// Generate the snippet
const snippet = `
<!-- Dynatrace RUM Monitoring -->
<!-- 
  Generated snippet for environment: ${config.environmentId}
  Application ID: ${config.applicationId}
  
  This script should be placed as early as possible in the <head> section
  for optimal performance monitoring. It loads asynchronously to avoid
  blocking page rendering.
  
  For manual generation, run: node scripts/generate-dynatrace-snippet.js
  For configuration details, see: DYNATRACE_SETUP.md
-->
<script type="text/javascript">
(function() {
  var dt = document.createElement('script');
  dt.type = 'text/javascript';
  dt.async = true;
  dt.crossOrigin = 'anonymous';
  dt.src = '${config.beaconUrl}/jstag/${config.applicationId}';
  var s = document.getElementsByTagName('script')[0];
  s.parentNode.insertBefore(dt, s);
})();
</script>
<!-- End Dynatrace RUM Monitoring -->
`.trim();

// Output to console
console.log('\n=== Dynatrace RUM Snippet ===\n');
console.log(snippet);
console.log('\n');
console.log('Copy the above snippet and paste it into client/index.html');
console.log('Place it inside the <head> section, before other scripts.');
console.log('');
console.log('Configuration:');
console.log(`  Environment ID: ${config.environmentId}`);
console.log(`  Application ID: ${config.applicationId}`);
console.log(`  Beacon URL: ${config.beaconUrl}`);
console.log('');

// Optionally save to a file
const outputPath = path.join(__dirname, '..', 'dynatrace-snippet.html');
fs.writeFileSync(outputPath, snippet);
console.log(`Snippet saved to: ${outputPath}`);
console.log('');
