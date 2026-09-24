// Optional Cloudflare Turnstile check for /api/book.
// Turned on only when BOTH TURNSTILE_SITE_KEY and TURNSTILE_SECRET_KEY are set.
// Once on, a booking without a valid token is refused (fails closed).

const env = (name) => (process.env[name] || '').trim();

export const turnstileSiteKey = () => (turnstileEnabled() ? env('TURNSTILE_SITE_KEY') : '');
export const turnstileEnabled = () => Boolean(env('TURNSTILE_SITE_KEY') && env('TURNSTILE_SECRET_KEY'));

export async function verifyTurnstile(token, ip) {
  if (typeof token !== 'string' || !token || token.length > 2048) return false;
  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ secret: env('TURNSTILE_SECRET_KEY'), response: token, ...(ip ? { remoteip: ip } : {}) }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    return data.success === true;
  } catch (err) {
    console.error('Turnstile verification failed:', err.message);
    return false;
  }
}
