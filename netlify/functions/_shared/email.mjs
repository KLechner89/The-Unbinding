// Sends email through Postmark's API directly.
// The Netlify Email Extension's handler does not pass a Reply-To header, and
// replies must go to SCHEDULING_REPLY_TO, so this calls Postmark with the same
// server token instead.

import { settings } from './config.mjs';
import { isValidTimeZone } from './slots.mjs';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function formatWhen(ms, timeZone) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone, weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
  }).format(new Date(ms));
}

function whenLines(b) {
  const { rules } = settings();
  const lines = [formatWhen(b.start, rules.timeZone)];
  if (isValidTimeZone(b.visitorTimeZone)) {
    const local = formatWhen(b.start, b.visitorTimeZone);
    if (local !== lines[0]) lines.push(`${local} (your time)`);
  }
  return lines;
}

const CLOSING = 'If anything changes before we meet, or there is something you would like us to be aware of, simply reply to this email and someone will be in touch with you shortly.';

function page(paragraphs) {
  const body = paragraphs.map((p) =>
    p.heading
      ? `<p style="margin:0 0 20px;font-size:22px;line-height:1.3;color:#111">${esc(p.heading)}</p>`
      : p.label
        ? `<p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#333"><span style="display:block;font-family:Menlo,Consolas,monospace;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#888;margin-bottom:4px">${esc(p.label)}</span>${p.html ?? esc(p.text).replace(/\n/g, '<br>')}</p>`
        : `<p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#333">${p.html ?? esc(p.text)}</p>`
  ).join('');
  return `<!DOCTYPE html><html><body style="margin:0;padding:32px 20px;background:#fff"><div style="max-width:560px;margin:0 auto;font-family:Georgia,'Times New Roman',serif">${body}</div></body></html>`;
}

function text(paragraphs) {
  return paragraphs.map((p) => (p.label ? `${p.label}\n${p.text}` : p.heading || p.text)).join('\n\n');
}

export function visitorMessage(b) {
  const when = whenLines(b).join('\n');
  let subject, parts;
  if (b.meetingType === 'in_person') {
    subject = 'Your meeting request has been received';
    parts = [
      { heading: 'Request received.' },
      { text: 'Your preferred meeting time has been submitted for review. You’ll receive a confirmation by email once the meeting has been approved.' },
      { label: 'Requested time', text: when },
      { label: 'Length', text: `${b.durationMinutes} minutes` },
      { label: 'Meeting', text: 'In person' },
      { text: 'Location details will be provided following confirmation.' },
      { text: 'If you have any questions, concerns, or additional information you would like us to be aware of in the meantime, simply reply to this email. Someone will be in touch with you shortly.' },
    ];
  } else {
    subject = 'Your meeting with Kyle Lechner is confirmed';
    // Video bookings are only confirmed once the Zoom meeting exists (see book-meeting.mjs).
    const how = b.meetingType === 'video'
      ? {
        label: 'Zoom',
        text: `Join: ${b.zoom.joinUrl}\nMeeting ID: ${b.zoom.meetingNumber}${b.zoom.passcode ? `\nPasscode: ${b.zoom.passcode}` : ''}`,
        html: `<a href="${esc(b.zoom.joinUrl)}" style="color:#111">Join the Zoom meeting</a><br>Meeting ID: ${esc(b.zoom.meetingNumber)}${b.zoom.passcode ? `<br>Passcode: ${esc(b.zoom.passcode)}` : ''}`,
      }
      : { label: 'Phone', text: `Kyle’s office will call you at ${b.phone}.` };
    parts = [
      { heading: 'You’re scheduled.' },
      { label: 'When', text: when },
      { label: 'Length', text: `${b.durationMinutes} minutes` },
      how,
      { text: CLOSING },
    ];
  }
  return { subject, html: page(parts), text: text(parts) };
}

export function adminMessage(b) {
  const { rules } = settings();
  const typeLabel = { video: 'Video', phone: 'Phone', in_person: 'In person' }[b.meetingType];
  const when = formatWhen(b.start, rules.timeZone);
  const pending = b.status === 'pending';
  const subject = `${pending ? 'Action needed: in-person request' : `New ${typeLabel.toLowerCase()} meeting`} — ${b.name} — ${when}`;
  const parts = [
    { heading: pending ? 'In-person meeting request (pending approval)' : `${typeLabel} meeting booked` },
    ...(pending ? [{ text: 'A tentative hold has been placed on the calendar. To approve, confirm the event and email the visitor the location details. To decline, delete the hold and let the visitor know.' }] : []),
    { label: 'When', text: when },
    { label: 'Length', text: `${b.durationMinutes} minutes` },
    { label: 'Name', text: b.name },
    { label: 'Email', text: b.email },
    ...(b.phone ? [{ label: 'Phone', text: b.phone }] : []),
    ...(b.zoom ? [{ label: 'Zoom', text: `${b.zoom.joinUrl}\nMeeting ID: ${b.zoom.meetingNumber}` }] : []),
    { label: 'Anything we should know?', text: b.notes || '(nothing added)' },
    ...(b.eventLink ? [{ label: 'Calendar event', text: b.eventLink, html: `<a href="${esc(b.eventLink)}" style="color:#111">Open in Google Calendar</a>` }] : []),
    ...(b.visitorEmailSent === false ? [{ text: 'Note: the confirmation email to the visitor failed to send. Please follow up with them directly.' }] : []),
  ];
  return { subject, html: page(parts), text: text(parts) };
}

export async function sendEmail({ to, replyTo, subject, html, text: textBody }) {
  const { email } = settings();
  const res = await fetch('https://api.postmarkapp.com/email', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'X-Postmark-Server-Token': email.token,
    },
    body: JSON.stringify({
      From: `"${email.fromName.replace(/"/g, '')}" <${email.fromEmail}>`,
      To: to,
      ReplyTo: replyTo,
      Subject: subject,
      HtmlBody: html,
      TextBody: textBody,
      MessageStream: 'outbound',
    }),
  });
  if (!res.ok) throw new Error(`Postmark send failed (${res.status}): ${await res.text()}`);
  return res.json();
}
