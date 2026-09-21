// Booking request rules — pure functions, no DOM. Shared by quote.js in the
// browser and tests/booking.test.mjs under `node --test`.
//
// Dates are plain 'YYYY-MM-DD' strings. All arithmetic happens on UTC
// midnight so daylight-saving changes can never shift a date; only
// melbourneToday() looks at a real timezone.

const MELBOURNE = 'Australia/Melbourne';

function toDate(iso) {
  return new Date(iso + 'T00:00:00Z');
}

export function melbourneToday(now = new Date()) {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: MELBOURNE, year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(now);
}

export function addDays(iso, n) {
  const d = toDate(iso);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function weekdayOf(iso) {
  return toDate(iso).getUTCDay();
}

export function bookableDates({ today, leadDays, horizonDays, workDays, blackout = [] }) {
  const blocked = new Set(blackout);
  const dates = [];
  for (let i = 0; i < horizonDays; i++) {
    const iso = addDays(today, leadDays + i);
    if (workDays.includes(weekdayOf(iso)) && !blocked.has(iso)) dates.push(iso);
  }
  return dates;
}

// Victorian EPA residential noise rules: domestic mowers can't run before
// 7am on weekdays or before 9am on weekends/public holidays. Weekday
// mornings start at 8am to stay well clear of that.
export function windowsFor(iso) {
  const day = weekdayOf(iso);
  const weekend = day === 0 || day === 6;
  return [
    { id: 'am', label: 'Morning', time: weekend ? '9am–12pm' : '8am–12pm' },
    { id: 'pm', label: 'Afternoon', time: '12–5pm' }
  ];
}

export function slotKey(iso, windowId) {
  return iso + '|' + windowId;
}

export function isSlotFull(counts, iso, windowId, capacity) {
  return (counts[slotKey(iso, windowId)] || 0) >= capacity;
}

// Fixed tables rather than Intl: engines disagree on abbreviations
// (newer ICU gives "Sept" for en-AU), and labels should be identical
// everywhere.
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
  'August', 'September', 'October', 'November', 'December'];

export function formatDate(iso) {
  const d = toDate(iso);
  const weekday = DAYS[d.getUTCDay()];
  const month = MONTHS[d.getUTCMonth()];
  return {
    weekday: weekday.slice(0, 3),
    day: String(d.getUTCDate()),
    month: month.slice(0, 3),
    long: weekday + ' ' + d.getUTCDate() + ' ' + month
  };
}
