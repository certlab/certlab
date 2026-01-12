/**
 * Certificate Generation Utilities
 *
 * Provides utilities for generating printable/downloadable certificates
 * with customizable templates and branding.
 */

import { format } from 'date-fns';
import { escapeHtml } from './sanitize';
import type { Certificate, CertificateTemplate } from '@shared/schema';

/**
 * Options for generating a certificate PDF
 */
export interface CertificateOptions {
  /** Certificate data */
  certificate: Certificate;
  /** Optional template for custom styling */
  template?: CertificateTemplate;
  /** Optional QR code data URL for verification */
  qrCodeDataUrl?: string;
}

/**
 * Default certificate template
 */
const defaultTemplate: Partial<CertificateTemplate> = {
  borderStyle: 'double',
  borderColor: '#0066cc',
  backgroundColor: '#ffffff',
  textColor: '#333333',
  accentColor: '#0066cc',
  fontFamily: 'Georgia',
};

/**
 * Generates the border style CSS based on template settings
 */
function getBorderStyle(template: Partial<CertificateTemplate>): string {
  const style = template.borderStyle || 'double';
  const color = template.borderColor || '#0066cc';

  switch (style) {
    case 'solid':
      return `border: 8px solid ${color}`;
    case 'double':
      return `border: 10px double ${color}`;
    case 'dashed':
      return `border: 8px dashed ${color}`;
    case 'none':
      return 'border: none';
    default:
      return `border: 10px double ${color}`;
  }
}

/**
 * Generates HTML for a printable certificate.
 * All user-provided content is properly escaped to prevent XSS.
 *
 * @param options - Configuration for certificate generation
 * @returns Complete HTML document string for the print window
 */
