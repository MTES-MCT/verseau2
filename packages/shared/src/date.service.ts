export const formatDate = (date: Date | string | null, timezone: string = 'Europe/Paris'): string => {
  if (!date) {
    return '-';
  }
  const d = typeof date === 'string' ? new Date(/^\d{4}-\d{2}-\d{2}$/.test(date) ? `${date}T00:00:00Z` : date) : date;
  return d.toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: timezone,
  });
};

export const getPreviousYearForDate = (date: Date = new Date()): number => {
  return date.getFullYear() - 1;
};

export const getPreviousYear = (): number => {
  return new Date().getFullYear() - 1;
};

export const getYearMinus = (numberOfYearsBefore: number): number => {
  return new Date().getFullYear() - numberOfYearsBefore;
};

export const getTodayAsISODate = (): string => {
  return dateToLocalISODate(new Date());
};

export const getNYearsAgoAsISODate = (n: number): string => {
  const date = new Date();
  date.setFullYear(date.getFullYear() - n);
  return dateToLocalISODate(date);
};

export const getDateAsISODate = (date: Date): string => {
  return dateToLocalISODate(date);
};

export const getStartOfYearAsUTCDate = (year: number): Date => {
  return new Date(`${year}-01-01T00:00:00+01:00`);
};

const dateToLocalISODate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const toISODateOrNull = (value: Date | string | null): string | null => {
  if (!value) {
    return null;
  }
  if (typeof value === 'string') {
    const match = value.match(/^(\d{4}-\d{2}-\d{2})/);
    return match ? match[1] : value;
  }
  return dateToLocalISODate(value);
};

export const getPreviousSunday = (date: Date = new Date()): string => {
  const d = new Date(date);
  const day = d.getDay();
  const daysBack = day === 0 ? 7 : day;
  d.setDate(d.getDate() - daysBack);
  return d.toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
};
