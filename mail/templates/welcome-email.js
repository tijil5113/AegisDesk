// Email-client-safe welcome template. No JavaScript, no external assets.

const DEFAULT_FOUNDER_NAME = 'Monish Tijil';

const FEATURES = [
  { name: 'Tasks', detail: 'Capture work, set priorities, and keep follow-through in one place.' },
  { name: 'Notes', detail: 'Write and keep ideas close to the rest of your workspace.' },
  { name: 'AI Assistant', detail: 'Ask questions and get help without leaving AegisDesk.' },
  { name: 'Files', detail: 'Organize documents alongside the tools you use every day.' },
  { name: 'Calendar', detail: 'See your schedule without switching to another app.' },
  { name: 'News', detail: 'Stay informed from the same desktop as your work.' },
  { name: 'Music', detail: 'Keep focus music available while you work.' },
  { name: 'Calculator', detail: 'Quick calculations without breaking your flow.' },
  { name: 'Browser', detail: 'Open the web from inside the workspace.' },
  { name: 'Developer tools', detail: 'Use Terminal and the code editor when you need them.' }
];

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function safeName(value, fallback) {
  const trimmed = String(value || '').replace(/\s+/g, ' ').trim();
  if (!trimmed) return fallback;
  return trimmed.slice(0, 80);
}

export function buildWelcomeEmail({ recipientName, appUrl, founderName } = {}) {
  const founder = safeName(founderName, DEFAULT_FOUNDER_NAME);
  const greetingName = safeName(recipientName, '');
  const hello = greetingName ? `Welcome to AegisDesk, ${greetingName}.` : 'Welcome to AegisDesk.';
  const hasCta = Boolean(appUrl);
  const ctaUrl = hasCta ? String(appUrl) : '';

  const featureRows = FEATURES.map((feature, index) => {
    const bg = index % 2 === 0 ? '#161b22' : '#12161c';
    return `
      <tr>
        <td style="padding:14px 18px;background:${bg};border-bottom:1px solid #242b35;">
          <p style="margin:0 0 4px 0;font-family:Georgia,'Times New Roman',serif;font-size:16px;line-height:1.4;color:#f3f4f6;">${escapeHtml(feature.name)}</p>
          <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:14px;line-height:1.55;color:#b7c0cc;">${escapeHtml(feature.detail)}</p>
        </td>
      </tr>`;
  }).join('');

  const ctaBlock = hasCta
    ? `
      <tr>
        <td align="center" style="padding:8px 32px 36px 32px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td align="center" style="border-radius:6px;background:#d4af37;">
                <a href="${escapeHtml(ctaUrl)}" style="display:inline-block;padding:14px 28px;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:700;letter-spacing:0.04em;text-decoration:none;color:#111111;">Open AegisDesk</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>`
    : '';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Welcome to AegisDesk</title>
</head>
<body style="margin:0;padding:0;background:#0b0d10;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0b0d10;">
    <tr>
      <td align="center" style="padding:32px 12px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:100%;background:#0f1318;border:1px solid #242b35;">
          <tr>
            <td style="padding:36px 32px 20px 32px;border-bottom:1px solid #242b35;">
              <p style="margin:0 0 8px 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:0.28em;color:#d4af37;">AEGISDESK</p>
              <h1 style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:28px;line-height:1.25;font-weight:normal;color:#f8f5ef;">WELCOME TO AEGISDESK</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 32px 8px 32px;">
              <p style="margin:0 0 16px 0;font-family:Georgia,'Times New Roman',serif;font-size:18px;line-height:1.5;color:#f8f5ef;">${escapeHtml(hello)}</p>
              <p style="margin:0 0 16px 0;font-family:Georgia,'Times New Roman',serif;font-size:16px;line-height:1.7;color:#d5dbe3;">We are glad you are here.</p>
              <p style="margin:0 0 16px 0;font-family:Georgia,'Times New Roman',serif;font-size:16px;line-height:1.7;color:#d5dbe3;">AegisDesk was created around a simple idea: the tools you use every day should feel connected, focused, and effortless.</p>
              <p style="margin:0 0 8px 0;font-family:Georgia,'Times New Roman',serif;font-size:16px;line-height:1.7;color:#d5dbe3;">Your workspace brings essential tools together so you can organize, create, explore, and get things done without unnecessary friction.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px 8px 32px;">
              <p style="margin:0 0 12px 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:0.18em;color:#9aa4b2;">IN YOUR WORKSPACE</p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #242b35;">
                ${featureRows}
              </table>
            </td>
          </tr>
          ${ctaBlock}
          <tr>
            <td style="padding:8px 32px 36px 32px;">
              <p style="margin:0 0 18px 0;font-family:Georgia,'Times New Roman',serif;font-size:16px;line-height:1.7;color:#d5dbe3;">Welcome aboard.</p>
              <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:16px;line-height:1.5;color:#f8f5ef;">${escapeHtml(founder)}</p>
              <p style="margin:4px 0 0 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;letter-spacing:0.04em;color:#9aa4b2;">Founder &amp; CEO</p>
              <p style="margin:4px 0 0 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;letter-spacing:0.12em;color:#d4af37;">AEGISDESK</p>
            </td>
          </tr>
          <tr>
            <td style="padding:18px 32px;border-top:1px solid #242b35;background:#0b0d10;">
              <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.6;color:#6b7380;">You received this message because an AegisDesk workspace was set up for this address. This is an automated welcome note from AegisDesk.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const featureText = FEATURES.map((feature) => `- ${feature.name}: ${feature.detail}`).join('\n');
  const ctaText = hasCta ? `\nOpen AegisDesk:\n${ctaUrl}\n` : '\n';
  const text = `${hello}

We are glad you are here.

AegisDesk was created around a simple idea: the tools you use every day should feel connected, focused, and effortless.

Your workspace brings essential tools together so you can organize, create, explore, and get things done without unnecessary friction.

In your workspace:
${featureText}
${ctaText}
Welcome aboard.

${founder}
Founder & CEO
AegisDesk
`;

  return {
    subject: 'Welcome to AegisDesk — Your Workspace Is Ready',
    html,
    text: text.trim()
  };
}

export { DEFAULT_FOUNDER_NAME, FEATURES };
