export const getPreviousYearForDate = (date: Date = new Date()): number => {
  return date.getFullYear() - 1;
};

export const getPreviousYear = (): number => {
  return new Date().getFullYear() - 1;
};

export const getYearMinus = (numberOfYearsBefore: number): number => {
  return new Date().getFullYear() - numberOfYearsBefore;
};