export function generateCertificateHtml(options: CertificateOptions): string {
  const { certificate, template = {}, qrCodeDataUrl } = options;
  const finalTemplate = { ...defaultTemplate, ...template };

  const backgroundColor = finalTemplate.backgroundColor || '#ffffff';
  const textColor = finalTemplate.textColor || '#333333';
  const accentColor = finalTemplate.accentColor || '#0066cc';
  const fontFamily = finalTemplate.fontFamily || 'Georgia';
  const borderStyle = getBorderStyle(finalTemplate);

  const formattedDate = format(
    certificate.completedAt instanceof Date
      ? certificate.completedAt
      : new Date(certificate.completedAt),
    'MMMM d, yyyy'
  );

  const resourceTypeLabel =
    certificate.resourceType === 'quiz'
      ? 'Quiz'
      : certificate.resourceType === 'practiceTest'
        ? 'Practice Test'
        : 'Course';

  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Certificate of Completion - ${escapeHtml(certificate.userName)}</title>
        <style>
          @page { 
            size: landscape; 
            margin: 0;
          }
          
          * {
            box-sizing: border-box;
          }
          
          body { 
            font-family: '${escapeHtml(fontFamily)}', serif;
            text-align: center;
            padding: 0;
            margin: 0;
            background-color: ${escapeHtml(backgroundColor)};
            color: ${escapeHtml(textColor)};
            width: 100vw;
            height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          
          .certificate-container {
            width: 100%;
            max-width: 1000px;
            padding: 60px 80px;
          }
          
          .certificate-border {
            ${borderStyle};
            padding: 40px 60px;
            background-color: ${escapeHtml(backgroundColor)};
            min-height: 600px;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
          }
          
          .certificate-logo {
            margin-bottom: 20px;
          }
          
          .certificate-logo img {
            max-height: 80px;
            max-width: 200px;
          }
          
          .certificate-title {
            font-size: 48px;
            font-weight: bold;
            color: ${escapeHtml(accentColor)};
            margin: 20px 0;
            letter-spacing: 2px;
            text-transform: uppercase;
          }
          
          .certificate-subtitle {
            font-size: 20px;
            color: ${escapeHtml(textColor)};
            margin-bottom: 30px;
            font-style: italic;
          }
          
          .recipient-name {
            font-size: 36px;
            font-weight: bold;
            margin: 30px 0;
            color: ${escapeHtml(accentColor)};
            border-bottom: 2px solid ${escapeHtml(accentColor)};
            display: inline-block;
            padding-bottom: 10px;
            min-width: 400px;
          }
          
          .achievement-text {
            font-size: 20px;
            line-height: 1.8;
            margin: 30px 0;
            color: ${escapeHtml(textColor)};
          }
          
          .achievement-text strong {
            font-size: 24px;
            color: ${escapeHtml(accentColor)};
          }
          
          .score-badge {
            display: inline-block;
            background-color: ${escapeHtml(accentColor)};
            color: white;
            padding: 10px 30px;
            border-radius: 50px;
            font-size: 24px;
            font-weight: bold;
            margin: 20px 0;
          }
          
          .certificate-footer {
            margin-top: 40px;
            display: flex;
            justify-content: space-around;
            align-items: flex-end;
          }
          
          .signature-section {
            text-align: center;
            flex: 1;
          }
          
          .signature-line {
            border-top: 2px solid ${escapeHtml(textColor)};
            margin: 10px 40px;
            padding-top: 8px;
          }
          
          .signature-img {
            max-height: 60px;
            max-width: 200px;
            margin-bottom: -10px;
          }
          
          .signature-title {
            font-size: 14px;
            font-weight: bold;
            color: ${escapeHtml(textColor)};
          }
          
          .signature-name {
            font-size: 16px;
            color: ${escapeHtml(accentColor)};
            margin-top: 5px;
          }
          
          .date-section {
            text-align: center;
            flex: 1;
          }
          
          .verification-section {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            display: flex;
            justify-content: center;
            align-items: center;
            gap: 20px;
          }
          
          .verification-info {
            text-align: left;
            font-size: 12px;
            color: #666;
          }
          
          .verification-id {
            font-family: monospace;
            font-size: 11px;
            color: #888;
          }
          
          .qr-code img {
            width: 80px;
            height: 80px;
          }
          
          @media print {
            body {
              print-color-adjust: exact;
              -webkit-print-color-adjust: exact;
            }
            .no-print {
              display: none;
            }
          }
        </style>
      </head>
      <body>
        <div class="certificate-container">
          <div class="certificate-border">
            <div>
              ${
                certificate.logoUrl
                  ? `
              <div class="certificate-logo">
                <img src="${escapeHtml(certificate.logoUrl)}" alt="Organization Logo" />
              </div>
              `
                  : ''
              }
              
              <h1 class="certificate-title">Certificate of Completion</h1>
              <p class="certificate-subtitle">This certifies that</p>
              
              <div class="recipient-name">${escapeHtml(certificate.userName)}</div>
              
              <p class="achievement-text">
                has successfully completed the<br/>
                <strong>${escapeHtml(resourceTypeLabel)}: ${escapeHtml(certificate.resourceTitle)}</strong>
                ${
                  certificate.organizationName
                    ? `<br/>offered by ${escapeHtml(certificate.organizationName)}`
                    : ''
                }
              </p>
              
              <div class="score-badge">
                Score: ${escapeHtml(String(certificate.score))}%
              </div>
            </div>
            
            <div>
              <div class="certificate-footer">
                <div class="date-section">
                  <div class="signature-line">
                    <div class="signature-title">Date</div>
                    <div class="signature-name">${escapeHtml(formattedDate)}</div>
                  </div>
                </div>
                
                <div class="signature-section">
                  ${
                    certificate.signatureUrl
                      ? `<img src="${escapeHtml(certificate.signatureUrl)}" alt="Signature" class="signature-img" />`
                      : ''
                  }
                  <div class="signature-line">
                    <div class="signature-title">Authorized By</div>
                    <div class="signature-name">${escapeHtml(certificate.issuedBy)}</div>
                  </div>
                </div>
              </div>
              
              <div class="verification-section">
                ${
                  qrCodeDataUrl
                    ? `
                <div class="qr-code">
                  <img src="${qrCodeDataUrl}" alt="Verification QR Code" />
                </div>
                `
                    : ''
                }
                <div class="verification-info">
                  <div><strong>Verification ID:</strong></div>
                  <div class="verification-id">${escapeHtml(certificate.verificationId)}</div>
                  <div style="margin-top: 5px; font-size: 10px;">
                    Verify at: ${window.location.origin}/verify-certificate
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <script>
          // Auto-print on load
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 500);
          }
        </script>
      </body>
    </html>
  `;
}

/**
 * Opens a new window with the certificate for printing/downloading
 *
 * @param options - Configuration for certificate generation
 * @returns Promise that resolves when the window is opened
 */
export async function printCertificate(options: CertificateOptions): Promise<void> {
  const html = generateCertificateHtml(options);
  const printWindow = window.open('', '_blank');

  if (!printWindow) {
    throw new Error('Popup blocked. Please allow popups to print certificates.');
  }

  printWindow.document.write(html);
  printWindow.document.close();
}

/**
 * Generates a QR code data URL for certificate verification
 *
 * @param verificationId - The certificate verification ID
 * @returns Promise resolving to a data URL for the QR code image
 */
export async function generateVerificationQRCode(verificationId: string): Promise<string> {
  // For now, return a placeholder. In production, you would use a QR code library
  // like qrcode or similar. This can be implemented when needed.
  const verificationUrl = `${window.location.origin}/verify-certificate/${verificationId}`;

  // Placeholder implementation - in real app, use a QR code library
  // Example: import QRCode from 'qrcode';
  // return await QRCode.toDataURL(verificationUrl);

  // For now, return empty string - the certificate will still work without QR code
  return '';
}

/**
 * Validates a certificate verification ID format
 *
 * @param verificationId - The verification ID to validate
 * @returns true if the format is valid (UUID v4)
 */
export function isValidVerificationId(verificationId: string): boolean {
  const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidV4Regex.test(verificationId);
}

/**
 * Generates a unique verification ID (UUID v4)
 *
 * @returns A unique verification ID
 */
export function generateVerificationId(): string {
  return crypto.randomUUID();
}
