// Records each booking outcome as a submission of the Netlify form "meeting-booking".
// This is an administrative log only; Google Calendar remains the source of truth.
// The form's fields are declared in the hidden form in book.html so Netlify detects them at deploy.

import { settings } from './config.mjs';
import { formatWhen } from './email.mjs';

export async function recordSubmission(b) {
  const { siteUrl, rules } = settings();
  if (!siteUrl) return false;
  const fields = {
    'form-name': 'meeting-booking',
    status: b.status,
    meeting_type: { video: 'Video', phone: 'Phone', in_person: 'In person' }[b.meetingType],
    name: b.name,
    email: b.email,
    phone: b.phone || '',
    notes: b.notes || '',
    start_time: formatWhen(b.start, rules.timeZone),
    duration_minutes: String(b.durationMinutes),
    start_iso: new Date(b.start).toISOString(),
    visitor_time_zone: b.visitorTimeZone || '',
    calendar_event_id: b.eventId || '',
    video_link: b.zoom?.joinUrl || '',
    visitor_email_status: b.visitorEmailSent ? 'sent' : 'failed',
    admin_email_status: b.adminEmailSent ? 'sent' : 'failed',
  };
  try {
    const res = await fetch(`${siteUrl}/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(fields).toString(),
    });
    if (!res.ok) console.error(`meeting-booking record failed (${res.status})`);
    return res.ok;
  } catch (err) {
    console.error('meeting-booking record failed:', err.message);
    return false;
  }
}
