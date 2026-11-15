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

function normalizeAndValidatePhone(rawPhone) {
  if (!rawPhone || typeof rawPhone !== 'string') return { valid: false, reason: 'MISSING' };
  let digits = rawPhone.replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('1')) {
    digits = digits.slice(1);
  }
  if (digits.length !== 10) {
    return { valid: false, reason: 'LENGTH', digitsCount: digits.length };
  }
  if (/^(\d)\1{9}$/.test(digits) || digits === '1234567890' || digits === '0123456789') {
    return { valid: false, reason: 'DUMMY' };
  }
  const formatted = `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  return { valid: true, digits, formatted };
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

async function getOpenSlotsAndCheckDuplicate(calendar, calendarId, phoneCheck, emailCheck, limit = 16) {
  const candidates = generateCandidateSlots();
  if (!candidates.length) return { open: [], existingBooking: null };

  const eventsRes = await calendar.events.list({
    calendarId,
    timeMin: new Date().toISOString(),
    timeMax: candidates[candidates.length - 1].endIso,
    singleEvents: true,
    orderBy: 'startTime',
  });

  const activeEvents = (eventsRes.data.items || []).filter(
    (ev) => ev.status !== 'cancelled' && ev.start?.dateTime && ev.end?.dateTime
  );

  // Check if this exact phone or real email already has an upcoming consultation
  let existingBooking = null;
  if (phoneCheck?.valid || (emailCheck && emailCheck !== 'no-email@clinic-intake.local')) {
    for (const ev of activeEvents) {
      const desc = ev.description || '';
      const descDigits = desc.replace(/\D/g, '');
      const phoneMatch = phoneCheck?.valid && descDigits.includes(phoneCheck.digits);
      const emailMatch =
        emailCheck &&
        emailCheck !== 'no-email@clinic-intake.local' &&
        desc.toLowerCase().includes(emailCheck.toLowerCase());
      if (phoneMatch || emailMatch) {
        existingBooking = ev;
        break;
      }
    }
  }

  const busy = activeEvents.map((ev) => ({
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
  return { open, existingBooking };
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

async function bookSlotSafely(calendar, calendarId, patient, phoneCheck, email, service, preferredStartIso, allowDuplicate = false) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const { open: openSlots, existingBooking } = await getOpenSlotsAndCheckDuplicate(
      calendar,
      calendarId,
      phoneCheck,
      email,
      24
    );

    if (existingBooking && !allowDuplicate) {
      const slotLine = (existingBooking.description || '')
        .split('\n')
        .find((l) => l.includes('Confirmed Window:')) || existingBooking.summary;
      return {
        error: 'DUPLICATE_PATIENT',
        existingSummary: slotLine.replace('• Confirmed Window:', '').trim(),
      };
    }

    if (!openSlots.length) return { error: 'NO_SLOTS' };

    let chosenSlot = null;
    if (preferredStartIso) {
      if (!isExactThirtyMinGrid(preferredStartIso)) {
        return {
          error: 'INVALID_GRID',
          nextOptions: openSlots.slice(0, 3),
        };
      }
      const prefMs = Date.parse(preferredStartIso);
      const exactMatch = openSlots.find((s) => s.startMs === prefMs);
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
        summary: `Consultation: ${patient} — ${service}`,
        description: [
          `PATIENT INTAKE SUMMARY`,
          `• Patient Name: ${patient}`,
          `• Callback Phone: ${phoneCheck.formatted}`,
          `• Email: ${email}`,
          `• Visit Type / Service: ${service}`,
          `• Confirmed Window: ${chosenSlot.label}`,
          ``,
          `Booked automatically via Glow AI After-Hours Receptionist (+1 804-259-1091).`,
        ].join('\n'),
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

function buildConfirmationHtml({ patient, phone, email, service, slotLabel }) {
  return `
  <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; max-width: 560px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; color: #1e293b;">
    <div style="background: #0f172a; padding: 24px 28px; color: #ffffff;">
      <p style="margin: 0; font-size: 11px; letter-spacing: 1.5px; text-transform: uppercase; color: #2dd4bf;">Radiance Aesthetic Institute</p>
      <h2 style="margin: 6px 0 0; font-size: 20px; font-weight: 600;">Consultation Appointment Confirmed</h2>
    </div>
    <div style="padding: 24px 28px;">
      <p style="margin: 0 0 16px; font-size: 15px;">Hello <strong>${patient}</strong>,</p>
      <p style="margin: 0 0 20px; font-size: 14px; line-height: 1.6; color: #475569;">
        Thank you for calling Radiance Aesthetic Institute. Your 30-minute in-person consultation has been reserved on our clinical schedule.
      </p>
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px 20px; margin-bottom: 20px;">
        <p style="margin: 0 0 8px; font-size: 13px;"><strong>Date &amp; Time:</strong> ${slotLabel}</p>
        <p style="margin: 0 0 8px; font-size: 13px;"><strong>Visit Type:</strong> ${service}</p>
        <p style="margin: 0 0 8px; font-size: 13px;"><strong>Patient Name:</strong> ${patient}</p>
        <p style="margin: 0; font-size: 13px;"><strong>Callback Number:</strong> ${phone}</p>
      </div>
      <div style="font-size: 13px; line-height: 1.6; color: #475569; border-top: 1px solid #e2e8f0; padding-top: 16px;">
        <p style="margin: 0 0 8px;"><strong>Clinic Hours &amp; Arrival:</strong> Please arrive 10 minutes early for check-in. Standard office hours are Monday–Friday, 9:00 AM – 5:00 PM ET.</p>
        <p style="margin: 0;"><strong>Need to Reschedule?</strong> Please notify us at least 24 hours in advance by replying to this email or calling <strong>+1 (804) 259-1091</strong>.</p>
      </div>
    </div>
    <div style="background: #f1f5f9; padding: 14px 28px; font-size: 11px; color: #64748b; text-align: center;">
      Administrative Scheduling Confirmation • Glow AI Clinic Receptionist
    </div>
  </div>`;
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
      const { open: openSlots } = await getOpenSlotsAndCheckDuplicate(calendar, calendarId, null, null, 16);
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

    const patient = (args.patient_name || 'Valued Patient').trim();
    const phoneCheck = normalizeAndValidatePhone(args.patient_phone);

    if (!phoneCheck.valid) {
      const phoneErrMsg =
        phoneCheck.reason === 'DUMMY'
          ? 'Rejected: That appears to be a placeholder or repeated-digit phone number. Politely ask the caller for a valid 10-digit callback phone number with area code before booking.'
          : `Rejected: Only ${phoneCheck.digitsCount || 0} digits were provided for the phone number. Politely ask the caller for the complete 10-digit callback number including their 3-digit area code before booking.`;
      return res.status(200).json(toolCallId ? { results: [{ toolCallId, result: phoneErrMsg }] } : { result: phoneErrMsg });
    }

    const rawEmail = args.patient_email || 'no-email@clinic-intake.local';
    const cleanedEmail = rawEmail.replace(/\s+/g, '').toLowerCase();
    const email = cleanedEmail.includes('@') ? cleanedEmail : 'no-email@clinic-intake.local';
    const service = (args.service_name || args.service_reason || 'Doctor Consultation').trim();
    const allowDuplicate = Boolean(args.allow_duplicate);

    const booked = await bookSlotSafely(
      calendar,
      calendarId,
      patient,
      phoneCheck,
      email,
      service,
      args.start_iso,
      allowDuplicate
    );

    if (booked?.error) {
      if (booked.error === 'DUPLICATE_PATIENT') {
        const dupMsg = `Duplicate Notice: This caller already has an active upcoming consultation on the calendar (${booked.existingSummary}). Inform the caller politely that they already have an active appointment scheduled and ask if they want to keep it rather than booking a second slot.`;
        return res.status(200).json(toolCallId ? { results: [{ toolCallId, result: dupMsg }] } : { result: dupMsg });
      }

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

    if (process.env.RESEND_API_KEY) {
      const resend = new Resend(process.env.RESEND_API_KEY);
      const recipients = email !== 'no-email@clinic-intake.local'
        ? ['someshbadli@gmail.com', email]
        : ['someshbadli@gmail.com'];

      await resend.emails.send({
        from: 'Glow AI Appointments <appointments@glowaiautomation.com>',
        replyTo: 'somesh@glowaiautomation.com',
        to: recipients,
        subject: `Appointment Confirmed: ${patient} — ${booked.slot.label}`,
        html: buildConfirmationHtml({
          patient,
          phone: phoneCheck.formatted,
          email,
          service,
          slotLabel: booked.slot.label,
        }),
        text: `Hello ${patient},\n\nYour 30-minute consultation is confirmed.\nDate & Time: ${booked.slot.label}\nVisit Type: ${service}\nCallback Phone: ${phoneCheck.formatted}\n\nPlease arrive 10 minutes early. To reschedule, give 24 hours notice by replying to this email or calling +1 (804) 259-1091.\n\nThank you.`,
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
