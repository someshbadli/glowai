export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  try {
    const {
      clinic_name = 'Your Practice',
      contact_name = 'Practice Manager',
      work_email,
      phone_carrier = 'Standard Landline / VoIP',
      assigned_ai_number = '+1 (804) 259-1091',
      country = 'USA'
    } = req.body || {};

    if (!work_email) {
      return res.status(400).json({ error: 'work_email is required' });
    }

    const carrierLower = phone_carrier.toLowerCase();
    let forwardingGuide = `Dial *72 followed by ${assigned_ai_number} when closing for the day or during lunch, and dial *73 when returning.`;
    if (carrierLower.includes('ringcentral')) {
      forwardingGuide = `In RingCentral Admin Portal -> Phone System -> Users -> Call Handling & Forwarding, add ${assigned_ai_number} under "After Hours" and "When Busy / Unanswered (3 rings)".`;
    } else if (carrierLower.includes('nextiva')) {
      forwardingGuide = `In Nextiva Voice Portal -> Users -> Call Routing -> Call Forwarding Busy / No Answer / After Hours, enter ${assigned_ai_number}.`;
    } else if (carrierLower.includes('bell') || carrierLower.includes('rogers') || carrierLower.includes('telus')) {
      forwardingGuide = `On your Canadian business line (${phone_carrier}), dial *72 + ${assigned_ai_number} for immediate after-hours forwarding, or *92 + ${assigned_ai_number} for Forward-on-Busy rollover.`;
    }

    const planLabel = country === 'Canada' ? '$650.00 CAD/mo (or $6,500 CAD/yr — 2 Months Free)' : '$500.00 USD/mo (or $5,000 USD/yr — 2 Months Free)';
    const resendKey = process.env.RESEND_API_KEY;

    if (resendKey) {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: 'Glow AI Onboarding <appointments@glowaiautomation.com>',
          to: [work_email],
          cc: ['somesh@glowaiautomation.com'],
          subject: `Welcome to Glow AI — Your 14-Day Pilot Workspace & Call-Forwarding Setup (${clinic_name})`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; color: #0f172a; line-height: 1.6;">
              <h2 style="color: #0d9488;">Welcome to Glow AI, ${contact_name}!</h2>
              <p>Your <strong>$0, 14-Day Clinical Pilot</strong> for <strong>${clinic_name}</strong> is officially registered.</p>
              <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin: 16px 0;">
                <p style="margin: 0 0 8px;"><strong>1. Client Workspace Login:</strong> <a href="https://glowaiautomation.com/#portal">glowaiautomation.com/#portal</a></p>
                <p style="margin: 0 0 8px;"><strong>Registered Email:</strong> ${work_email}</p>
                <p style="margin: 0 0 8px;"><strong>Temporary Portal Password:</strong> <code>GlowClinic2026!</code></p>
                <p style="margin: 0;"><strong>Post-Trial Retainer Rate:</strong> ${planLabel}</p>
              </div>
              <h3 style="color: #0f172a;">2. Zero-Software Call Forwarding (${phone_carrier})</h3>
              <p>${forwardingGuide}</p>
              <p style="font-size: 13px; color: #475569;">Need assistance configuring your carrier rollover? Reply directly to this email or open a ticket inside your Client Portal.</p>
            </div>
          `
        })
      });
    }

    return res.status(200).json({ success: true, emailed: Boolean(resendKey) });
  } catch (err) {
    console.error('[ONBOARD_WELCOME_ERROR]:', err);
    return res.status(500).json({ error: 'Failed to dispatch welcome email' });
  }
}
