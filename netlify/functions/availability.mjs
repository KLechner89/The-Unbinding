// GET /api/availability — open meeting slots, read live from Google Calendar.
import { readiness, settings, json } from './_shared/config.mjs';
import { openSlots } from './_shared/availability.mjs';
import { turnstileSiteKey } from './_shared/turnstile.mjs';

export default async (req) => {
  if (req.method !== 'GET') return json({ error: 'method_not_allowed' }, 405);
  const ready = readiness();
  if (!ready.ok) {
    console.warn('Scheduling offline:', ready.missing.join(' | '));
    return json({ available: false }, 503);
  }
  try {
    const { rules } = settings();
    const slots = await openSlots();
    return json({
      available: true,
      timeZone: rules.timeZone,
      turnstileSiteKey: turnstileSiteKey() || null,
      durations: rules.allowedDurations,
      slots: slots.map((s) => ({ start: new Date(s.start).toISOString(), durations: s.durations })),
    });
  } catch (err) {
    console.error('Availability lookup failed:', err.message, err.detail || '');
    return json({ available: false }, 503);
  }
};

export const config = {
  path: '/api/availability',
  rateLimit: { windowLimit: 30, windowSize: 60, aggregateBy: ['ip', 'domain'] },
};
