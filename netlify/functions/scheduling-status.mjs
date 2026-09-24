// GET /api/scheduling-status — returns only { ready: true | false }.
// The names of any missing settings are written to the function log
// (Netlify > Logs > Functions > scheduling-status), never to the public response.
import { readiness, json } from './_shared/config.mjs';

export default async () => {
  const { ok, missing } = readiness();
  if (!ok) console.warn('Scheduling not ready:', missing.join(' | '));
  return json({ ready: ok });
};

export const config = {
  path: '/api/scheduling-status',
  rateLimit: { windowLimit: 10, windowSize: 60, aggregateBy: ['ip', 'domain'] },
};
