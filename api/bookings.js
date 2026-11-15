import { Resend } from 'resend';
import { google } from 'googleapis';

function getCalendarClient() {
  const clientId = (process.env.GOOGLE_CLIENT_ID || '').trim();
  const clientSecret = (process.env.GOOGLE_CLIENT_SECRET || '').trim();
  const refreshToken = (process.env.GOOGLE_REFRESH_TOKEN || '').trim();

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error('Missing GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, or GOOGLE_REFRESH_TOKEN in Vercel env');
  }

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
  oauth2Client.setCredentials({ refresh_token: refreshToken });
  return google.calendar({ version: 'v3', auth: oauth2Client });
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

  for (let d = 0; d <= 10; d++) {
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

    // Strictly 9:00 AM to 4:30 PM ET start times (last 30-min block ends at 5:00 PM ET)
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
        const endDisplayHour = endHour > 12 ? endHour - 12 : endHour;
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const endAmpm = endHour >= 12 ? 'PM' : 'AM';
        const label = `${weekday}, ${m}/${day}/${y} from ${displayHour}:${String(min).padStart(2, '0')} ${ampm} to ${endDisplayHour}:${String(endMin).padStart(2, '0')} ${endAmpm} ET`;

        slots.push({
          dateKey: `${y}-${m}-${day}`,
          weekday,
          startIso,
          endIso,
          startMs,
          endMs,
          label,
        });
      }
    }
  }
  return slots;
}

