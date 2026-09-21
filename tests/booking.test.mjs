import { test } from 'node:test';
import assert from 'node:assert/strict';
import { melbourneToday, addDays, weekdayOf, bookableDates, windowsFor, isSlotFull, slotKey, formatDate } from '../assets/js/booking.mjs';

test('melbourneToday uses Melbourne time (AEST, UTC+10)', () => {
  assert.equal(melbourneToday(new Date('2026-09-21T13:59:00Z')), '2026-09-21');
  assert.equal(melbourneToday(new Date('2026-09-21T14:00:00Z')), '2026-09-22');
});

test('melbourneToday handles daylight saving (AEDT, UTC+11)', () => {
  assert.equal(melbourneToday(new Date('2026-12-01T13:30:00Z')), '2026-12-02');
});

test('addDays crosses month and year boundaries', () => {
  assert.equal(addDays('2026-09-29', 3), '2026-10-02');
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
});

test('weekdayOf returns 0 for Sunday', () => {
  assert.equal(weekdayOf('2026-09-21'), 1);
  assert.equal(weekdayOf('2026-09-27'), 0);
});

test('bookableDates applies lead time, horizon, work days and blackouts', () => {
  const dates = bookableDates({
    today: '2026-09-21', leadDays: 2, horizonDays: 14,
    workDays: [1, 2, 3, 4, 5, 6], blackout: ['2026-09-25']
  });
  assert.deepEqual(dates, [
    '2026-09-23', '2026-09-24', '2026-09-26', '2026-09-28', '2026-09-29', '2026-09-30',
    '2026-10-01', '2026-10-02', '2026-10-03', '2026-10-05', '2026-10-06'
  ]);
});

test('bookableDates with no blackout list', () => {
  const dates = bookableDates({ today: '2026-09-21', leadDays: 1, horizonDays: 2, workDays: [0, 1, 2, 3, 4, 5, 6] });
  assert.deepEqual(dates, ['2026-09-22', '2026-09-23']);
});

test('windowsFor starts weekend mornings at 9am', () => {
  assert.equal(windowsFor('2026-09-21')[0].time, '8am–12pm');
  assert.equal(windowsFor('2026-09-26')[0].time, '9am–12pm');
  assert.equal(windowsFor('2026-09-27')[0].time, '9am–12pm');
  assert.deepEqual(windowsFor('2026-09-21').map(w => w.id), ['am', 'pm']);
});

test('isSlotFull compares open requests with capacity', () => {
  const counts = { [slotKey('2026-09-23', 'am')]: 3 };
  assert.equal(isSlotFull(counts, '2026-09-23', 'am', 3), true);
  assert.equal(isSlotFull(counts, '2026-09-23', 'pm', 3), false);
  assert.equal(isSlotFull({}, '2026-09-23', 'am', 3), false);
});

test('formatDate gives short and long labels', () => {
  assert.deepEqual(formatDate('2026-09-23'), { weekday: 'Wed', day: '23', month: 'Sep', long: 'Wednesday 23 September' });
});
