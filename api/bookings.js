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

    const patient = patient_name || 'Valued Patient';
    const phone = patient_phone || 'Unlisted';
    const email = patient_email && patient_email.includes('@') ? patient_email : 'someshbadli@gmail.com';
    const service = service_name || service_reason || 'Doctor Consultation';
    const time = start_time || slot_time || 'Upcoming Clinic Hours';

    console.log('[AUTONOMOUS RECEPTIONIST INTAKE HIT]');
    console.log(`Clinic: ${clinic_id} | Patient: ${patient} | Phone: ${phone} | Email: ${email}`);

    const bookingId = `rec_${Date.now()}`;
    const confirmationSummary = `Consultation reserved for ${patient} for ${service} on ${time}. Details dispatched to ${email}.`;

    if (process.env.RESEND_API_KEY) {
      // 1. Alert to Clinic Front Desk
      resend.emails.send({
        from: 'Glow AI Alerts <onboarding@resend.dev>',
        to: process.env.CLINIC_NOTIFICATION_EMAIL || 'someshbadli@gmail.com',
        subject: `[New Intake] ${patient} — ${service}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
            <h2 style="color: #0f766e; margin-top: 0;">New After-Hours Intake Captured</h2>
            <p>Savannah has recorded a new patient booking on the Richmond clinic line (+1 804-259-1091):</p>
            <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
              <tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 8px 0; font-weight: bold; color: #64748b;">Patient:</td><td style="padding: 8px 0;">${patient}</td></tr>
              <tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 8px 0; font-weight: bold; color: #64748b;">Phone:</td><td style="padding: 8px 0;">${phone}</td></tr>
              <tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 8px 0; font-weight: bold; color: #64748b;">Email:</td><td style="padding: 8px 0;">${email}</td></tr>
              <tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 8px 0; font-weight: bold; color: #64748b;">Service:</td><td style="padding: 8px 0;">${service}</td></tr>
              <tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 8px 0; font-weight: bold; color: #64748b;">Requested Slot:</td><td style="padding: 8px 0;">${time}</td></tr>
            </table>
          </div>
        `
      }).catch(err => console.error('[CLINIC_ALERT_ERR]:', err));

      // 2. Patient Confirmation matching Dr. Vijay's Exact Sample
      resend.emails.send({
        from: 'Doctor Office Confirmation <onboarding@resend.dev>',
        to: email,
        subject: `Appointment Confirmation with Dr. Vijay — ${time}`,
        text: `Hello ${patient},

You have an appointment with Dr. Vijay.
Date & Time: ${time}
Location: Suite 2, 1234 All St, Richmond, VA 23059

Please confirm or cancel by calling our office at 804-259-1091 between 9:00 AM to 5:00 PM.

Thank you.`
      }).catch(err => console.error('[PATIENT_CONFIRMATION_ERR]:', err));
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
