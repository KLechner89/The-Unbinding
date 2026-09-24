// Minimal Google Calendar API client using an OAuth refresh token.
// Reads GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN from the environment.

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const API = 'https://www.googleapis.com/calendar/v3';
const FREEBUSY_CHUNK_MS = 28 * 86_400_000;

export class GoogleError extends Error {
  constructor(step, status, detail) {
    super(`Google ${step} failed (${status})`);
    this.step = step;
    this.status = status;
    this.detail = detail;
  }
}

let cachedToken = null;

async function accessToken() {
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60_000) return cachedToken.value;
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
      grant_type: 'refresh_token',
    }),
  });
  if (!res.ok) throw new GoogleError('token refresh', res.status, await res.text());
  const data = await res.json();
  cachedToken = { value: data.access_token, expiresAt: Date.now() + (data.expires_in || 3600) * 1000 };
  return cachedToken.value;
}

async function call(step, path, { method = 'GET', query, body } = {}) {
  const url = new URL(API + path);
  for (const [k, v] of Object.entries(query || {})) if (v !== undefined) url.searchParams.set(k, String(v));
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${await accessToken()}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (method === 'DELETE' && (res.status === 204 || res.status === 410)) return null;
  if (!res.ok) throw new GoogleError(step, res.status, await res.text());
  return res.json();
}

const cal = (id) => `/calendars/${encodeURIComponent(id)}`;

// Busy intervals across calendars. Fails closed: any calendar error throws.
export async function freeBusy(calendarIds, fromMs, toMs) {
  const busy = [];
  for (let start = fromMs; start < toMs; start += FREEBUSY_CHUNK_MS) {
    const end = Math.min(toMs, start + FREEBUSY_CHUNK_MS);
    const data = await call('free/busy', '/freeBusy', {
      method: 'POST',
      body: {
        timeMin: new Date(start).toISOString(),
        timeMax: new Date(end).toISOString(),
        items: calendarIds.map((id) => ({ id })),
      },
    });
    for (const id of calendarIds) {
      const entry = data.calendars?.[id];
      if (!entry || entry.errors?.length) throw new GoogleError('free/busy', 200, JSON.stringify(entry?.errors || 'calendar missing'));
      for (const b of entry.busy || []) busy.push({ start: Date.parse(b.start), end: Date.parse(b.end) });
    }
  }
  return busy;
}

export async function listEvents(calendarId, fromMs, toMs, extraQuery = {}) {
  const items = [];
  let pageToken;
  do {
    const data = await call('list events', `${cal(calendarId)}/events`, {
      query: {
        timeMin: new Date(fromMs).toISOString(),
        timeMax: new Date(toMs).toISOString(),
        singleEvents: true,
        maxResults: 250,
        pageToken,
        ...extraQuery,
      },
    });
    items.push(...(data.items || []));
    pageToken = data.nextPageToken;
  } while (pageToken);
  return items;
}

export function insertEvent(calendarId, event) {
  return call('create event', `${cal(calendarId)}/events`, {
    method: 'POST',
    query: { sendUpdates: 'none' },
    body: event,
  });
}

export function deleteEvent(calendarId, eventId) {
  return call('delete event', `${cal(calendarId)}/events/${encodeURIComponent(eventId)}`, {
    method: 'DELETE',
    query: { sendUpdates: 'none' },
  });
}
