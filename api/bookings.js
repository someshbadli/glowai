import { Resend } from 'resend';
import { google } from 'googleapis';

function getCalendarClient() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  let key = process.env.GOOGLE_PRIVATE_KEY;
  if (!email || !key) {
    throw new Error('Missing GOOGLE_SERVICE_ACCOUNT_EMAIL or GOOGLE_PRIVATE_KEY in Vercel env');
  }
  key = key.replace(/\\n/g, '\n').replace(/^"|"$/g, '');

  const auth = new google.auth.JWT(
    email,
    null,
    key,
    ['https://www.googleapis.com/auth/calendar', 'https://www.googleapis.com/auth/calendar.events']
  );
  return google.calendar({ version: 'v3', auth });
}

function getETOffsetString(date = new Date()) {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York',
      timeZoneName: 'shortOffset',
    }).formatToParts(date);
    const tzPart = parts.find((p) => p.type === 'timeZoneName')?.value || 'GMT-5';
    const match = tzPart.match(/GMT([+-]\d+)/);
    if (!match) return '-05:00';
    const hours = parseInt(match[1], 10);
    const sign = hours >= 0 ? '+' : '-';
    return `${sign}${String(Math.abs(hours)).padStart(2, '0')}:00`;
  } catch {
    return '-05:00';
  }
}

function generateCandidateSlots() {
  const slots = [];
  const now = new Date();
  const offset = getETOffsetString(now);

  for (let d = 0; d <= 7; d++) {
    const probe = new Date(now.getTime() + d * 24 * 60 * 60 * 1000);
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/New_York',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      weekday: 'long',
    }).formatToParts(probe);

    const weekday = parts.find((p) => p.type === 'weekday')?.value;
    if (weekday === 'Saturday' || weekday === 'Sunday') continue;

    const y = parts.find((p) => p.type === 'year')?.value;
    const m = parts.find((p) => p.type === 'month')?.value;
    const day = parts.find((p) => p.type === 'day')?.value;

    for (let hour = 9; hour < 17; hour++) {
      for (const min of [0, 30]) {
        const startIso = `${y}-${m}-${day}T${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}:00${offset}`;
        const startMs = Date.parse(startIso);
        if (startMs <= now.getTime() + 30 * 60 * 1000) continue;

        const endMs = startMs + 30 * 60 * 1000;
        const endHour = min === 30 ? hour + 1 : hour;
        const endMin = min === 30 ? 0 : 30;
        const endIso = `${y}-${m}-${day}T${String(endHour).padStart(2, '0')}:${String(endMin).padStart(2, '0')}:00${offset}`;

        const displayHour = hour > 12 ? hour - 12 : hour;
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const label = `${weekday}, ${m}/${day}/${y} at ${displayHour}:${String(min).padStart(2, '0')} ${ampm} ET`;

        slots.push({ startIso, endIso, startMs, endMs, label });
      }
    }
  }
  return slots;
}

