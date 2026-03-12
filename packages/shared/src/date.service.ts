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
