// POST /api/book — books a meeting.
// Video and Phone: rechecks the slot, creates a confirmed Google Calendar event
// (Video also gets its own Zoom meeting), emails the visitor and the office.
// In Person: rechecks the slot, places a tentative hold marked pending approval,
// emails the visitor that the request was received and notifies the office.

import { randomUUID } from 'node:crypto';
import { readiness, settings, json, BOOKING_SOURCE } from './_shared/config.mjs';
import { recheckSlot, schedulerEvents, eventMinutes } from './_shared/availability.mjs';
import { insertEvent, deleteEvent, listEvents } from './_shared/google.mjs';
import { visitorMessage, adminMessage, sendEmail } from './_shared/email.mjs';
import { recordSubmission } from './_shared/record.mjs';
import { isValidTimeZone, dayBounds } from './_shared/slots.mjs';
import { RULES } from './_shared/availability-rules.mjs';
import { turnstileEnabled, verifyTurnstile } from './_shared/turnstile.mjs';
import { createZoomMeeting, deleteZoomMeeting } from './_shared/zoom.mjs';

const MINUTE = 60_000;
const TYPES = { video: 'Video', phone: 'Phone', in_person: 'In person' };
const clean = (v, max) => String(v ?? '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim().slice(0, max);

function validate(body) {
  const errors = {};
  const b = {
    meetingType: clean(body.meetingType, 20),
    name: clean(body.name, 120),
    email: clean(body.email, 254),
    phone: clean(body.phone, 30),
    notes: clean(body.notes, 5000),
    start: Date.parse(body.start),
    // Accept only the exact allowed values; anything else is rejected, never adjusted.
    durationMinutes: (Array.isArray(RULES.allowedDurations) ? RULES.allowedDurations : []).find((d) => d === body.durationMinutes || String(d) === body.durationMinutes) ?? null,
    visitorTimeZone: isValidTimeZone(body.visitorTimeZone) ? body.visitorTimeZone : '',
  };
  if (!TYPES[b.meetingType]) errors.meetingType = 'Please choose how you would prefer to meet.';
  if (!b.name) errors.name = 'Please enter your name.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(b.email)) errors.email = 'Please enter a valid email address.';
  if (b.meetingType === 'phone') {
    const digits = b.phone.replace(/\D/g, '');
    if (!/^[+()\-.\s\d]+$/.test(b.phone) || digits.length < 7 || digits.length > 15) errors.phone = 'Please enter a valid phone number.';
  } else {
    b.phone = '';
  }
  if (!Number.isFinite(b.start)) errors.start = 'Please choose a time.';
  if (b.durationMinutes === null) errors.durationMinutes = 'Please choose a meeting length.';
  return { b, errors };
}

function buildEvent(b, slot, status, zoom) {
  const { rules } = settings();
  const summary = {
    video: `Video meeting (${b.durationMinutes} min) — ${b.name}`,
    phone: `Phone call (${b.durationMinutes} min) — ${b.name}`,
    in_person: `[Pending approval] In person (${b.durationMinutes} min) — ${b.name}`,
  }[b.meetingType];
  const description = [
    `Booked via ${BOOKING_SOURCE}`,
    status === 'pending' ? 'STATUS: PENDING APPROVAL. Confirm and send location details, or delete this hold to decline.' : null,
    '',
    `Meeting type: ${TYPES[b.meetingType]}`,
    `Length: ${b.durationMinutes} minutes`,
    `Name: ${b.name}`,
    `Email: ${b.email}`,
    b.phone ? `Phone: ${b.phone} (Kyle’s office to call)` : null,
    b.visitorTimeZone ? `Visitor time zone: ${b.visitorTimeZone}` : null,
    zoom ? `Zoom: ${zoom.joinUrl}` : null,
    zoom ? `Zoom meeting ID: ${zoom.meetingNumber}${zoom.passcode ? ` · Passcode: ${zoom.passcode}` : ''}` : null,
    '',
    'Anything we should know?',
    b.notes || '(nothing added)',
  ].filter((l) => l !== null).join('\n');
  return {
    summary,
    description,
    start: { dateTime: new Date(slot.start).toISOString(), timeZone: rules.timeZone },
    end: { dateTime: new Date(slot.end).toISOString(), timeZone: rules.timeZone },
    status: status === 'pending' ? 'tentative' : 'confirmed',
    transparency: 'opaque',
    visibility: 'private',
    ...(b.phone ? { location: `Phone: ${b.phone}` } : {}),
    ...(zoom ? { location: zoom.joinUrl } : {}),
    extendedProperties: { private: { source: BOOKING_SOURCE, meetingType: b.meetingType, bookingStatus: status, durationMinutes: String(b.durationMinutes), ...(zoom ? { zoomMeetingId: zoom.id } : {}) } },
  };
}

// Two bookings made at nearly the same moment can both pass the recheck. After
// creating the event, look again: bookings created earlier win. This booking is
// withdrawn if an earlier-created event overlaps it, or if the earlier-created
// bookings for the day plus this one exceed either daily limit.
const precedes = (e, mine) => {
  const a = Date.parse(e.created), b = Date.parse(mine.created);
  return a < b || (a === b && e.id < mine.id);
};

async function lostRace(calendarId, mine, slot) {
  const { rules } = settings();
  const pad = rules.bufferMinutes * MINUTE;

  const nearby = await listEvents(calendarId, slot.start - pad, slot.end + pad);
  const overlapped = nearby.some((e) => {
    if (e.id === mine.id || e.status === 'cancelled' || e.transparency === 'transparent') return false;
    if (e.attendees?.some((a) => a.self && a.responseStatus === 'declined')) return false;
    return precedes(e, mine);
  });
  if (overlapped) return true;

  const [dayStart, dayEnd] = dayBounds(slot.day, rules.timeZone);
  const earlier = (await schedulerEvents(calendarId, dayStart, dayEnd))
    .filter((e) => e.id !== mine.id && Date.parse(e.start.dateTime) >= dayStart && precedes(e, mine));
  const minutes = earlier.reduce((sum, e) => sum + eventMinutes(e), 0) + slot.durationMinutes;
  return minutes > rules.maxMeetingMinutesPerDay || earlier.length + 1 > rules.maxMeetingsPerDay;
}

export default async (req) => {
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  let body;
  try {
    const raw = await req.text();
    if (raw.length > 20_000) return json({ error: 'invalid' }, 413);
    body = JSON.parse(raw);
  } catch {
    return json({ error: 'invalid' }, 400);
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return json({ error: 'invalid' }, 400);

  // Honeypot: a hidden field real visitors never fill in.
  if (body.website) return json({ ok: true, status: 'confirmed', emailSent: true });

  const { b, errors } = validate(body);
  if (Object.keys(errors).length) return json({ error: 'invalid', fields: errors }, 400);

  const ready = readiness();
  if (!ready.ok) {
    console.warn('Scheduling offline:', ready.missing.join(' | '));
    return json({ error: 'unavailable' }, 503);
  }

  if (turnstileEnabled() && !(await verifyTurnstile(body.turnstileToken, req.headers.get('x-nf-client-connection-ip')))) {
    return json({ error: 'verification_failed' }, 403);
  }

  const { calendarId, email } = settings();
  const status = b.meetingType === 'in_person' ? 'pending' : 'confirmed';
  let event;
  let zoom;

  // 1. Recheck availability immediately before booking, then create the Zoom meeting
  //    (Video only) and the calendar event. If anything fails, undo what was created.
  const undo = async () => {
    if (event?.id) await deleteEvent(calendarId, event.id).catch((e) => console.error('Cleanup (event) failed:', e.message));
    if (zoom?.id) await deleteZoomMeeting(zoom.id).catch((e) => console.error('Cleanup (Zoom) failed:', e.message));
  };
  try {
    const slot = await recheckSlot(b.start, b.durationMinutes);
    if (!slot) return json({ error: 'slot_unavailable' }, 409);

    if (b.meetingType === 'video') {
      zoom = await createZoomMeeting({
        topic: `Kyle Lechner / ${b.name}`,
        startMs: slot.start,
        durationMinutes: slot.durationMinutes,
        timeZone: settings().rules.timeZone,
      });
    }

    event = await insertEvent(calendarId, buildEvent(b, slot, status, zoom));

    if (await lostRace(calendarId, event, slot)) {
      await undo();
      return json({ error: 'slot_unavailable' }, 409);
    }
  } catch (err) {
    console.error('Booking failed:', err.message, err.detail || '');
    await undo();
    return json({ error: 'failed' }, 502);
  }

  const booking = {
    ...b,
    status,
    eventId: event.id,
    eventLink: event.htmlLink || '',
    zoom: zoom || null,
  };

  // 2. Emails. The booking stands even if email fails; the office is told either way.
  booking.visitorEmailSent = false;
  try {
    await sendEmail({ to: booking.email, replyTo: email.replyTo, ...visitorMessage(booking) });
    booking.visitorEmailSent = true;
  } catch (err) {
    console.error('Visitor email failed:', err.message);
  }
  booking.adminEmailSent = false;
  try {
    await sendEmail({ to: email.adminEmail, replyTo: booking.email, ...adminMessage(booking) });
    booking.adminEmailSent = true;
  } catch (err) {
    console.error('Office notification failed:', err.message);
  }

  // 3. Administrative record in Netlify Forms.
  await recordSubmission(booking);

  return json({ ok: true, status, emailSent: booking.visitorEmailSent });
};

// Platform rate limit per visitor IP: at most 5 booking attempts per minute.
export const config = {
  path: '/api/book',
  rateLimit: { windowLimit: 5, windowSize: 60, aggregateBy: ['ip', 'domain'] },
};
