import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const body = req.body || {};
    const { 
      clinic_id = 'richmond-pilot-01', 
      patient_name, 
      patient_phone, 
      patient_email, 
      service_name, 
      service_reason, 
      start_time, 
      slot_time 
    } = body;

    const patient = patient_name || 'Patient';
    const phone = patient_phone || 'Unlisted';
    const email = patient_email || 'Unlisted';
    const service = service_name || service_reason || 'Doctor Consultation';
    const time = start_time || slot_time || 'Tomorrow at 10:00 AM';

    console.log('[AUTONOMOUS RECEPTIONIST INTAKE HIT]');
    console.log(`Clinic: ${clinic_id}`);
    console.log(`Patient: ${patient} | Phone: ${phone} | Email: ${email}`);
    console.log(`Service: ${service} | Time: ${time}`);

    const bookingId = `rec_${Date.now()}`;
    const confirmationSummary = `Consultation reserved for ${patient} for ${service} on ${time}. Logged under ${email}.`;

    // Asynchronously dispatch email notification to the clinic inbox
    if (process.env.RESEND_API_KEY) {
      resend.emails.send({
        from: 'Glow AI Alerts <onboarding@resend.dev>',
        to: process.env.CLINIC_NOTIFICATION_EMAIL || 'someshbadli@gmail.com',
        subject: `[New After-Hours Intake] ${patient} — ${service}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
            <h2 style="color: #0f766e; margin-top: 0;">New After-Hours Intake Captured</h2>
            <p>Savannah has recorded a new patient booking on the Richmond clinic line:</p>
            <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 8px 0; color: #64748b; font-weight: bold;">Patient Name:</td>
                <td style="padding: 8px 0; color: #0f172a;">${patient}</td>
              </tr>
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 8px 0; color: #64748b; font-weight: bold;">Phone:</td>
                <td style="padding: 8px 0; color: #0f172a;">${phone}</td>
              </tr>
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 8px 0; color: #64748b; font-weight: bold;">Email:</td>
                <td style="padding: 8px 0; color: #0f172a;">${email}</td>
              </tr>
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 8px 0; color: #64748b; font-weight: bold;">Requested Service:</td>
                <td style="padding: 8px 0; color: #0f172a;">${service}</td>
              </tr>
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 8px 0; color: #64748b; font-weight: bold;">Preferred Slot:</td>
                <td style="padding: 8px 0; color: #0f172a;">${time}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b; font-weight: bold;">Intake Channel:</td>
                <td style="padding: 8px 0; color: #0f172a;">Autonomous Voice Receptionist (+1 804-259-1091)</td>
              </tr>
            </table>
            <p style="margin-top: 20px; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 12px;">
              Glow AI Autonomous Clinic Infrastructure • Tenant: ${clinic_id} • Booking ID: ${bookingId}
            </p>
          </div>
        `
      }).catch(mailErr => console.error('[EMAIL_DISPATCH_ERROR]:', mailErr));
    }

    return res.status(200).json({
      result: confirmationSummary,
      success: true,
      message: confirmationSummary,
      booking_id: bookingId,
      intake: { patient, phone, email, service, time }
    });
  } catch (err) {
    console.error('[BOOKING_ERROR]:', err);
    return res.status(500).json({ 
      result: "Failed to record consultation.",
      error: 'Internal Server Error' 
    });
  }
}
