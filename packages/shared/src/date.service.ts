export const formatDate = (date: Date | string | null): string => {
  if (!date) {
    return '-';
  }
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
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
  return new Date().toISOString().split('T')[0];
};

export const getNYearsAgoAsISODate = (n: number): string => {
  const date = new Date();
  date.setFullYear(date.getFullYear() - n);
  return date.toISOString().split('T')[0];
};

export const getDateAsISODate = (date: Date): string => {
  return date.toISOString().split('T')[0];
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
