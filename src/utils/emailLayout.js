import fs from 'fs';
import path from 'path';

const LOGO_PATH = path.join(process.cwd(), 'logo', 'logo1.png');

/** CID for inline logo attachment – use in img src="cid:vsc-logo" so Gmail shows the image. */
export const LOGO_CID = 'vsc-logo';

const HEADER_TITLE = 'VINOD SINGHAL & CO. LLP';
const FOOTER_ADDRESS = 'Office 222, 2nd floor, Ganpati Plaza, M.I. Road, Jaipur-302001, Rajasthan';
const FOOTER_WEBSITE = 'www.vsc.co.in';
const FOOTER_PHONE = '0141-2389290';

let logoBufferCache = null;

/** Read logo from disk and return as Buffer for inline attachment. Returns null if file missing. */
export function getLogoBuffer() {
  if (logoBufferCache !== null) return logoBufferCache;
  try {
    if (fs.existsSync(LOGO_PATH)) {
      logoBufferCache = fs.readFileSync(LOGO_PATH);
    } else {
      logoBufferCache = false;
    }
  } catch {
    logoBufferCache = false;
  }
  return logoBufferCache || null;
}

/** Nodemailer inline attachment for the footer logo. Pass in attachments array when using layout with useCid. */
export function getLogoAttachment() {
  const buf = getLogoBuffer();
  if (!buf) return null;
  return { filename: 'logo.png', content: buf, cid: LOGO_CID };
}

/** Read logo from disk and return as data URL (fallback; Gmail often blocks this). */
let logoDataUrlCache = null;
export function getLogoDataUrl() {
  if (logoDataUrlCache !== null) return logoDataUrlCache;
  const buf = getLogoBuffer();
  if (buf) logoDataUrlCache = `data:image/png;base64,${buf.toString('base64')}`;
  else logoDataUrlCache = '';
  return logoDataUrlCache || '';
}

/** If content looks like a full HTML document, extract the body inner HTML to avoid nesting. */
function toInnerFragment(html) {
  if (!html || typeof html !== 'string') return '';
  const s = html.trim();
  const bodyMatch = s.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  return bodyMatch ? bodyMatch[1].trim() : s;
}

/**
 * Wrap inner HTML with default VSC header and footer (logo, address, phone, website).
 * If you pass a full HTML document (with <body>), only the body content is used.
 * @param {string} innerContentHtml - Main body HTML (template or custom content) or full document
 * @param {{ useCid?: boolean }} [opts] - useCid: true to use cid: inline image (recommended for Gmail); requires attaching getLogoAttachment() when sending
 * @returns {string} Full HTML document
 */
export function wrapWithDefaultLayout(innerContentHtml, opts = {}) {
  const inner = toInnerFragment(innerContentHtml);
  const useCid = opts.useCid === true;
  const logoImg = useCid
    ? `<img src="cid:${LOGO_CID}" alt="VINOD SINGHAL & CO. LLP" style="max-width:180px;height:auto;display:block;margin-bottom:12px;" />`
    : getLogoDataUrl()
      ? `<img src="${getLogoDataUrl()}" alt="VINOD SINGHAL & CO. LLP" style="max-width:180px;height:auto;display:block;margin-bottom:12px;" />`
      : '';

  return `<!DOCTYPE html>
<html lang="en" style="margin:0;">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>VINOD SINGHAL & CO. LLP</title>
  <style>
    body { margin: 0; font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #1a1a1a; background: #f5f5f5; }
    .vsc-header { background-color: #001f3f !important; color: #ffffff !important; }
    .vsc-footer { background-color: #001f3f !important; color: #ffffff !important; }
    .vsc-footer a { color: #ffffff !important; }
  </style>
</head>
<body style="margin:0; font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #1a1a1a; background-color: #f5f5f5;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:640px; margin:0 auto; background-color: #ffffff;">
    <tr>
      <td style="background-color: #001f3f; color: #ffffff; padding: 28px 32px; font-size: 22px; font-weight: 600; letter-spacing: 0.02em;" class="vsc-header">
        <div style="margin:0; color: #ffffff;">VINOD SINGHAL & CO. LLP</div>
        <div style="margin: 8px 0 0 0; color: #ffffff; font-size: 11px; text-transform: uppercase; letter-spacing: 0.12em;">Chartered Accountants</div>
      </td>
    </tr>
    <tr>
      <td style="padding: 28px 32px; min-height: 80px; color: #1a1a1a; background-color: #ffffff;">
${inner || '<p style="margin:0;"></p>'}
      </td>
    </tr>
    <tr>
      <td style="background-color: #001f3f; color: #ffffff; padding: 24px 32px; font-size: 13px;" class="vsc-footer">
        <div style="margin-bottom: 16px; color: #ffffff;">${logoImg}</div>
        <div style="margin: 6px 0; color: #ffffff;">${FOOTER_ADDRESS}</div>
        <div style="margin: 6px 0;"><a href="https://${FOOTER_WEBSITE}" style="color: #ffffff; text-decoration: none;">${FOOTER_WEBSITE}</a></div>
        <div style="margin: 6px 0; color: #ffffff;">${FOOTER_PHONE}</div>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
