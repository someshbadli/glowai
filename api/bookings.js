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
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const rawBody = req.body || {};
    // Extract parameters whether sent flat or wrapped in Vapi's message/toolCall structure
    const args = rawBody.message?.toolCalls?.[0]?.function?.arguments 
      ? (typeof rawBody.message.toolCalls[0].function.arguments === 'string' 
          ? JSON.parse(rawBody.message.toolCalls[0].function.arguments) 
          : rawBody.message.toolCalls[0].function.arguments)
      : rawBody;

    const clinic_id = args.clinic_id || 'richmond-pilot-01';
    const patient = args.patient_name || 'Valued Patient';
    const phone = args.patient_phone || 'Unlisted';
    const email = (args.patient_email && args.patient_email.includes('@')) 
      ? args.patient_email.trim() 
      : 'someshbadli@gmail.com';
    const service = args.service_name || args.service_reason || 'Doctor Consultation';
    const time = args.start_time || args.slot_time || 'Tomorrow at 10:00 AM';

    console.log('[BOOKING INTAKE RECEIVED]');
    console.log(`Clinic: ${clinic_id} | Patient: ${patient} | Email: ${email}`);

    const bookingId = `rec_${Date.now()}`;
    const confirmationSummary = `Consultation reserved for ${patient} for ${service} on ${time}. Logged under ${email}.`;

    // Send emails synchronously before returning response
    if (process.env.RESEND_API_KEY) {
      try {
        // 1. Alert to Clinic Front Desk
        const clinicAlert = await resend.emails.send({
          from: 'Glow AI Alerts <onboarding@resend.dev>',
          to: 'someshbadli@gmail.com',
          subject: `[New Intake] ${patient} — ${service}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
              <h2 style="color: #0f766e; margin-top: 0;">New After-Hours Intake Captured</h2>
              <p>Savannah recorded a new appointment via the Richmond clinic line (+1 804-259-1091):</p>
              <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
                <tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 8px 0; font-weight: bold; color: #64748b;">Patient:</td><td style="padding: 8px 0;">${patient}</td></tr>
                <tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 8px 0; font-weight: bold; color: #64748b;">Phone:</td><td style="padding: 8px 0;">${phone}</td></tr>
                <tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 8px 0; font-weight: bold; color: #64748b;">Email:</td><td style="padding: 8px 0;">${email}</td></tr>
                <tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 8px 0; font-weight: bold; color: #64748b;">Service:</td><td style="padding: 8px 0;">${service}</td></tr>
                <tr style="border-bottom: 1px solid #f1f5f9;"><td style="padding: 8px 0; font-weight: bold; color: #64748b;">Requested Slot:</td><td style="padding: 8px 0;">${time}</td></tr>
              </table>
            </div>
          `
        });
        console.log('[RESEND SUCCESS - CLINIC ALERT]:', clinicAlert);
      } catch (mailErr) {
        console.error('[RESEND ERROR - CLINIC ALERT]:', mailErr);
      }

      // 2. Patient Confirmation matching Dr. Vijay sample
      if (email && email.includes('@')) {
        try {
          const patientAlert = await resend.emails.send({
            from: 'Doctor Office Confirmation <onboarding@resend.dev>',
            to: email,
            subject: `Appointment Confirmation with Dr. Vijay — ${time}`,
            text: `Hello ${patient},\n\nYou have an appointment with Dr. Vijay.\nDate & Time: ${time}\nLocation: Suite 2, 1234 All St, Richmond, VA 23059\n\nPlease confirm or cancel by calling our office at 804-259-1091 between 9:00 AM to 5:00 PM.\n\nThank you.`
          });
          console.log('[RESEND SUCCESS - PATIENT ALERT]:', patientAlert);
        } catch (mailErr2) {
          console.error('[RESEND ERROR - PATIENT ALERT]:', mailErr2);
        }
      }
    }

    return res.status(200).json({
      result: confirmationSummary,
      success: true,
      message: confirmationSummary,
      booking_id: bookingId,
      intake: { patient, phone, email, service, time }
    });
  } catch (err) {
    console.error('[BOOKING_FATAL_ERROR]:', err);
    return res.status(500).json({ 
      result: "Failed to record consultation.",
      error: 'Internal Server Error' 
    });
  }
}
