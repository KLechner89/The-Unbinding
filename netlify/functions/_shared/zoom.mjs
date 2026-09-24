// Zoom meetings for Video bookings, via a Zoom Server-to-Server OAuth app.
// Reads ZOOM_ACCOUNT_ID, ZOOM_CLIENT_ID, ZOOM_CLIENT_SECRET, and ZOOM_HOST_USER
// (the email or user ID of the Zoom user who hosts the meetings).
// Required app scopes: meeting:write:meeting:admin, meeting:delete:meeting:admin.

const env = (name) => (process.env[name] || '').trim();

export class ZoomError extends Error {
  constructor(step, status, detail) {
    super(`Zoom ${step} failed (${status})`);
    this.step = step;
    this.status = status;
    this.detail = detail;
  }
}

let cachedToken = null;

async function accessToken() {
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60_000) return cachedToken.value;
  const url = new URL('https://zoom.us/oauth/token');
  url.searchParams.set('grant_type', 'account_credentials');
  url.searchParams.set('account_id', env('ZOOM_ACCOUNT_ID'));
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Basic ${Buffer.from(`${env('ZOOM_CLIENT_ID')}:${env('ZOOM_CLIENT_SECRET')}`).toString('base64')}` },
  });
  if (!res.ok) throw new ZoomError('token', res.status, await res.text());
  const data = await res.json();
  cachedToken = { value: data.access_token, expiresAt: Date.now() + (data.expires_in || 3600) * 1000 };
  return cachedToken.value;
}

// Creates a scheduled meeting. Returns { id, joinUrl, meetingNumber, passcode }.
// The host start link is deliberately not returned, so it can never reach an email.
export async function createZoomMeeting({ topic, startMs, durationMinutes, timeZone }) {
  const res = await fetch(`https://api.zoom.us/v2/users/${encodeURIComponent(env('ZOOM_HOST_USER'))}/meetings`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${await accessToken()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      topic: topic.slice(0, 200),
      type: 2, // scheduled meeting
      start_time: new Date(startMs).toISOString().replace(/\.\d{3}Z$/, 'Z'),
      duration: durationMinutes,
      timezone: timeZone,
      settings: { waiting_room: true, join_before_host: false },
    }),
  });
  if (!res.ok) throw new ZoomError('create meeting', res.status, await res.text());
  const m = await res.json();
  if (!m.id || !m.join_url) throw new ZoomError('create meeting', res.status, 'response missing join link');
  const digits = String(m.id);
  return {
    id: digits,
    joinUrl: m.join_url,
    meetingNumber: digits.length === 11 ? `${digits.slice(0, 3)} ${digits.slice(3, 7)} ${digits.slice(7)}` : digits,
    passcode: m.password || '',
  };
}

export async function deleteZoomMeeting(id) {
  const res = await fetch(`https://api.zoom.us/v2/meetings/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${await accessToken()}` },
  });
  if (!res.ok && res.status !== 404) throw new ZoomError('delete meeting', res.status, await res.text());
}
