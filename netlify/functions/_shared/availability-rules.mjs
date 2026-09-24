// Kyle's availability rules.
//
// These must reproduce the settings of Kyle's current Google appointment schedule.
// The Google Calendar API does not expose appointment-schedule settings, so they
// cannot be read automatically and are written out here instead.
//
// Every value marked REQUIRED must be filled in. While any of them is null, online
// scheduling stays offline and no bookings can be made. Do not guess: fill each
// one in only once it has been confirmed.

export const RULES = {
  // REQUIRED. IANA time zone for all availability rules and daily limits.
  timeZone: 'America/Denver',

  // REQUIRED. Meeting lengths a visitor may choose, in minutes.
  // The server accepts only these values, whatever the browser sends.
  allowedDurations: [30, 60],

  // REQUIRED. How often start times are offered, in minutes.
  slotIntervalMinutes: 30, // confirmed from the current booking page

  // REQUIRED. Free time required before and after each meeting, in minutes. 0 for none.
  bufferMinutes: 15, // confirmed by Kyle

  // REQUIRED. Minimum notice before a meeting can start, in minutes. 0 for none.
  minimumNoticeMinutes: 12 * 60, // 12 hours, confirmed by Kyle

  // REQUIRED. How many days ahead people may book.
  maxDaysInAdvance: 7, // one week, confirmed by Kyle

  // REQUIRED. Daily limits for meetings booked through this page, per local
  // calendar day in the time zone above. A slot is offered only if adding the
  // meeting keeps the day within BOTH limits. Pending in-person requests count.
  maxMeetingMinutesPerDay: 180,
  maxMeetingsPerDay: 4,

  // REQUIRED. Bookable hours for each weekday, in the time zone above,
  // as ["HH:MM", "HH:MM"] ranges. A meeting must fit entirely inside one range.
  // Use [] for days with no availability.
  // Confirmed by Kyle: weekdays 10:30 AM–4:30 PM Mountain Time, no weekends.
  // A meeting must end by 4:30 PM, so the last start is 4:00 PM (30 min) or 3:30 PM (60 min).
  weeklyHours: {
    monday: [['10:30', '16:30']],
    tuesday: [['10:30', '16:30']],
    wednesday: [['10:30', '16:30']],
    thursday: [['10:30', '16:30']],
    friday: [['10:30', '16:30']],
    saturday: [],
    sunday: [],
  },

  // Optional. Date-specific changes that replace the weekly hours for that date.
  // [] makes the date unavailable. Shape: { "2026-12-24": [] }
  dateOverrides: {},

  // Leave empty. Other calendars to check for conflicts are set privately in the
  // Netlify variable GOOGLE_CONFLICT_CALENDAR_IDS, so calendar addresses stay out of this public file.
  additionalConflictCalendarIds: [],
};
