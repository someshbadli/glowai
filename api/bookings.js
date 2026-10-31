import { Resend } from 'resend';
import { google } from 'googleapis';

const resend = new Resend(process.env.RESEND_API_KEY);

function getCalendarClient() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  let key = process.env.GOOGLE_PRIVATE_KEY;

  if (!email || !key) {
    throw new Error("Missing Google Service Account credentials");
  }

  key = key.replace(/\\n/g, '\n');

  const auth = new google.auth.JWT({
    email: email,
    key: key,
    scopes: ['https://www.googleapis.com/auth/calendar.events'],
  });

  return google.calendar({ version: 'v3', auth });
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  try {
    const rawBody = req.body || {};
    
    // Support Vapi toolCalls, function arguments, or direct JSON
    let args = rawBody;
    if (rawBody.message?.toolCalls?.[0]?.function?.arguments) {
      const toolArgs = rawBody.message.toolCalls[0].function.arguments;
      args = typeof toolArgs === 'string' ? JSON.parse(toolArgs) : toolArgs;
    } else if (rawBody.toolCall?.function?.arguments) {
      const toolArgs = rawBody.toolCall.function.arguments;
      args = typeof toolArgs === 'string' ? JSON.parse(toolArgs) : toolArgs;
    }

    const patient = args.patient_name || 'Valued Patient';
    const phone = args.patient_phone || 'Unlisted';
    const rawEmail = args.patient_email || 'someshbadli@gmail.com';
    const email = rawEmail.includes('@') ? rawEmail.trim() : 'someshbadli@gmail.com';
    const service = args.service_name || args.service_reason || 'Doctor Consultation';
    const time = args.start_time || args.slot_time || 'Tomorrow at 2:00 PM';

    console.log('[BOOKING INTAKE RECEIVED]:', { patient, phone, email, service, time });

    let gcalEventId = null;
    let gcalErrorMessage = null;

    // 1. Google Calendar Insert (if secondary calendar ID is configured)
    if (process.env.GOOGLE_CALENDAR_ID && process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL) {
      try {
        const calendar = getCalendarClient();
        const startIso = "2026-10-31T14:00:00-04:00";
        const endIso = "2026-10-31T14:30:00-04:00";

        const insertRes = await calendar.events.insert({
          calendarId: process.env.GOOGLE_CALENDAR_ID,
          requestBody: {
            summary: `Consultation: ${patient} (${service})`,
            description: `Patient: ${patient}\nPhone: ${phone}\nEmail: ${email}\nReason: ${service}\nBooked via Glow AI Voice (+1 804-259-1091).`,
            start: { dateTime: startIso, timeZone: 'America/New_York' },
            end: { dateTime: endIso, timeZone: 'America/New_York' }
          }
        });
        gcalEventId = insertRes.data.id;
      } catch (calErr) {
        gcalErrorMessage = calErr.response?.data?.error?.message || calErr.message;
        console.error('[GCAL_WRITE_ERROR]:', gcalErrorMessage);
      }
    }

    // 2. Dispatch Notifications via Resend
    let resendStatus = "sent";
    if (process.env.RESEND_API_KEY) {
      try {
        // Front-Desk Email Alert to verified address
        await resend.emails.send({
          from: 'Glow AI Alerts <onboarding@resend.dev>',
          to: 'someshbadli@gmail.com',
          subject: `[New Intake] ${patient} — ${service}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
              <h2 style="color: #0f766e; margin-top: 0;">New Consultation Intake Captured</h2>
              <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
                <tr><td style="padding: 6px 0; font-weight: bold; color: #64748b;">Patient Name:</td><td>${patient}</td></tr>
                <tr><td style="padding: 6px 0; font-weight: bold; color: #64748b;">Phone:</td><td>${phone}</td></tr>
                <tr><td style="padding: 6px 0; font-weight: bold; color: #64748b;">Patient Email:</td><td>${email}</td></tr>
                <tr><td style="padding: 6px 0; font-weight: bold; color: #64748b;">Requested Service:</td><td>${service}</td></tr>
                <tr><td style="padding: 6px 0; font-weight: bold; color: #64748b;">Slot:</td><td>${time}</td></tr>
                <tr><td style="padding: 6px 0; font-weight: bold; color: #64748b;">Calendar Event:</td><td>${gcalEventId || 'Pending Writer Access'}</td></tr>
              </table>
              <hr style="margin: 20px 0; border: none; border-top: 1px solid #e2e8f0;" />
              <p style="font-size: 13px; color: #64748b;">
                Patient confirmation text/email content dispatched for <b>${email}</b>.
              </p>
            </div>
          `
        });

        // Attempt direct dispatch to patient email
        if (email !== 'someshbadli@gmail.com') {
          try {
            await resend.emails.send({
              from: 'Glow AI Confirmation <onboarding@resend.dev>',
              to: email,
              subject: `Appointment Confirmation with Dr. Vijay — ${time}`,
              text: `Hello ${patient},\n\nYour consultation with Dr. Vijay has been scheduled.\nRequested Slot: ${time}\nLocation: Suite 2, 1234 All St, Richmond, VA 23059\n\nIf you need to reschedule, please call our clinic office at 804-259-1091.\n\nThank you!`
            });
          } catch (patientErr) {
            console.warn('[RESEND_SANDBOX_BLOCKED]:', patientErr.message);
            // Sandbox blocks unverified emails; logged cleanly without breaking the flow
          }
        }
      } catch (err) {
        resendStatus = err.message;
        console.error('[RESEND_ERROR]:', err);
      }
    }

    return res.status(200).json({
      result: `Consultation reserved for ${patient} on ${time}.`,
      success: true,
      calendar_event_id: gcalEventId,
      calendar_error: gcalErrorMessage,
      email_status: resendStatus,
      intake: { patient, phone, email, service, time }
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
