// Reads configuration from Netlify environment variables and decides whether
// online scheduling may run. Nothing here has a default value: if something is
// missing, scheduling stays offline rather than guessing.

import { RULES } from './availability-rules.mjs';
import { validateRules } from './slots.mjs';

const env = (name) => (process.env[name] || '').trim();

export const BOOKING_SOURCE = 'kylelechner.io/book';

export function settings() {
  const calendarId = env('GOOGLE_CALENDAR_ID');
  return {
    rules: RULES,
    calendarId,
    // Other calendars to check for conflicts: from the private Netlify variable
    // GOOGLE_CONFLICT_CALENDAR_IDS (comma-separated), so no calendar addresses live in the public code.
    conflictCalendarIds: [...new Set([
      calendarId,
      ...env('GOOGLE_CONFLICT_CALENDAR_IDS').split(',').map((id) => id.trim()),
    ])].filter(Boolean),
    email: {
      token: env('POSTMARK_SERVER_TOKEN'),
      fromEmail: env('SCHEDULING_FROM_EMAIL'),
      fromName: env('SCHEDULING_FROM_NAME'),
      replyTo: env('SCHEDULING_REPLY_TO'),
      adminEmail: env('SCHEDULING_ADMIN_EMAIL'),
    },
    siteUrl: env('URL'),
  };
}

// Returns { ok, missing[] }. `missing` names settings only, never their values.
export function readiness() {
  const missing = [];
  for (const name of ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_REFRESH_TOKEN', 'GOOGLE_CALENDAR_ID',
    'ZOOM_ACCOUNT_ID', 'ZOOM_CLIENT_ID', 'ZOOM_CLIENT_SECRET', 'ZOOM_HOST_USER',
    'SCHEDULING_FROM_EMAIL', 'SCHEDULING_FROM_NAME', 'SCHEDULING_REPLY_TO', 'SCHEDULING_ADMIN_EMAIL',
    'POSTMARK_SERVER_TOKEN']) {
    if (!env(name)) missing.push(name);
  }
  const ruleProblems = validateRules(RULES);
  if (ruleProblems.length) missing.push(`availability rules: ${ruleProblems.join('; ')}`);
  // Manual switch, turned on only after email sending (DKIM) and a test booking are confirmed.
  if (env('SCHEDULING_ENABLED') !== 'true') missing.push('SCHEDULING_ENABLED is not "true"');
  return { ok: missing.length === 0, missing, ruleProblems };
}

export function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}
