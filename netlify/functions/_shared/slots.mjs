// Time zone math and slot generation, with no external dependencies.

const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const MINUTE = 60_000;
const DAY = 86_400_000;
const formatters = new Map();

function formatter(timeZone) {
  if (!formatters.has(timeZone)) {
    formatters.set(timeZone, new Intl.DateTimeFormat('en-US', {
      timeZone, hourCycle: 'h23',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    }));
  }
  return formatters.get(timeZone);
}

export function isValidTimeZone(timeZone) {
  if (typeof timeZone !== 'string' || !timeZone) return false;
  try { new Intl.DateTimeFormat('en-US', { timeZone }); return true; } catch { return false; }
}

export function zonedParts(ms, timeZone) {
  const p = {};
  for (const { type, value } of formatter(timeZone).formatToParts(new Date(ms))) p[type] = value;
  return { year: +p.year, month: +p.month, day: +p.day, hour: +p.hour % 24, minute: +p.minute, second: +p.second };
}

function offsetMs(ms, timeZone) {
  const whole = Math.floor(ms / 1000) * 1000;
  const p = zonedParts(whole, timeZone);
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - whole;
}

// Wall-clock time in a zone -> UTC milliseconds (handles DST transitions).
export function zonedToUtc(year, month, day, hour, minute, timeZone) {
  const guess = Date.UTC(year, month - 1, day, hour, minute);
  const first = offsetMs(guess, timeZone);
  const second = offsetMs(guess - first, timeZone);
  return guess - (first === second ? first : second);
}

export function addDays(year, month, day, n) {
  const t = new Date(Date.UTC(year, month - 1, day + n));
  return [t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate()];
}

export const dateKey = (y, m, d) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
export const weekday = (y, m, d) => WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
export const dayKeyOf = (ms, timeZone) => { const p = zonedParts(ms, timeZone); return dateKey(p.year, p.month, p.day); };

function parseHM(value) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(value || '');
  if (!m) return null;
  const h = +m[1], min = +m[2];
  if (min > 59 || h > 24 || (h === 24 && min !== 0)) return null;
  return [h, min];
}

// Returns a list of problems with the rules; an empty list means they are usable.
export function validateRules(r) {
  const problems = [];
  const intAtLeast = (key, min) => {
    if (!Number.isInteger(r[key]) || r[key] < min) problems.push(`${key} must be a whole number of at least ${min}`);
  };
  if (!isValidTimeZone(r.timeZone)) problems.push('timeZone is missing or invalid');
  if (!Array.isArray(r.allowedDurations) || !r.allowedDurations.length ||
      !r.allowedDurations.every((d) => Number.isInteger(d) && d > 0) ||
      new Set(r.allowedDurations).size !== r.allowedDurations.length) {
    problems.push('allowedDurations must be a list of distinct whole numbers of minutes');
  }
  intAtLeast('slotIntervalMinutes', 1);
  intAtLeast('bufferMinutes', 0);
  intAtLeast('minimumNoticeMinutes', 0);
  intAtLeast('maxDaysInAdvance', 1);
  intAtLeast('maxMeetingMinutesPerDay', 1);
  intAtLeast('maxMeetingsPerDay', 1);
  const checkRanges = (label, ranges) => {
    if (!Array.isArray(ranges)) return problems.push(`${label} must be a list of ranges`);
    for (const range of ranges) {
      const a = Array.isArray(range) && parseHM(range[0]);
      const b = Array.isArray(range) && parseHM(range[1]);
      if (!a || !b || a[0] * 60 + a[1] >= b[0] * 60 + b[1]) problems.push(`${label} has an invalid range ${JSON.stringify(range)}`);
    }
  };
  if (!r.weeklyHours || typeof r.weeklyHours !== 'object') problems.push('weeklyHours is missing');
  else for (const day of WEEKDAYS) {
    if (!(day in r.weeklyHours)) problems.push(`weeklyHours.${day} is missing`);
    else checkRanges(`weeklyHours.${day}`, r.weeklyHours[day]);
  }
  for (const [key, ranges] of Object.entries(r.dateOverrides || {})) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) problems.push(`dateOverrides key ${key} must be YYYY-MM-DD`);
    checkRanges(`dateOverrides.${key}`, ranges);
  }
  if (!Array.isArray(r.additionalConflictCalendarIds)) problems.push('additionalConflictCalendarIds must be a list');
  return problems;
}

// Every start time the rules allow, before checking the calendar, with the
// durations that fit inside the availability range it belongs to.
// Returns [{ start, day, durations: [minutes...] }].
export function candidateSlots(r, nowMs) {
  const durations = [...r.allowedDurations].sort((a, b) => a - b);
  const shortest = durations[0] * MINUTE;
  const step = r.slotIntervalMinutes * MINUTE;
  const earliest = nowMs + r.minimumNoticeMinutes * MINUTE;
  const latest = nowMs + r.maxDaysInAdvance * DAY;
  const today = zonedParts(nowMs, r.timeZone);
  const byStart = new Map();
  for (let i = 0; i <= r.maxDaysInAdvance; i++) {
    const [y, m, d] = addDays(today.year, today.month, today.day, i);
    const key = dateKey(y, m, d);
    const overrides = r.dateOverrides || {};
    const ranges = Object.prototype.hasOwnProperty.call(overrides, key) ? overrides[key] : r.weeklyHours[weekday(y, m, d)];
    for (const [from, to] of ranges) {
      const [fh, fm] = parseHM(from), [th, tm] = parseHM(to);
      const rangeStart = zonedToUtc(y, m, d, fh, fm, r.timeZone);
      const rangeEnd = zonedToUtc(y, m, d, th, tm, r.timeZone);
      for (let start = rangeStart; start + shortest <= rangeEnd; start += step) {
        if (start < earliest || start > latest) continue;
        const fits = durations.filter((min) => start + min * MINUTE <= rangeEnd);
        const existing = byStart.get(start);
        if (existing) existing.durations = [...new Set([...existing.durations, ...fits])].sort((a, b) => a - b);
        else byStart.set(start, { start, day: key, durations: fits });
      }
    }
  }
  return [...byStart.values()].sort((a, b) => a.start - b.start);
}

// UTC start and end of a local calendar day (YYYY-MM-DD) in a time zone.
export function dayBounds(key, timeZone) {
  const [y, m, d] = key.split('-').map(Number);
  const [ny, nm, nd] = addDays(y, m, d, 1);
  return [zonedToUtc(y, m, d, 0, 0, timeZone), zonedToUtc(ny, nm, nd, 0, 0, timeZone)];
}

export function overlapsBusy(start, end, busy, bufferMinutes) {
  const pad = bufferMinutes * MINUTE;
  return busy.some((b) => b.start < end + pad && b.end > start - pad);
}
