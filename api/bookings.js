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
    scopes: ['https://www.googleapis.com/auth/calendar'],
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

    let gcalEventId = null;
    let gcalErrorMessage = null;

    try {
      const calendar = getCalendarClient();
      const targetCalId = process.env.GOOGLE_CALENDAR_ID || 'someshbadli@gmail.com';

      // 1. Explicitly register calendar into Service Account's authorized list
      try {
        await calendar.calendarList.insert({
          requestBody: { id: targetCalId }
        });
      } catch (subErr) {
        // Ignored if already subscribed
      }

      // 2:00 PM EDT (UTC-4) -> 11:30 PM IST
      const startIso = "2026-10-31T14:00:00-04:00";
      const endIso = "2026-10-31T14:30:00-04:00";

      const insertRes = await calendar.events.insert({
        calendarId: targetCalId,
        requestBody: {
          summary: `Consultation: ${patient} (${service})`,
          description: `Patient: ${patient}\nPhone: ${phone}\nEmail: ${email}\nReason: ${service}\nBooked via Glow AI Voice (+1 804-259-1091).`,
          start: { dateTime: startIso, timeZone: 'America/New_York' },
          end: { dateTime: endIso, timeZone: 'America/New_York' }
        }
      });

      gcalEventId = insertRes.data.id;
    } catch (insertErr) {
      gcalErrorMessage = insertErr.response?.data?.error?.message || insertErr.message;
      console.error('[GCAL_WRITE_ERROR]:', gcalErrorMessage);
    }

    if (process.env.RESEND_API_KEY) {
      await resend.emails.send({
        from: 'Glow AI Alerts <onboarding@resend.dev>',
        to: 'someshbadli@gmail.com',
        subject: `[New Intake] ${patient} — ${service}`,
        html: `<p>Booking logged for <b>${patient}</b> (${phone}) - <b>${service}</b>. Calendar Status: ${gcalEventId || 'Error: ' + gcalErrorMessage}</p>`
      }).catch(() => {});
    }

    return res.status(200).json({
      result: `Consultation reserved for ${patient} on ${time}.`,
      success: true,
      calendar_event_id: gcalEventId,
      calendar_error: gcalErrorMessage,
      intake: { patient, phone, email, service, time }
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
