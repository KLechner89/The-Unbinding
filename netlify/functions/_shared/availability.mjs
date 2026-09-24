import { settings, BOOKING_SOURCE } from './config.mjs';
import { candidateSlots, overlapsBusy, dayKeyOf, dayBounds } from './slots.mjs';
import { freeBusy, listEvents } from './google.mjs';

const MINUTE = 60_000;

// Events created through this page (confirmed meetings and pending in-person holds).
export async function schedulerEvents(calendarId, fromMs, toMs) {
  const events = await listEvents(calendarId, fromMs, toMs, { privateExtendedProperty: `source=${BOOKING_SOURCE}` });
  return events.filter((e) => e.status !== 'cancelled' && e.start?.dateTime && e.end?.dateTime);
}

export const eventMinutes = (e) => Math.max(0, Math.round((Date.parse(e.end.dateTime) - Date.parse(e.start.dateTime)) / MINUTE));

// Per local day (in the rules' time zone): total scheduled minutes and number of meetings.
function usageByDay(events, timeZone) {
  const usage = new Map();
  for (const e of events) {
    const key = dayKeyOf(Date.parse(e.start.dateTime), timeZone);
    const u = usage.get(key) || { minutes: 0, count: 0 };
    u.minutes += eventMinutes(e);
    u.count += 1;
    usage.set(key, u);
  }
  return usage;
}

// Would adding a meeting of `minutes` on `day` stay within both daily limits?
export function withinDailyLimits(rules, usage, day, minutes) {
  const u = usage.get(day) || { minutes: 0, count: 0 };
  return u.minutes + minutes <= rules.maxMeetingMinutesPerDay && u.count + 1 <= rules.maxMeetingsPerDay;
}

// Narrows each candidate's durations to those that are free on the calendar and
// within the daily limits. Drops start times with no remaining duration.
async function evaluate(candidates) {
  const { rules, calendarId, conflictCalendarIds } = settings();
  if (!candidates.length) return [];
  const pad = rules.bufferMinutes * MINUTE;
  const longest = Math.max(...rules.allowedDurations) * MINUTE;
  const from = candidates[0].start - pad;
  const to = candidates[candidates.length - 1].start + longest + pad;
  const busy = await freeBusy(conflictCalendarIds, from, to);
  const [dayStart] = dayBounds(candidates[0].day, rules.timeZone);
  const [, dayEnd] = dayBounds(candidates[candidates.length - 1].day, rules.timeZone);
  const usage = usageByDay(await schedulerEvents(calendarId, dayStart, dayEnd), rules.timeZone);

  const open = [];
  for (const c of candidates) {
    const durations = c.durations.filter((min) =>
      !overlapsBusy(c.start, c.start + min * MINUTE, busy, rules.bufferMinutes) &&
      withinDailyLimits(rules, usage, c.day, min));
    if (durations.length) open.push({ start: c.start, day: c.day, durations });
  }
  return open;
}

export async function openSlots(nowMs = Date.now()) {
  return evaluate(candidateSlots(settings().rules, nowMs));
}

// Rechecks one start time and one duration against the rules, the live calendar,
// and the daily limits. Returns { start, end, day, durationMinutes } or null.
export async function recheckSlot(startMs, durationMinutes, nowMs = Date.now()) {
  const { rules } = settings();
  if (!rules.allowedDurations.includes(durationMinutes)) return null;
  const candidate = candidateSlots(rules, nowMs).find((s) => s.start === startMs);
  if (!candidate || !candidate.durations.includes(durationMinutes)) return null;
  const [open] = await evaluate([{ ...candidate, durations: [durationMinutes] }]);
  if (!open) return null;
  return { start: startMs, end: startMs + durationMinutes * MINUTE, day: candidate.day, durationMinutes };
}
