import { formatDate, getDateAsISODate, toISODateOrNull, getPreviousSunday } from './date.service';

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
});

describe('UTC shift protection — Europe/Paris server scenario', () => {
  // A record created at 2024-06-15T01:30:00 Paris time is stored as
  // "2024-06-15 01:30:00" in the DB. When read back as a JS Date, using
  // .toISOString() would produce "2024-06-14T23:30:00.000Z" and extracting
  // the date part would give the wrong day (2024-06-14).

  it('getDateAsISODate returns the local date, not the UTC-shifted one', () => {
    const dbTimestamp = new Date(2024, 5, 15, 1, 30, 0); // 2024-06-15 01:30 local

    // Naive approach — .toISOString() shifts to previous day in UTC+ zones
    const naiveDate = dbTimestamp.toISOString().split('T')[0];
    // In Europe/Paris (UTC+2 in summer), this produces '2024-06-14' — WRONG
    expect(naiveDate).toBe('2024-06-14');

    // Our function uses local getters — always returns the correct local day
    expect(getDateAsISODate(dbTimestamp)).toBe('2024-06-15');
  });

  it('toISODateOrNull returns the local date from a Date object, not UTC', () => {
    const dbTimestamp = new Date(2024, 5, 15, 1, 30, 0);

    expect(dbTimestamp.toISOString().split('T')[0]).toBe('2024-06-14'); // naive = wrong
    expect(toISODateOrNull(dbTimestamp)).toBe('2024-06-15');
  });

  it('formatDate displays the local day from a Date near midnight', () => {
    const justAfterMidnight = new Date(2024, 5, 15, 0, 15, 0); // 00:15 local

    expect(formatDate(justAfterMidnight)).toBe('15/06/2024');
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