async function getOpenSlots(calendar, calendarId, limit = 12) {
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

function isExactThirtyMinGrid(isoString) {
  if (!isoString || typeof isoString !== 'string') return false;
  const ms = Date.parse(isoString);
  if (Number.isNaN(ms)) return false;
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    hour12: false,
    weekday: 'long',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(new Date(ms));
  const weekday = parts.find((p) => p.type === 'weekday')?.value;
  if (weekday === 'Saturday' || weekday === 'Sunday') return false;
  const hour = parseInt(parts.find((p) => p.type === 'hour')?.value || '-1', 10);
  const min = parseInt(parts.find((p) => p.type === 'minute')?.value || '-1', 10);
  const sec = parseInt(parts.find((p) => p.type === 'second')?.value || '-1', 10);
  return hour >= 9 && hour < 17 && (min === 0 || min === 30) && sec === 0;
}

async function bookSlotSafely(calendar, calendarId, patient, phone, email, service, preferredStartIso) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const openSlots = await getOpenSlots(calendar, calendarId, 20);
    if (!openSlots.length) return { error: 'NO_SLOTS' };

    let chosenSlot = null;
    if (preferredStartIso) {
      if (!isExactThirtyMinGrid(preferredStartIso)) {
        return {
          error: 'INVALID_GRID',
          nextOptions: openSlots.slice(0, 3),
        };
      }
      const prefMs = Date.parse(preferredStartIso); const exactMatch = openSlots.find((s) => s.startMs === prefMs);
      if (!exactMatch) {
        return {
          error: 'SLOT_UNAVAILABLE',
          nextOptions: openSlots.slice(0, 3),
        };
      }
      chosenSlot = exactMatch;
    } else {
      chosenSlot = openSlots[0];
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

    const createdEvent = insertRes.data;

    const verifyRes = await calendar.events.list({
      calendarId,
      timeMin: chosenSlot.startIso,
      timeMax: chosenSlot.endIso,
      singleEvents: true,
    });

    const overlapping = (verifyRes.data.items || [])
      .filter((ev) => ev.status !== 'cancelled' && ev.start?.dateTime && ev.end?.dateTime)
      .sort((a, b) => Date.parse(a.created || 0) - Date.parse(b.created || 0) || a.id.localeCompare(b.id));

    if (overlapping.length <= 1 || overlapping[0].id === createdEvent.id) {
      return { event: createdEvent, slot: chosenSlot };
    }

    await calendar.events.delete({ calendarId, eventId: createdEvent.id }).catch(() => {});
  }
  return { error: 'RACE_CONFLICT' };
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
    const calendarId = (process.env.GOOGLE_CALENDAR_ID || 'primary').trim();

    if (fnName === 'check_availability' || req.query?.action === 'availability') {
      const openSlots = await getOpenSlots(calendar, calendarId, 12);
      if (!openSlots.length) {
        const msg = 'No open weekday slots found in the next 10 days.';
        return res.status(200).json(toolCallId ? { results: [{ toolCallId, result: msg }] } : { result: msg });
      }

      const firstDayKey = openSlots[0].dateKey;
      const nextDaySlot = openSlots.find((s) => s.dateKey !== firstDayKey);

      const summary = [
        `STRICT 30-MINUTE SLOTS (:00 and :30 only):`,
        `Option 1 (Earliest): ${openSlots[0].label} | start_iso: ${openSlots[0].startIso}`,
        openSlots[1] ? `Option 2: ${openSlots[1].label} | start_iso: ${openSlots[1].startIso}` : '',
        openSlots[2] ? `Option 3: ${openSlots[2].label} | start_iso: ${openSlots[2].startIso}` : '',
        nextDaySlot ? `Next-Day Option: ${nextDaySlot.label} | start_iso: ${nextDaySlot.startIso}` : '',
        `All open slots: ${openSlots.map((s) => `${s.label} (${s.startIso})`).join('; ')}`,
      ]
        .filter(Boolean)
        .join('\n');

      if (toolCallId) {
        return res.status(200).json({ results: [{ toolCallId, result: summary }] });
      }
      return res.status(200).json({ result: summary, open_slots: openSlots });
    }

    const patient = args.patient_name || 'Valued Patient';
    const phone = args.patient_phone || 'Unlisted';
    const rawEmail = args.patient_email || 'no-email@clinic-intake.local';
    const email = rawEmail.includes('@') ? rawEmail.trim() : 'no-email@clinic-intake.local';
    const service = args.service_name || args.service_reason || 'Doctor Consultation';

    const booked = await bookSlotSafely(calendar, calendarId, patient, phone, email, service, args.start_iso);

    if (booked?.error) {
      const nextOpts = booked.nextOptions || [];
      const optText = nextOpts.length
        ? `Offer these exact 30-minute slots instead: 1) ${nextOpts[0].label} (start_iso: ${nextOpts[0].startIso})${nextOpts[1] ? `, 2) ${nextOpts[1].label} (start_iso: ${nextOpts[1].startIso})` : ''}.`
        : 'Please ask the caller to pick another open weekday 30-minute slot.';
      const msg =
        booked.error === 'INVALID_GRID'
          ? `Rejected: Appointments can ONLY be booked on exact 30-minute blocks (:00 or :30, such as 9:00-9:30 or 9:30-10:00 ET). Never book off-grid times like 9:01 or 9:15. ${optText}`
          : `That slot is no longer available. ${optText}`;
      return res.status(200).json(toolCallId ? { results: [{ toolCallId, result: msg }] } : { result: msg });
    }

    if (process.env.RESEND_API_KEY && email !== 'no-email@clinic-intake.local') {
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: 'Glow AI Appointments <appointments@glowaiautomation.com>',
        to: ['someshbadli@gmail.com', email],
        subject: `Appointment Confirmed: ${patient} — ${booked.slot.label}`,
        text: `Hello ${patient},\n\nYour consultation is confirmed.\nDate & Time: ${booked.slot.label}\nReason: ${service}\nCallback Phone: ${phone}\n\nFor any changes, email support@glowaiautomation.com or call +1 (804) 259-1091.\n\nThank you.`,
      }).catch((e) => console.error('[RESEND_ERR]:', e.message));
    }

    const confirmation = `Confirmed and locked ${booked.slot.label} for ${patient}.`;
    if (toolCallId) {
      return res.status(200).json({ results: [{ toolCallId, result: confirmation }] });
    }
    return res.status(200).json({
      result: confirmation,
      success: true,
      calendar_event_id: booked.event.id,
      booked_slot: booked.slot.label,
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