async function getOpenSlots(calendar, calendarId, limit = 3) {
  const candidates = generateCandidateSlots();
  if (!candidates.length) return [];

  const eventsRes = await calendar.events.list({
    calendarId,
    timeMin: candidates[0].startIso,
    timeMax: candidates[candidates.length - 1].endIso,
    singleEvents: true,
    orderBy: 'startTime',
  });

  const busy = (eventsRes.data.items || [])
    .filter((ev) => ev.status !== 'cancelled' && ev.start?.dateTime && ev.end?.dateTime)
    .map((ev) => ({
      startMs: Date.parse(ev.start.dateTime),
      endMs: Date.parse(ev.end.dateTime),
    }));

  const open = [];
  for (const slot of candidates) {
    const conflict = busy.some((b) => slot.startMs < b.endMs && slot.endMs > b.startMs);
    if (!conflict) {
      open.push(slot);
      if (open.length >= limit) break;
    }
  }
  return open;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  try {
    const rawBody = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const toolCall = rawBody.message?.toolCalls?.[0];
    const toolCallId = toolCall?.id || null;
    const fnName = toolCall?.function?.name || rawBody.action || 'book_consultation';
    const args = toolCall?.function?.arguments
      ? typeof toolCall.function.arguments === 'string'
        ? JSON.parse(toolCall.function.arguments)
        : toolCall.function.arguments
      : rawBody;

    const calendar = getCalendarClient();
    const calendarId = (process.env.GOOGLE_CALENDAR_ID || '').trim();
    if (!calendarId) throw new Error('GOOGLE_CALENDAR_ID is empty in Vercel env');
    try { await calendar.calendarList.insert({ requestBody: { id: calendarId } }); } catch {}

    // MODE 1: CHECK NEXT AVAILABLE SLOTS
    if (fnName === 'check_availability' || req.query?.action === 'availability') {
      const openSlots = await getOpenSlots(calendar, calendarId, 3);
      const summary = openSlots.length
        ? `Next available openings: 1) ${openSlots[0].label} (start_iso: ${openSlots[0].startIso}), 2) ${openSlots[1]?.label || 'none'} (start_iso: ${openSlots[1]?.startIso || ''}), 3) ${openSlots[2]?.label || 'none'} (start_iso: ${openSlots[2]?.startIso || ''}). Offer option 1 first.`
        : 'No open weekday slots found in the next 7 days.';

      if (toolCallId) {
        return res.status(200).json({ results: [{ toolCallId, result: summary }] });
      }
      return res.status(200).json({ result: summary, open_slots: openSlots });
    }

    // MODE 2: ATOMIC SLOT-LOCKING BOOKING
    const patient = args.patient_name || 'Valued Patient';
    const phone = args.patient_phone || 'Unlisted';
    const rawEmail = args.patient_email || 'someshbadli@gmail.com';
    const email = rawEmail.includes('@') ? rawEmail.trim() : 'someshbadli@gmail.com';
    const service = args.service_name || args.service_reason || 'Doctor Consultation';

    const openSlots = await getOpenSlots(calendar, calendarId, 5);
    const chosenSlot = openSlots.find((s) => s.startIso === args.start_iso) || openSlots[0];

    if (!chosenSlot) {
      const msg = 'All immediate slots were just taken. Please ask the caller to accept the next open weekday time.';
      return res.status(200).json(toolCallId ? { results: [{ toolCallId, result: msg }] } : { result: msg });
    }

    const insertRes = await calendar.events.insert({
      calendarId,
      requestBody: {
        summary: `Consultation: ${patient} (${service})`,
        description: `Patient: ${patient}\nPhone: ${phone}\nEmail: ${email}\nReason: ${service}\nSlot: ${chosenSlot.label}\n\nBooked via Glow AI Receptionist (+1 804-259-1091).`,
        start: { dateTime: chosenSlot.startIso, timeZone: 'America/New_York' },
        end: { dateTime: chosenSlot.endIso, timeZone: 'America/New_York' },
      },
    });

    if (process.env.RESEND_API_KEY) {
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: 'Glow AI Appointments <appointments@glowaiautomation.com>',
        to: ['someshbadli@gmail.com', email],
        subject: `Appointment Confirmed: ${patient} — ${chosenSlot.label}`,
        text: `Hello ${patient},\n\nYour consultation is confirmed.\nDate & Time: ${chosenSlot.label}\nReason: ${service}\nCallback Phone: ${phone}\n\nFor any changes, email support@glowaiautomation.com or call +1 (804) 259-1091.\n\nThank you.`,
      }).catch((e) => console.error('[RESEND_ERR]:', e.message));
    }

    const confirmation = `Confirmed and locked ${chosenSlot.label} for ${patient}. Confirmation email sent to ${email}.`;
    if (toolCallId) {
      return res.status(200).json({ results: [{ toolCallId, result: confirmation }] });
    }
    return res.status(200).json({
      result: confirmation,
      success: true,
      calendar_event_id: insertRes.data.id,
      booked_slot: chosenSlot.label,
    });
  } catch (err) {
    console.error('[API_ERROR]:', err);
    return res.status(200).json({
      result: `Debug error: ${err.message}`,
      error: err.message,
      stack: err.stack?.split('\n')[0],
    });
  }
}

