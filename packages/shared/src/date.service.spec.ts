import { formatDate, getDateAsISODate, getStartOfYearAsUTCDate, toISODateOrNull, getPreviousSunday } from './date.service';

describe('formatDate', () => {
  it('returns "-" for null', () => {
    expect(formatDate(null)).toBe('-');
  });

  it('formats a YYYY-MM-DD string without UTC shift', () => {
    // Without the T00:00:00 fix, new Date('2024-06-15') parses as UTC midnight
    // which shifts to previous day in UTC+ timezones
    expect(formatDate('2024-06-15')).toBe('15/06/2024');
  });

  it('formats an ISO datetime string to DD/MM/YYYY', () => {
    expect(formatDate('2024-06-15T10:30:00')).toBe('15/06/2024');
  });

  it('pads single-digit day and month', () => {
    const date = new Date(2024, 0, 5); // January 5
    expect(formatDate(date)).toBe('05/01/2024');
  });

  it('uses Europe/Paris timezone by default, shifting dates near midnight UTC', () => {
    // 2020-03-04 23:00 UTC = 2020-03-05 00:00 CET (UTC+1)
    const result = formatDate('2020-03-04T23:00:00+00:00');
    expect(result).toBe('05/03/2020');
  });

  it('accepts an optional timezone parameter', () => {
    // 2020-03-04 23:00 UTC = 2020-03-04 18:00 EST (UTC-5)
    const result = formatDate('2020-03-04T23:00:00+00:00', 'America/New_York');
    expect(result).toBe('04/03/2020');
  });
});

describe('toISODateOrNull', () => {
  it('returns null for null', () => {
    expect(toISODateOrNull(null)).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(toISODateOrNull('')).toBeNull();
  });

  it('preserves local date even near midnight (no UTC shift)', () => {
    // Midnight local time - toISOString() would shift to previous day in positive UTC offset zones
    const date = new Date(2024, 5, 15, 0, 0, 0);
    expect(toISODateOrNull(date)).toBe('2024-06-15');
  });

  it('extracts date part from ISO datetime string', () => {
    expect(toISODateOrNull('2024-06-15T10:30:00')).toBe('2024-06-15');
  });

  it('returns YYYY-MM-DD string as-is', () => {
    expect(toISODateOrNull('2024-06-15')).toBe('2024-06-15');
  });

  it('extracts date part from space-separated PostgreSQL timestamp', () => {
    expect(toISODateOrNull('2024-06-15 01:30:00')).toBe('2024-06-15');
  });
});

describe('UTC shift protection', () => {
  // These tests verify that our helpers use local date getters (getFullYear,
  // getMonth, getDate) instead of .toISOString() which converts to UTC first.
  // The key invariant: a Date constructed with local components must produce
  // the same YYYY-MM-DD regardless of the machine timezone.

  it('getDateAsISODate returns the local date, not the UTC-shifted one', () => {
    // Construct a date at 01:30 local — in any UTC+ timezone, toISOString()
    // would shift this to the previous day (e.g. 23:30 UTC = June 14).
    const dbTimestamp = new Date(2024, 5, 15, 1, 30, 0); // 2024-06-15 01:30 local

    // Our function uses local getters — always returns the correct local day
    expect(getDateAsISODate(dbTimestamp)).toBe('2024-06-15');
  });

  it('toISODateOrNull returns the local date from a Date object, not UTC', () => {
    const dbTimestamp = new Date(2024, 5, 15, 1, 30, 0);

    expect(toISODateOrNull(dbTimestamp)).toBe('2024-06-15');
  });

  it('formatDate displays the local day from a Date near midnight', () => {
    const justAfterMidnight = new Date(2024, 5, 15, 0, 15, 0); // 00:15 local

    expect(formatDate(justAfterMidnight)).toBe('15/06/2024');
  });

  it('getStartOfYearAsUTCDate returns Paris midnight as a UTC instant', () => {
    expect(getStartOfYearAsUTCDate(2024).toISOString()).toBe('2023-12-31T23:00:00.000Z');
  });
});

describe('getPreviousSunday', () => {
  it('returns the previous Sunday for a Wednesday', () => {
    const wednesday = new Date(2024, 5, 19); // Wed June 19, 2024
    expect(getPreviousSunday(wednesday)).toBe('16/06/2024');
  });

  it('returns the previous Sunday for a Sunday (goes back 7 days)', () => {
    const sunday = new Date(2024, 5, 16); // Sun June 16, 2024
    expect(getPreviousSunday(sunday)).toBe('09/06/2024');
  });

  it('returns the previous Sunday for a Monday (goes back 1 day)', () => {
    const monday = new Date(2024, 5, 17); // Mon June 17, 2024
    expect(getPreviousSunday(monday)).toBe('16/06/2024');
  });
});
