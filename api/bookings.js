import { Resend } from 'resend';
import { google } from 'googleapis';

const resend = new Resend(process.env.RESEND_API_KEY);

function getCalendarClient() {
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
    throw new Error("Missing Google Service Account credentials");
  }
  
  const privateKey = process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n');
  
  const auth = new google.auth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: privateKey,
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
    const args = rawBody.message?.toolCalls?.[0]?.function?.arguments 
      ? (typeof rawBody.message.toolCalls[0].function.arguments === 'string' 
          ? JSON.parse(rawBody.message.toolCalls[0].function.arguments) 
          : rawBody.message.toolCalls[0].function.arguments)
      : rawBody;

    const patient = args.patient_name || 'Valued Patient';
    const phone = args.patient_phone || 'Unlisted';
    const rawEmail = args.patient_email || 'someshbadli@gmail.com';
    const email = rawEmail.includes('@') ? rawEmail.trim() : 'someshbadli@gmail.com';
    const service = args.service_name || args.service_reason || 'Doctor Consultation';
    const time = args.start_time || args.slot_time || 'Tomorrow at 2:00 PM';

    console.log('[BOOKING REQUEST INTAKE]:', { patient, phone, email, service, time });

    // 1. Google Calendar Event Creation
    let gcalEventId = null;
    let gcalError = null;
    
    try {
      const calendar = getCalendarClient();
      const calendarId = process.env.GOOGLE_CALENDAR_ID || 'someshbadli@gmail.com';

      // Fixed concrete time slot for testing: October 31, 2026 at 2:00 PM EDT (UTC-4)
      const startIso = "2026-10-31T14:00:00-04:00";
      const endIso = "2026-10-31T14:30:00-04:00";

      const gcalRes = await calendar.events.insert({
        calendarId: calendarId,
        requestBody: {
          summary: `Consultation: ${patient} (${service})`,
          description: `Patient: ${patient}\nPhone: ${phone}\nEmail: ${email}\nReason: ${service}\n\nBooked autonomously via Glow AI Receptionist (+1 804-259-1091).`,
          start: { dateTime: startIso, timeZone: 'America/New_York' },
          end: { dateTime: endIso, timeZone: 'America/New_York' },
          attendees: [{ email: email }]
        }
      });
      gcalEventId = gcalRes.data.id;
      console.log('[GCAL_INSERTION_SUCCESS]:', gcalEventId);
    } catch (err) {
      gcalError = err?.response?.data || err.message;
      console.error('[GCAL_INSERTION_FAILED]:', gcalError);
    }

    // 2. Resend Email Dispatch
    if (process.env.RESEND_API_KEY) {
      await resend.emails.send({
        from: 'Glow AI Alerts <onboarding@resend.dev>',
        to: 'someshbadli@gmail.com',
        subject: `[New Intake] ${patient} — ${service}`,
        html: `<p>New patient booked: <b>${patient}</b> for <b>${service}</b> at <b>${time}</b>. Calendar Status: ${gcalEventId || 'Failed'}</p>`
      }).catch(mErr => console.error('[RESEND_ALERT_ERR]:', mErr));
    }

    return res.status(200).json({
      result: `Consultation reserved for ${patient} on ${time}.`,
      success: true,
      calendar_event_id: gcalEventId,
      calendar_error: gcalError,
      intake: { patient, phone, email, service, time }
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
